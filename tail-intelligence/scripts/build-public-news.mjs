import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const dataDir = path.join(root, 'data');
const inboxPath = path.join(dataDir, 'inbox.json');
const latestDailyPath = path.join(dataDir, 'daily-intelligence-latest.json');
const publicPath = path.resolve(root, '..', 'public-tail', 'data.json');

const readJson = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
};

const inbox = readJson(inboxPath, { items: [] });
const daily = readJson(latestDailyPath, {});
const snapshot = readJson(publicPath, null);
if (!snapshot) throw new Error('public-tail/data.json missing; run build-data first.');

const accepted = (daily.acceptedSignals || [])
  .filter((signal) => Number(signal.priorityScore || 0) > 0)
  .filter((signal) => signal.classification !== 'No Material Change');

function publisherQuality(name = '') {
  const source = String(name).toLowerCase();
  if (/reuters|associated press|ap news/.test(source)) return 20;
  if (/bloomberg|financial times|wall street journal|wsj|nikkei|cnbc/.test(source)) return 17;
  if (/micron|nvidia|samsung|sk hynix|tsmc|asml|amd|intel|microsoft|amazon|google|meta|openai|anthropic|trendforce/.test(source)) return 15;
  if (/digitimes|tom's hardware|blocks & files|the register|semianalysis/.test(source)) return 10;
  if (/ad hoc|kaohoon|chosun|market screener|seeking alpha/.test(source)) return 2;
  return 6;
}

function freshnessScore(item) {
  const time = Date.parse(item.published_at || item.ingested_at || '');
  if (!Number.isFinite(time)) return 0;
  const hours = Math.max(0, (Date.now() - time) / 3_600_000);
  if (hours <= 6) return 15;
  if (hours <= 12) return 12;
  if (hours <= 24) return 8;
  if (hours <= 36) return 4;
  return 0;
}

function publicScore(item) {
  const relevance = Number(item.relevance_score || 0);
  return Math.max(0, Math.min(100, Math.round(relevance * 0.72 + publisherQuality(item.source_name) + freshnessScore(item))));
}

function cleanSummary(item) {
  const summary = String(item.summary || '').replace(/\s+/g, ' ').trim();
  if (!summary || /&lt;|&gt;|href=|<a\b|<font\b/i.test(summary)) {
    return `Aktuelle Meldung von ${item.source_name || 'einer TAIL-Quelle'}: ${item.title}`;
  }
  return summary;
}

// Public homepage news must be genuinely current. Never backfill a quiet day with
// old Knowledge-Base / pool signals just to keep three cards populated.
const cutoff = Date.now() - 36 * 60 * 60 * 1000;
const candidates = (inbox.items || [])
  .filter((item) => Number(item.relevance_score || 0) >= 45)
  .filter((item) => {
    const time = Date.parse(item.published_at || item.ingested_at || '');
    return Number.isFinite(time) && time >= cutoff;
  })
  .map((item) => ({ ...item, public_score: publicScore(item) }))
  .sort((a, b) => {
    const scoreDelta = Number(b.public_score || 0) - Number(a.public_score || 0);
    if (scoreDelta) return scoreDelta;
    return Date.parse(b.published_at || b.ingested_at || 0) - Date.parse(a.published_at || a.ingested_at || 0);
  });

// Keep publisher/topic diversity: one weak duplicate storyline should not occupy all cards.
const selected = [];
const seenPublishers = new Set();
for (const item of candidates) {
  const publisher = String(item.source_name || '').toLowerCase();
  if (seenPublishers.has(publisher) && selected.length < 2) continue;
  selected.push(item);
  seenPublishers.add(publisher);
  if (selected.length === 3) break;
}

const news = selected.map((item) => ({
  date: String(item.published_at || item.ingested_at || daily.updatedAt || '').slice(0, 10),
  title: item.title,
  summary: cleanSummary(item),
  analysis: 'Aktuelle, relevante Meldung im News Layer. Erst nach Evidence-, Materiality-, Causality- und Falsifiability-Prüfung darf sie TAIL-Thesen oder Forecasts verändern.',
  score: Number(item.public_score || 0),
  relevanceScore: Number(item.relevance_score || 0),
  sourceQuality: publisherQuality(item.source_name),
  source: item.source_name || item.source_id || 'TAIL News Layer',
  url: item.url || null,
  layer: 'news'
}));

if (accepted.length) {
  snapshot.signals = accepted.slice(0, 3).map((signal) => ({
    date: String(daily.updatedAt || '').slice(0, 10),
    title: signal.title,
    summary: signal.fact || signal.estimate || signal.title,
    analysis: signal.tailInference || signal.redPencil?.forecastChange || 'TAIL Daily Intelligence signal.',
    score: Number(signal.priorityScore || 0),
    source: (signal.sources || [])[0]?.label || 'TAIL Daily Intelligence',
    url: (signal.sources || [])[0]?.url || null,
    layer: 'accepted-signal'
  }));
} else {
  snapshot.signals = news;
}

snapshot.dailyStatus = daily.dailyStatus || {
  date: String(daily.updatedAt || '').slice(0, 10),
  type: accepted.length ? 'material-change' : 'no-material-change',
  title: accepted.length ? 'Neue bestätigte TAIL-Signale' : 'Keine bestätigte materielle Richtungsänderung',
  impactScore: accepted.length ? Math.max(...accepted.map((signal) => Number(signal.priorityScore || 0))) : 0
};

snapshot.news = news;
snapshot.newsLayer = {
  generatedAt: new Date().toISOString(),
  count: news.length,
  candidateCount: candidates.length,
  freshnessWindowHours: 36,
  ranking: 'freshness + relevance + source quality',
  source: 'TAIL Inbox',
  admissionPolicy: 'Only current news is shown. Old pool signals are never backfilled as today\'s news.'
};

fs.writeFileSync(publicPath, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`Public News Layer: ${news.length} current news cards from ${candidates.length} candidates; ${accepted.length} accepted material signals; source-quality ranking active.`);
