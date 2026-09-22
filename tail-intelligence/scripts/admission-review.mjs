import crypto from 'node:crypto';

export const reviewKey = (item) => crypto.createHash('sha256')
  .update(`${item.id}|${item.content_hash || item.title}`).digest('hex').slice(0, 24);
export const canonical = (value) => {
  try { const u = new URL(value); u.hash = ''; for (const k of [...u.searchParams.keys()]) if (/^(utm_|gclid|fbclid)/.test(k)) u.searchParams.delete(k); return u.toString().replace(/\/$/, ''); } catch { return ''; }
};
// Market share is context, not an absolute qualified-supply or price measurement.
export const hasDirectIndexEvidence = (review) => Boolean(review.indexEvidence && review.indexEvidence.metricType !== 'none' && !/market.?share|bit.?share|shipment.?share|marktanteil|\banteil\b|\bshare\b|ranking|rang\s*\d|platz\s*\d/i.test(review.indexEvidence.observation || ''));
export function eligibleCandidates(items, asOf) {
  const cutoff = Date.parse(asOf) - 30 * 86400000;
  const seen = new Set();
  return items.filter(item => {
    const date = Date.parse(item.published_at || '');
    const title = String(item.title || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const minimumScore = item.source_id === 'manual-tail-inbox' ? 0 : 72;
    if (!item.id || !title || seen.has(title) || Number(item.relevance_score || 0) < minimumScore || !Number.isFinite(date) || date < cutoff || date > Date.parse(asOf)) return false;
    seen.add(title); return true;
  }).sort((a, b) => b.relevance_score - a.relevance_score || a.published_at.localeCompare(b.published_at));
}

// The model proposes; deterministic gates decide. Missing reviews are never
// equivalent to a completed review with no material change.
export function validateReview(review, { item, methodology, forecastIds, sourceUrls, asOf, knownArticles }) {
  const reasons = [];
  const breakdown = review.scoreBreakdown || {};
  for (const [key, max] of Object.entries(methodology.signalRubric)) {
    if (!Number.isFinite(breakdown[key]) || breakdown[key] < 0 || breakdown[key] > max) reasons.push(`invalid score: ${key}`);
  }
  const score = Object.keys(methodology.signalRubric).reduce((n, k) => n + (Number(breakdown[k]) || 0), 0);
  const sources = (review.sources || []).filter(s => sourceUrls.has(canonical(s.url)) && !/news\.google\.com/.test(s.url));
  if (!sources.length || !sources.some(s => s.kind === 'primary')) reasons.push('primary source not retrieved');
  for (const field of ['fact', 'placement', 'mechanism', 'predictionImpact', 'falsifier', 'novelty']) {
    if (typeof review[field] !== 'string' || review[field].trim().length < 15) reasons.push(`missing ${field}`);
  }
  if (!forecastIds.has(review.predictionId)) reasons.push('no named existing forecast/outlook');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(review.eventDate || '') || review.eventDate > asOf.slice(0,10)) reasons.push('invalid event date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(review.nextReview || '') || review.nextReview <= asOf.slice(0,10)) reasons.push('invalid review date');
  if (review.evidenceStatus !== 'VERIFIED DATA') reasons.push('unverified evidence');
  if (review.redPencilPass !== true) reasons.push('red-pencil check incomplete');
  if (!['Signal','Layer Update','Architecture Update','Falsifier'].includes(review.classification)) reasons.push('invalid classification');
  if (!Array.isArray(review.markets) || !review.markets.length || review.markets.some(m => !['server_dram','hbm','enterprise_ssd','dram','nand','ai_infrastructure','semiconductors','supply_chain'].includes(m))) reasons.push('invalid markets');
  if (!Array.isArray(review.driverScope) || !review.driverScope.length || review.driverScope.some(d => !Object.hasOwn(methodology.indexModel.driverWeights,d))) reasons.push('invalid drivers');
  if (!Object.hasOwn(methodology.indexModel.signalDriverImpact, review.signal)) reasons.push('invalid direction');
  if (![review.severity, review.confidence].every(n => Number.isInteger(n) && n >= 0 && n <= 100)) reasons.push('invalid severity/confidence');
  if (review.indexImpact === true) {
    const evidence = review.indexEvidence;
    if (!evidence || !['contract_price','qualified_shipments','lead_time','fill_rate','observed_demand'].includes(evidence.metricType) || !review.markets?.includes(evidence.marketId) || !evidence.observation || evidence.observation.length < 20) reasons.push('missing direct index measurement');
    if (review.signal === 'verified_supply_relief' && !['qualified_shipments','lead_time','fill_rate'].includes(evidence?.metricType)) reasons.push('no qualified supply relief measurement');
  }
  if (review.duplicateOf || knownArticles.some(a => sources.some(s => [a.url,...(a.sources || []).map(x=>x.url)].some(u => canonical(u) && canonical(s.url) === canonical(u))) && a.date === review.eventDate)) reasons.push('duplicate evidence');
  if (score < methodology.gates.accepted) reasons.push('below admission threshold');
  const accepted = review.decision === 'accepted' && reasons.length === 0;
  const decision = accepted ? 'accepted' : review.decision === 'rejected' ? 'rejected' : 'watchlist';
  const result = { ...review, candidateId: item.id, candidateKey: reviewKey(item), reviewedAt: asOf, nextReview: /^\d{4}-\d{2}-\d{2}$/.test(review.nextReview || '') && review.nextReview > asOf.slice(0,10) ? review.nextReview : new Date(Date.parse(asOf)+3*86400000).toISOString().slice(0,10), priorityScore: score, decision, gateReasons: reasons, sources };
  if (accepted) result.acceptedSignal = {
    id: `S-AUTO-${reviewKey(item)}`, title: review.title || item.title, date: review.eventDate,
    admittedAt: asOf, fact: review.fact, placement: review.placement, tailInference: review.mechanism,
    predictionId: review.predictionId, predictionImpact: review.predictionImpact,
    falsifier: review.falsifier, nextReview: review.nextReview, priorityScore: score, scoreBreakdown: breakdown,
    severity: review.severity, confidence: review.confidence, markets: review.markets,
    signal: review.signal, driverScope: review.driverScope, classification: review.classification,
    indexEvidence: review.indexEvidence || null, evidenceStatus: review.evidenceStatus, indexImpact: review.indexImpact === true && hasDirectIndexEvidence(review),
    freshShockEligible: false, public: true, origin: 'reviewed-inbox',
    admissionGate: { Evidence: true, Materiality: true, Causality: true, Falsifiability: true },
    sources: sources.map(s => ({ label: s.label, url: s.url })),
    redPencil: { passed: true, forecastChange: review.predictionImpact },
    admissionReviewKey: reviewKey(item)
  };
  return result;
}

export function admissionState(candidates, reviews, { asOf, inboxUpdatedAt, error = null }) {
  const latest = new Map(reviews.map(r => [r.candidateKey, r]));
  const pending = candidates.filter(c => { const r=latest.get(reviewKey(c)); return !r || (r.decision === 'watchlist' && r.nextReview <= asOf.slice(0,10)); });
  const reviewed = candidates.map(c => latest.get(reviewKey(c))).filter(Boolean);
  const accepted = reviewed.filter(r => r.decision === 'accepted');
  const staleInbox = !inboxUpdatedAt || Date.parse(asOf) - Date.parse(inboxUpdatedAt) > 2 * 86400000;
  return { schemaVersion: 1, checkedAt: asOf, inboxUpdatedAt, status: error ? 'error' : staleInbox || pending.length ? 'pending' : 'complete',
    candidates: candidates.length, reviewed: reviewed.length, accepted: accepted.length,
    watchlist: reviewed.filter(r => r.decision === 'watchlist').length,
    rejected: reviewed.filter(r => r.decision === 'rejected').length,
    pending: pending.length, oldestPendingAt: pending.map(c => c.published_at).sort()[0] || null,
    lastCompletedReviewAt: reviews.map(r => r.reviewedAt).sort().at(-1) || null, error };
}
