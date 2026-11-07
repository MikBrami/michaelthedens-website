import { reviewKey } from './admission-review.mjs';

const stop = new Set('the a an and or of to in on for as at by with from is are its this that it be has have will into after over amid new news report reports says said unveils launches launch update updates latest today'.split(' '));
const normalize = s => String(s || '').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const tokens = s => new Set(normalize(s).split(' ').filter(w=>w.length>2&&!stop.has(w)));
const numberList = s => (String(s).match(/\d+(?:[.,]\d+)?/g)||[]).map(v=>v.replace(',','.'));
const numberSet = s => new Set(numberList(s));
const direction = s => {
  const text=normalize(s);
  const up=/\b(increase|increases|increased|rise|rises|rising|surge|surges|surged|raise|raises|raised|expand|expands|expanded|growth|grow|grows|grew|tighten|tightens|shortage)\b/.test(text);
  const down=/\b(cut|cuts|cutting|drop|drops|dropped|fall|falls|falling|decline|declines|declined|reduce|reduces|reduced|relief|eases|eased)\b/.test(text);
  return up&&!down?'up':down&&!up?'down':'neutral';
};
const opinion = s => /\b(stock|stocks|shares?|etf|investors?|investing)\b/i.test(s) && /\b(buy|sell|bullish|bearish|rall(?:y|ies)|rebound|rebounding|undervalued|overvalued|next nvidia|next trillion|price target|stock.pick|deserves more attention|which.*stock|best.*stock)\b/i.test(s);
const factual = s => /\b(earnings|results|revenue|contract|shipment|shipments|lead.time|allocation|wafer|capacity|production|qualification|export|sanction|filing|acquisition|merger)\b/i.test(s);

const coreScope = s => /\b(hbm\d*|high bandwidth memory|server[- ]?dram|\bdram\b|rdimm|mrdimm|socamm|ddr5|enterprise[- ]?ssd|\bessd\b|\bnand\b|\bcxl\b|cowos|advanced packaging|wafer|fab|foundry|lithograph|data ?cent(?:er|re)|datacenter|hyperscaler|ai infrastructure|gpu cluster|accelerator cluster|power grid|interconnect|cooling|tsmc|asml|micron|sk hynix|kioxia|sandisk|cxmt|ymtc)\b/i.test(s);
const materialEvent = s => /\b(price|pricing|asp|contract|agreement|\blta\b|shipment|shipments|ship|allocation|lead[- ]?time|fill[- ]?rate|inventory|inventories|capacity|wafer starts?|yield|production|mass production|qualification|qualified|shortage|constraint|bottleneck|delay|strike|export controls?|sanctions?|tariffs?|capex|investment|invests?|factory|plant|fab|cleanroom|megawatt|gigawatt|\bmw\b|\bgw\b|revenue|earnings|guidance|orders?|backlog|supply|demand|utilization|utilisation)\b/i.test(s);
const architectureFalsifier = s => /\b(inference|training|agentic|frontier model|context window|kv cache|distillation|memory efficiency|compute efficiency|tokens? per|latency|throughput)\b/i.test(s) && /\b(memory|dram|hbm|ssd|nand|gpu|compute|power|energy|cost|capacity|demand)\b/i.test(s);
const genericNoise = s => /\b(opinion|podcast|interview|what to know|explained|explainer|review|roundup|top picks?|best stocks?|market wrap|weekly wrap|daily wrap|rumou?r)\b/i.test(s);
// Headline-level exceptions to the numeric relevance score. A score below 72
// must not silently discard a measurable memory supply or product event.
const measurableMemoryEvent = s =>
  (/\b(ymtc)\b/i.test(s) && /\b(micron)\b/i.test(s) && /\b(patent|injunction|court|ruling)\b/i.test(s)) ||
  /\b(micron|samsung|sk hynix|cxmt|ymtc|kioxia|sandisk)\b/i.test(s) &&
  /\b(dram|ddr5|rdimm|hbm\d*|nand|enterprise[- ]?ssd|memory|wafer)\b/i.test(s) &&
  /\b(mass production|enters production|shipment|shipments|output|capacity|fab|wafer|yield|contract prices?|allocation|shortage|qualified|qualif(?:y|ication)|injunction|patent (?:fight|battle|ruling)|dies per wafer|module)\b/i.test(s);

const anchorWords = ['micron','samsung','hynix','kioxia','sandisk','cxmt','ymtc','nvidia','amd','tsmc','asml','openai','anthropic','microsoft','meta','amazon','google','huawei','hbm','hbm4','dram','rdimm','mrdimm','nand','essd','ssd','cxl','cowos','datacenter','hyperscaler'];
const anchors = s => {
  const text=normalize(s);
  return new Set(anchorWords.filter(a=>text.includes(a)));
};
const jaccard = (a,b) => {
  if(!a.size||!b.size) return 0;
  const common=[...a].filter(t=>b.has(t)).length;
  return common/(a.size+b.size-common);
};
const overlapCount=(a,b)=>[...a].filter(t=>b.has(t)).length;
const sharesAny=(a,b)=>[...a].some(v=>b.has(v));

function prefilter(item) {
  if (item.source_id === 'manual-tail-inbox') return null;
  const score=Number(item.relevance_score||0);
  const text=`${item.title||''} ${item.summary||''}`;
  if (score < 72 && !measurableMemoryEvent(item.title)) return {decision:'archive-low-relevance',reason:'Free prefilter: relevance score below 72 without a measurable memory event in the headline.'};
  if (opinion(item.title) && !factual(item.title)) return {decision:'archive-opinion',reason:'Explicit investment recommendation / stock commentary without a concrete operating event in the headline.'};
  if (genericNoise(item.title) && score < 90) return {decision:'archive-generic-news',reason:'Generic commentary/roundup without exceptional relevance.'};
  if (!coreScope(text) && !architectureFalsifier(text) && score < 90) return {decision:'archive-out-of-scope',reason:'No direct Memory/Storage/AI-infrastructure scope or measurable architecture falsifier.'};
  if (!materialEvent(text) && !architectureFalsifier(text) && !measurableMemoryEvent(item.title) && score < 85) return {decision:'archive-no-material-event',reason:'Relevant topic, but no concrete price/supply/demand/capacity/contract/infrastructure event.'};
  return null;
}

function sameEvent(a,b) {
  const age=Math.abs(Date.parse(a.published_at)-Date.parse(b.published_at));
  if (!Number.isFinite(age) || age>48*3600000) return false;
  const da=direction(a.title), db=direction(b.title);
  if (da!=='neutral' && db!=='neutral' && da!==db) return false;
  const aa=anchors(`${a.title} ${a.summary||''}`), ab=anchors(`${b.title} ${b.summary||''}`);
  if (!sharesAny(aa,ab)) return false;

  const at=tokens(a.title), bt=tokens(b.title);
  const ac=tokens(`${a.title} ${String(a.summary||'').slice(0,240)}`);
  const bc=tokens(`${b.title} ${String(b.summary||'').slice(0,240)}`);
  const titleSimilarity=jaccard(at,bt);
  const combinedSimilarity=jaccard(ac,bc);
  const commonTitle=overlapCount(at,bt);

  const na=numberSet(a.title), nb=numberSet(b.title);
  const conflictingNumbers=na.size&&nb.size&&!sharesAny(na,nb);
  if (conflictingNumbers) return false;
  return titleSimilarity>=0.58 || (commonTitle>=4 && combinedSimilarity>=0.46);
}

// Deterministic free routing only. Ambiguous or contradictory events remain separate.
// All raw rows and reasons remain available; only representatives reach paid review.
export function triageCandidates(candidates, reviews = []) {
  const reviewed = new Set(reviews.map(r=>r.candidateKey));
  const representatives = [], decisions = [];
  for (const item of [...candidates].sort((a,b)=>Number(reviewed.has(reviewKey(b)))-Number(reviewed.has(reviewKey(a)))||Number(b.relevance_score)-Number(a.relevance_score)||a.id.localeCompare(b.id))) {
    const key=reviewKey(item);
    if (reviewed.has(key)) { representatives.push(item); continue; }

    const filtered=prefilter(item);
    if (filtered) {
      decisions.push({candidateKey:key,candidateId:item.id,title:item.title,...filtered});
      continue;
    }

    const same = representatives.find(other=>sameEvent(item,other));
    if (same) {
      decisions.push({candidateKey:key,candidateId:item.id,title:item.title,decision:'same-event-cluster',representativeKey:reviewKey(same),representativeId:same.id,reason:'Likely same event across publishers: shared anchor and strong title/summary overlap within 48 hours.'});
      same.relatedCandidates=[...(same.relatedCandidates||[]),{id:item.id,title:item.title,url:item.url,published_at:item.published_at}];
    } else representatives.push({...item});
  }
  const count=decision=>decisions.filter(d=>d.decision===decision).length;
  return {
    representatives,
    decisions,
    archivedOpinions:count('archive-opinion'),
    archivedLowRelevance:count('archive-low-relevance'),
    archivedGenericNews:count('archive-generic-news'),
    archivedOutOfScope:count('archive-out-of-scope'),
    archivedNoMaterialEvent:count('archive-no-material-event'),
    groupedDuplicates:count('same-event-cluster')
  };
}

export function selectForReview(pending, limit) {
  const latest=[...pending].sort((a,b)=>b.published_at.localeCompare(a.published_at)).slice(0,Math.ceil(limit/2));
  return [...latest,...pending.filter(c=>!latest.some(n=>n.id===c.id)).sort((a,b)=>a.published_at.localeCompare(b.published_at)).slice(0,limit-latest.length)];
}
