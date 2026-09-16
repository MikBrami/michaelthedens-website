import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Pilot resource limits, not an account-wide dollar spending limit.
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
    if (attempts >= 2) throw new Error('Pilot API request budget exhausted');
    if (deadline-Date.now() < 180000) throw new Error('Insufficient time for a full request; deferred without charge');
    // Persist intent before spending. An interrupted request is not blindly repeated.
    await fs.writeFile(target, JSON.stringify({status:'started'}), {flag:'wx'});
    attempts++;
    await audit({status:'started',attempt:attempts,maxToolCalls:2,maxOutputTokens:4000,inputBytes:Buffer.byteLength(encoded)});
    try {
      const response = await fetchImpl(url,{...options,body:encoded,signal:AbortSignal.timeout(180000)});
      if (!response.ok) throw new Error(`Analyst HTTP ${response.status}; no automatic retry`);
      const result = await response.json();
      await fs.writeFile(target,JSON.stringify({status:'received',result}));
      await audit({status:result.status,responseId:result.id,usage:result.usage || null,
        webToolCalls:(result.output||[]).filter(o=>o.type==='web_search_call').length});
      return result;
    } catch (error) {
      await audit({status:'unresolved',error:String(error.message).slice(0,200),usageUnknown:true});
      throw error;
    }
  };
}
