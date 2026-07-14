import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const dataDir = path.join(root, 'data');
const inputPath = path.join(dataDir, 'articles.json');
const outputPath = path.join(dataDir, 'dashboard.json');

const articles = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
if (!Array.isArray(articles) || articles.length === 0) throw new Error('articles.json contains no records');

const marketLabels = {
  hbm: 'HBM', server_dram: 'Server DRAM', dram: 'DRAM', nand: 'NAND',
  enterprise_ssd: 'Enterprise SSD', ai_infrastructure: 'AI Infrastructure',
  semiconductors: 'Semiconductors', supply_chain: 'Supply Chain'
};
const weights = { negative_supply: 1.0, capacity_lock: 0.95, price_up: 0.86, geopolitical_split: 0.74 };
const scoreSignal = a => Math.round(a.severity * (a.confidence / 100) * (weights[a.signal] ?? 0.65));
const trafficLight = score => score >= 82 ? 'red' : score >= 65 ? 'orange' : score >= 45 ? 'yellow' : 'green';

const marketBuckets = new Map();
for (const article of articles) {
  for (const market of article.markets ?? []) {
    const bucket = marketBuckets.get(market) ?? [];
    bucket.push(scoreSignal(article));
    marketBuckets.set(market, bucket);
  }
}
const markets = [...marketBuckets.entries()].map(([id, scores]) => {
  const peak = Math.max(...scores);
  const avg = scores.reduce((a,b)=>a+b,0) / scores.length;
  const score = Math.round(peak * 0.65 + avg * 0.35);
  return { id, label: marketLabels[id] ?? id, score, status: trafficLight(score), signals: scores.length };
}).sort((a,b)=>b.score-a.score);

const companyMap = new Map();
for (const a of articles) for (const company of a.companies ?? []) {
  const values = companyMap.get(company) ?? [];
  values.push(scoreSignal(a));
  companyMap.set(company, values);
}
const manufacturers = [...companyMap.entries()].map(([name, values]) => ({
  name,
  score: Math.round(Math.max(...values) * 0.7 + (values.reduce((a,b)=>a+b,0)/values.length) * 0.3),
  mentions: values.length
})).sort((a,b)=>b.score-a.score).slice(0,10);

const overall = Math.round(markets.slice(0,6).reduce((sum,m)=>sum+m.score,0) / Math.min(6, markets.length));
const newestDate = articles.map(a=>a.date).sort().at(-1);
const severe = articles.filter(a=>scoreSignal(a)>=75).sort((a,b)=>scoreSignal(b)-scoreSignal(a));

const forecasts = [
  { market: 'Server DRAM', horizon: '2027', direction: 'strong_up', confidence: 92, thesis: 'Strukturelle Unterversorgung durch AI-Server, HBM-Priorisierung und LTAs.' },
  { market: 'HBM4', horizon: '2026–2028', direction: 'strong_up', confidence: 90, thesis: 'Kosten, Yield und Advanced Packaging halten Kapazität knapp.' },
  { market: 'Enterprise SSD', horizon: 'H2 2026', direction: 'up', confidence: 84, thesis: 'AI-Datenpipelines und disziplinierte NAND-Auslastung stützen Preise.' },
  { market: 'NAND', horizon: 'H2 2026', direction: 'up', confidence: 81, thesis: 'Festere Nachfrage, aber geringere Knappheit als bei DRAM/HBM.' }
];

const dashboard = {
  schemaVersion: 2,
  dataAsOf: newestDate,
  lastSuccessfulUpdate: new Date().toISOString(),
  newlyProcessedArticles: articles.length,
  totalArticles: articles.length,
  processStatus: 'ok',
  error: null,
  tailIndex: overall,
  indexStatus: trafficLight(overall),
  markets,
  manufacturers,
  forecasts,
  executiveSummary: `TAIL steht auf ${overall}/100. Server-DRAM und HBM bleiben die kritischsten Engpassfelder. Mehrjährige Hyperscaler-LTAs, HBM4-Kosten und priorisierte Kapazitätsbindung verschieben den Markt von Preisoptimierung zu Versorgungssicherheit. Chinesische Parallel-Lieferketten erhöhen zugleich das geopolitische Entkopplungsrisiko.`,
  topSignals: severe.slice(0,8).map(a=>({ id:a.id, date:a.date, title:a.title, summary:a.summary, analysis:a.tail_analysis, score:scoreSignal(a), status:trafficLight(scoreSignal(a)) }))
};

fs.writeFileSync(outputPath, JSON.stringify(dashboard, null, 2) + '\n');
console.log(`Built dashboard: ${articles.length} articles, TAIL index ${overall}`);
