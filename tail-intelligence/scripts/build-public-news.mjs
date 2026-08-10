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

const cutoff = Date.now() - 72 * 60 * 60 * 1000;
const news = (inbox.items || [])
  .filter((item) => Number(item.relevance_score || 0) >= 50)
  .filter((item) => {
    const time = Date.parse(item.published_at || item.ingested_at || '');
    return Number.isFinite(time) && time >= cutoff;
  })
  .sort((a, b) => {
    const scoreDelta = Number(b.relevance_score || 0) - Number(a.relevance_score || 0);
    if (scoreDelta) return scoreDelta;
    return Date.parse(b.published_at || b.ingested_at || 0) - Date.parse(a.published_at || a.ingested_at || 0);
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

// Curated accepted signals remain the preferred public analytical cards. On quiet
// days, current news fills the cards instead of a synthetic heartbeat.
if (!accepted.length && news.length) {
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
  source: 'TAIL Inbox',
  admissionPolicy: 'News remain visible without automatically changing TAIL theses.'
};

fs.writeFileSync(publicPath, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`Public News Layer: ${news.length} current news cards; ${accepted.length} accepted material signals.`);
