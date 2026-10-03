import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Local MT·AI estimate guard. The provider's project spend limit remains the
// only authoritative account-wide cap; this guard applies to this workflow.
const PRICE = {input:0.25/1e6,cached:0.025/1e6,output:2/1e6,search:0.01};
const RESERVE_USD = 0.10;
function estimatedCost(result) {
  const u=result.usage || {};
  const cached=u.input_tokens_details?.cached_tokens || 0;
  const searches=(result.output||[]).filter(o=>o.type==='web_search_call').length;
  if (!Number.isFinite(u.input_tokens) || !Number.isFinite(u.output_tokens)) return RESERVE_USD;
  return Math.max(0,u.input_tokens-cached)*PRICE.input+cached*PRICE.cached+u.output_tokens*PRICE.output+searches*PRICE.search;
}
async function spent(auditPath) {
  let entries=[];
  try { entries=(await fs.readFile(auditPath,'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse); }
  catch(error) { if (error.code!=='ENOENT') throw error; }
  const latest=new Map();
  for(const entry of entries) if(entry.key && entry.status!=='cache_hit') latest.set(entry.key,{...entry,startedAt:entry.status==='started'?entry.at:latest.get(entry.key)?.startedAt || entry.at});
  const today=new Date().toISOString().slice(0,10);
  return [...latest.values()].reduce((s,e)=>{
    const cost=Number.isFinite(e.estimatedCostUsd)?e.estimatedCostUsd:RESERVE_USD;
    if(e.startedAt.slice(0,7)===today.slice(0,7)) s.month+=cost;
    if(e.startedAt.slice(0,10)===today) s.day+=cost;
    return s;
  },{day:0,month:0});
}
export function createBoundedReviewer({cacheDir, auditPath, fetchImpl=fetch}) {
  let attempts = 0;
  const dir = cacheDir instanceof URL ? fileURLToPath(cacheDir) : cacheDir;
  return async (url, options, {deadline}) => {
    if (url !== 'https://api.openai.com/v1/responses') throw new Error('Unexpected analyst endpoint');
    const body = JSON.parse(options.body);
    body.model = 'gpt-5-mini';
    body.max_tool_calls = 2;
    body.max_output_tokens = 4000;
    body.reasoning = {effort:'low'};
    const encoded = JSON.stringify(body);
    if (Buffer.byteLength(encoded) > 200000) throw new Error('Pilot input budget exceeded; no API call made');
    const key = createHash('sha256').update(encoded).digest('hex');
    const target = path.join(dir, `${key}.json`);
    await fs.mkdir(dir, {recursive:true});
    const audit = async record => fs.appendFile(auditPath, JSON.stringify({at:new Date().toISOString(),key,...record})+'\n');
    try {
      const previous = JSON.parse(await fs.readFile(target,'utf8'));
      if (!previous.result) throw new Error('Previous attempt unresolved; automatic paid retry blocked');
      await audit({status:'cache_hit',responseId:previous.result.id});
      return previous.result;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (attempts >= 4) throw new Error('Pilot API request budget exhausted');
    if (deadline-Date.now() < 180000) throw new Error('Insufficient time for a full request; deferred without charge');
    const usage=await spent(auditPath);
    if (usage.day+RESERVE_USD > 0.50+1e-9 || usage.month+RESERVE_USD > 15+1e-9)
      throw new Error('MT·AI estimated API budget exhausted; deferred without charge');
    // Persist intent before spending. An interrupted request is not blindly repeated.
    await fs.writeFile(target, JSON.stringify({status:'started'}), {flag:'wx'});
    attempts++;
    await audit({status:'started',attempt:attempts,maxToolCalls:2,maxOutputTokens:4000,inputBytes:Buffer.byteLength(encoded),estimatedCostUsd:RESERVE_USD});
    try {
      const response = await fetchImpl(url,{...options,body:encoded,signal:AbortSignal.timeout(180000)});
      if (!response.ok) throw new Error(`Analyst HTTP ${response.status}; no automatic retry`);
      const result = await response.json();
      await fs.writeFile(target,JSON.stringify({status:'received',result}));
      await audit({status:result.status,responseId:result.id,usage:result.usage || null,estimatedCostUsd:estimatedCost(result),
        webToolCalls:(result.output||[]).filter(o=>o.type==='web_search_call').length});
      return result;
    } catch (error) {
      await audit({status:'unresolved',error:String(error.message).slice(0,200),usageUnknown:true});
      throw error;
    }
  };
}
