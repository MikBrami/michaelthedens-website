import { reviewKey } from './admission-review.mjs';

const stop = new Set('the a an and or of to in on for as at by with from is are its this that it be has have will into after over amid new news report reports'.split(' '));
const normalize = s => String(s || '').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const tokens = s => new Set(normalize(s).split(' ').filter(w=>!stop.has(w)));
const numbers = s => (String(s).match(/\d+(?:[.,]\d+)?/g)||[]).sort().join('|');
const polarity = s => (normalize(s).match(/\b(increase|increases|rise|rises|rising|surge|surges|cut|cuts|drop|drops|fall|falls|falling|shortage|expansion|delay|delays)\b/g)||[]).sort().join('|');
const opinion = s => /\b(stock|stocks|etf|investors?|investing)\b/i.test(s) && /\b(buy|sell|bullish|bearish|rall(?:y|ies)|rebound|rebounding|undervalued|overvalued|next nvidia|next trillion|price target|stock.pick|deserves more attention|which.*stock|best.*stock)\b/i.test(s);
const factual = s => /\b(earnings|results|revenue|contract|shipment|shipments|lead.time|allocation|wafer|capacity|production|qualification|export|sanction|filing|acquisition|merger)\b/i.test(s);

// Conservative routing only. Ambiguous or contradictory headlines remain separate.
// All raw rows and reasons remain available; no headline becomes admitted evidence.
export function triageCandidates(candidates, reviews = []) {
  const reviewed = new Set(reviews.map(r=>r.candidateKey));
  const representatives = [], decisions = [];
  for (const item of [...candidates].sort((a,b)=>Number(reviewed.has(reviewKey(b)))-Number(reviewed.has(reviewKey(a)))||Number(b.relevance_score)-Number(a.relevance_score)||a.id.localeCompare(b.id))) {
    const key=reviewKey(item);
    if (reviewed.has(key)) { representatives.push(item); continue; }
    if (opinion(item.title) && !factual(item.title)) {
      decisions.push({candidateKey:key,candidateId:item.id,title:item.title,decision:'archive-opinion',reason:'Explicit investment recommendation / stock commentary without a concrete operating event in the headline.'});
      continue;
    }
    const a=tokens(item.title);
    const same = representatives.find(other=> {
      if (Math.abs(Date.parse(item.published_at)-Date.parse(other.published_at))>3*86400000 || numbers(item.title)!==numbers(other.title) || polarity(item.title)!==polarity(other.title)) return false;
      const b=tokens(other.title), common=[...a].filter(t=>b.has(t)).length;
      return Math.min(a.size,b.size)>=6 && common/(a.size+b.size-common)>=0.8;
    });
    if (same) {
      decisions.push({candidateKey:key,candidateId:item.id,title:item.title,decision:'near-identical-headline',representativeKey:reviewKey(same),representativeId:same.id,reason:'Same numbers and direction; >=80% title-token overlap within three days.'});
      same.relatedCandidates=[...(same.relatedCandidates||[]),{id:item.id,title:item.title,url:item.url,published_at:item.published_at}];
    } else representatives.push({...item});
  }
  return {representatives,decisions,archivedOpinions:decisions.filter(d=>d.decision==='archive-opinion').length,groupedDuplicates:decisions.filter(d=>d.decision==='near-identical-headline').length};
}

export function selectForReview(pending, limit) {
  const latest=[...pending].sort((a,b)=>b.published_at.localeCompare(a.published_at)).slice(0,Math.ceil(limit/2));
  return [...latest,...pending.filter(c=>!latest.some(n=>n.id===c.id)).sort((a,b)=>a.published_at.localeCompare(b.published_at)).slice(0,limit-latest.length)];
}
