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

// Public homepage news must be genuinely current. Never backfill a quiet day with
// old Knowledge-Base / pool signals just to keep three cards populated.
const cutoff = Date.now() - 36 * 60 * 60 * 1000;
const news = (inbox.items || [])
  .filter((item) => Number(item.relevance_score || 0) >= 50)
  .filter((item) => {
    const time = Date.parse(item.published_at || item.ingested_at || '');
    return Number.isFinite(time) && time >= cutoff;
  })
  .sort((a, b) => {
    const publishedDelta = Date.parse(b.published_at || b.ingested_at || 0) - Date.parse(a.published_at || a.ingested_at || 0);
    if (publishedDelta) return publishedDelta;
    return Number(b.relevance_score || 0) - Number(a.relevance_score || 0);
  })
  .slice(0, 3)
  .map((item) => ({
    date: String(item.published_at || item.ingested_at || daily.updatedAt || '').slice(0, 10),
    title: item.title,
    summary: item.summary || 'Aktuelle Meldung im TAIL News Layer.',
    analysis: 'Aktuelle, relevante Meldung. Sie bleibt im News Layer, bis Evidence, Materiality, Causality und Falsifiability eine Aufnahme als TAIL-Signal rechtfertigen.',
    score: Number(item.relevance_score || 0),
    source: item.source_name || item.source_id || 'TAIL News Layer',
    url: item.url || null,
    layer: 'news'
  }));

// Curated accepted signals remain the analytical cards when they exist today.
// Otherwise the homepage shows only genuinely current news. If there is no current
// news, signals is intentionally empty — stale pool content must never be presented
// as today's intelligence.
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
  freshnessWindowHours: 36,
  source: 'TAIL Inbox',
  admissionPolicy: 'Only current news is shown. Old pool signals are never backfilled as today\'s news.'
};

fs.writeFileSync(publicPath, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`Public News Layer: ${news.length} current news cards; ${accepted.length} accepted material signals; stale fallback disabled.`);
