import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const dataDir = path.join(root, 'data');
const inputPath = path.join(dataDir, 'articles.json');
const inboxPath = path.join(dataDir, 'inbox.json');
const statusPath = path.join(dataDir, 'update-status.json');
const outputPath = path.join(dataDir, 'dashboard.json');
const methodologyPath = path.join(root, 'config', 'methodology.json');
const forecastLedgerPath = path.join(dataDir, 'forecast-ledger.json');

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

const articles = readJson(inputPath, []);
if (!Array.isArray(articles) || articles.length === 0) throw new Error('articles.json contains no records');
const methodology = readJson(methodologyPath, { signalOverrides: {}, forecastOverrides: {} });
const forecastLedger = readJson(forecastLedgerPath, { forecasts: [] });

const inbox = readJson(inboxPath, { updated_at: null, new_items: 0, duplicate_items: [], items: [] });
const updateStatus = readJson(statusPath, {
  status: 'warning',
  last_attempt: null,
  last_successful_update: null,
  newly_processed_articles: 0,
  deduplicated_articles: 0,
  inbox_size: inbox.items?.length ?? 0,
  source_errors: [],
  message: 'No inbox update-status.json found yet. Dashboard is using the last built Knowledge Base.'
});

const marketLabels = {
  hbm: 'HBM',
  server_dram: 'Server DRAM',
  dram: 'DRAM',
  nand: 'NAND',
  enterprise_ssd: 'Enterprise SSD',
  ai_infrastructure: 'AI Infrastructure',
  semiconductors: 'Semiconductors',
  supply_chain: 'Supply Chain'
};

const requiredForecasts = [
  { id: 'dram', label: 'DRAM', horizon: '2026–2027', bias: 'Servermix, HBM-Priorisierung und knappe Wafer-Allokation halten DRAM strukturell angespannt.' },
  { id: 'hbm', label: 'HBM', horizon: '2026–2028', bias: 'HBM bleibt durch AI-Plattformbindung, Yield, Layer-Komplexität und Packaging der härteste Memory-Engpass.' },
  { id: 'nand', label: 'NAND', horizon: 'H2 2026–2027', bias: 'NAND zeigt festere Preis- und Nachfrageindikatoren, bleibt aber weniger eng als DRAM/HBM.' },
  { id: 'enterprise_ssd', label: 'Enterprise SSD', horizon: 'H2 2026–2027', bias: 'Enterprise SSD profitiert von AI-Datenpipelines, Nearline-Wachstum und High-Capacity-Qualifizierung.' },
  { id: 'ai_infrastructure', label: 'AI Infrastructure', horizon: '2026–2030+', bias: 'AI Infrastructure wird durch Power, Datacenter-Kapazität, HBM, DRAM, eSSD und geopolitische Lieferketten begrenzt.' }
];

const weights = {
  negative_supply: 1.0,
  capacity_lock: 0.95,
  price_up: 0.86,
  geopolitical_split: 0.74,
  demand_up: 0.8,
  capacity_relief: -0.5,
  price_down: -0.65
};

const signalLabels = {
  negative_supply: 'Supply-Engpass',
  capacity_lock: 'Kapazitätsbindung',
  price_up: 'Preisdruck aufwärts',
  geopolitical_split: 'Geopolitische Entkopplung',
  demand_up: 'Nachfrageimpuls',
  capacity_relief: 'Kapazitätsentlastung',
  price_down: 'Preisdruck abwärts'
};

const scoreSignal = (article) => {
  if (methodology.signalOverrides?.[article.id]?.excludedFromScores) return 0;
  const base = Number(article.severity ?? 0) * (Number(article.confidence ?? 0) / 100);
  return Math.round(Math.max(0, Math.min(100, base * Math.abs(weights[article.signal] ?? 0.65))));
};
const trafficLight = (score) => score >= 82 ? 'red' : score >= 65 ? 'orange' : score >= 45 ? 'yellow' : 'green';
const directionFor = (score) => score >= 82 ? 'strong_up' : score >= 65 ? 'up' : score >= 45 ? 'watch' : 'stable';
const momentumFor = (items) => {
  const pressure = items.filter((a) => ['negative_supply', 'capacity_lock', 'price_up', 'demand_up', 'geopolitical_split'].includes(a.signal)).length;
  const relief = items.filter((a) => ['capacity_relief', 'price_down'].includes(a.signal)).length;
  if (pressure - relief >= 3) return '⬆️⬆️';
  if (pressure > relief) return '⬆️';
  if (relief > pressure) return '⬇️';
  return '→';
};

function daysSinceDate(dateValue) {
  if (!dateValue) return Number.POSITIVE_INFINITY;
  const date = new Date(dateValue.includes('T') ? dateValue : `${dateValue}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

const newestDate = articles.map((a) => a.date).filter(Boolean).sort().at(-1);
const dataAgeDays = daysSinceDate(newestDate);
const dataFreshness = !newestDate ? 'invalid' : dataAgeDays > 2 ? 'stale' : 'current';

const normalizedArticles = articles.map((article) => ({
  source: article.source ?? 'TAIL Knowledge Base',
  url: article.url ?? `tail://knowledge-base/${article.id}`,
  ...article,
  score: scoreSignal(article),
  dataStatus: methodology.signalOverrides?.[article.id]?.dataStatus ?? 'verified',
  excludedFromScores: methodology.signalOverrides?.[article.id]?.excludedFromScores ?? false
}));

const marketBuckets = new Map();
for (const article of normalizedArticles) {
  if (article.excludedFromScores) continue;
  for (const market of article.markets ?? []) {
    const bucket = marketBuckets.get(market) ?? [];
    bucket.push(article.score);
    marketBuckets.set(market, bucket);
  }
}
const markets = [...marketBuckets.entries()].map(([id, scores]) => {
  const peak = Math.max(...scores);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const score = Math.round(peak * 0.65 + avg * 0.35);
  return { id, label: marketLabels[id] ?? id, score, status: trafficLight(score), signals: scores.length };
}).sort((a, b) => b.score - a.score);

const companyMap = new Map();
for (const article of normalizedArticles) {
  if (article.excludedFromScores) continue;
  for (const company of article.companies ?? []) {
    const values = companyMap.get(company) ?? [];
    values.push(article.score);
    companyMap.set(company, values);
  }
}
const manufacturers = [...companyMap.entries()].map(([name, values]) => ({
  name,
  score: Math.round(Math.max(...values) * 0.7 + (values.reduce((a, b) => a + b, 0) / values.length) * 0.3),
  mentions: values.length
})).sort((a, b) => b.score - a.score).slice(0, 10);

function buildForecast(definition) {
  const relevant = normalizedArticles
    .filter((article) => !article.excludedFromScores && (article.markets ?? []).includes(definition.id))
    .sort((a, b) => b.score - a.score);

  if (relevant.length === 0) {
    return {
      id: definition.id,
      market: definition.label,
      status: 'red',
      momentum: 'unknown',
      relevanceScore: 0,
      confidenceScore: 0,
      horizon: definition.horizon,
      direction: 'unknown',
      keyThesis: `Keine Knowledge-Base-Signale für ${definition.label}. Forecast ungültig, bis neue Quellen verarbeitet wurden.`,
      supportingSignals: [],
      counterSignals: [{ type: 'missing_data', note: 'No source articles in Knowledge Base.' }],
      sourceArticleIds: [],
      lastUpdated: new Date().toISOString()
    };
  }

  const peak = relevant[0].score;
  const avg = relevant.reduce((sum, article) => sum + article.score, 0) / relevant.length;
  const relevanceScore = Math.round(peak * 0.6 + avg * 0.4);
  const confidenceScore = Math.round(relevant.reduce((sum, article) => sum + Number(article.confidence ?? 0), 0) / relevant.length);
  const counterSignals = relevant
    .filter((article) => ['capacity_relief', 'price_down'].includes(article.signal))
    .map((article) => ({ id: article.id, title: article.title, signal: signalLabels[article.signal] ?? article.signal, score: article.score }));

  return {
    id: definition.id,
    market: definition.label,
    status: trafficLight(relevanceScore),
    momentum: momentumFor(relevant),
    relevanceScore,
    confidenceScore,
    horizon: definition.horizon,
    direction: directionFor(relevanceScore),
    keyThesis: definition.bias,
    supportingSignals: relevant.slice(0, 4).map((article) => ({
      id: article.id,
      date: article.date,
      title: article.title,
      signal: signalLabels[article.signal] ?? article.signal,
      score: article.score,
      summary: article.summary
    })),
    counterSignals,
    sourceArticleIds: relevant.map((article) => article.id),
    lastUpdated: new Date().toISOString()
  };
}

const forecasts = requiredForecasts.map(buildForecast);
const missingForecasts = forecasts.filter((forecast) => forecast.sourceArticleIds.length === 0).map((forecast) => forecast.id);

const overall = Math.round(markets.slice(0, 6).reduce((sum, market) => sum + market.score, 0) / Math.min(6, markets.length));
const severe = normalizedArticles.filter((article) => article.score >= 75).sort((a, b) => b.score - a.score);

const inboxItems = Array.isArray(inbox.items) ? inbox.items : [];
const duplicateItems = Array.isArray(inbox.duplicate_items) ? inbox.duplicate_items : [];
const inboxErrors = Array.isArray(updateStatus.source_errors) ? updateStatus.source_errors : [];
const inboxStatus = updateStatus.status === 'error' ? 'error' : updateStatus.status === 'warning' || !inbox.updated_at ? 'warning' : 'ok';

const warnings = [
  dataFreshness === 'stale' ? `Knowledge Base ist ${dataAgeDays} Tage alt.` : null,
  inboxStatus === 'warning' ? updateStatus.message : null,
  missingForecasts.length ? `Forecast Engine ohne Quellen für: ${missingForecasts.join(', ')}` : null
].filter(Boolean);
const errors = [
  dataFreshness === 'invalid' ? 'Knowledge Base hat keinen gültigen Datenstand.' : null,
  updateStatus.status === 'error' ? updateStatus.message : null,
  missingForecasts.length ? 'Forecast Engine nicht vollständig.' : null
].filter(Boolean);

const processStatus = errors.length ? 'error' : warnings.length ? 'warning' : 'ok';
const pipelineSteps = [
  { id: 'knowledge_base', label: 'TAIL Knowledge Base', status: dataFreshness === 'current' ? 'ok' : dataFreshness === 'stale' ? 'warning' : 'error', detail: `${normalizedArticles.length} Artikel · Datenstand ${newestDate ?? 'unbekannt'}` },
  { id: 'inbox', label: 'TAIL Inbox', status: inboxStatus, detail: `${inboxItems.length} Inbox-Items · ${duplicateItems.length} Duplikate · ${inboxErrors.length} Quellenfehler` },
  { id: 'forecast_engine', label: 'Forecast Engine', status: missingForecasts.length ? 'error' : 'ok', detail: `${forecasts.length}/${requiredForecasts.length} Pflicht-Forecasts erzeugt` },
  { id: 'dashboard_build', label: 'Dashboard Build', status: 'ok', detail: 'Dashboard JSON wurde aus Knowledge Base und Pipeline-Metadaten erzeugt.' }
];

const dashboard = {
  schemaVersion: 3,
  platformVersion: '3.1',
  sourceOfTruth: 'TAIL Knowledge Base',
  dataAsOf: newestDate,
  dataFreshness,
  dataAgeDays,
  lastSuccessfulUpdate: new Date().toISOString(),
  lastForecastRun: new Date().toISOString(),
  newlyProcessedArticles: updateStatus.newly_processed_articles ?? inbox.new_items ?? 0,
  totalArticles: normalizedArticles.length,
  articleCount: normalizedArticles.length,
  processStatus,
  methodology: {
    version: methodology.version ?? '3.1',
    status: Object.values(methodology.forecastOverrides ?? {}).some((item) => item.confidenceFrozen) ? 'warning' : 'ok',
    frozenForecasts: Object.entries(methodology.forecastOverrides ?? {}).filter(([, item]) => item.confidenceFrozen).map(([id]) => id),
    quarantinedSignals: Object.entries(methodology.signalOverrides ?? {}).filter(([, item]) => item.excludedFromScores).map(([id]) => id),
    scoringRubric: methodology.signalRubric,
    gates: methodology.gates,
    forecastLedgerCount: forecastLedger.forecasts.length,
    resolvedForecasts: forecastLedger.forecasts.filter((item) => item.resolved).length,
    activeForecasts: forecastLedger.forecasts.filter((item) => item.active).length,
    scopeGateStatus: forecastLedger.scopeStatus?.hardGateActive ? 'active' : 'open',
    memoryRawShare: forecastLedger.scopeStatus?.memoryRawShare ?? null
  },
  error: errors[0] ?? null,
  warnings,
  inbox: {
    status: inboxStatus,
    updatedAt: inbox.updated_at,
    newItems: inbox.new_items ?? 0,
    totalItems: inboxItems.length,
    duplicateItems: duplicateItems.length,
    relevantItems: inboxItems.filter((item) => Number(item.relevance_score ?? 0) >= 50).length,
    sourceErrors: inboxErrors
  },
  pipeline: {
    status: processStatus,
    steps: pipelineSteps
  },
  tailIndex: overall,
  indexStatus: trafficLight(overall),
  markets,
  manufacturers,
  forecasts,
  executiveSummary: `TAIL steht auf ${overall}/100. ${markets.slice(0, 3).map((m) => m.label).join(', ')} sind die kritischsten Felder. Die Plattform liest ${normalizedArticles.length} Knowledge-Base-Artikel und erzeugt ${forecasts.length} Forecasts aus referenzierten Signalen statt statischen Dashboard-Werten.`,
  topSignals: severe.slice(0, 8).map((article) => ({
    id: article.id,
    date: article.date,
    title: article.title,
    summary: article.summary,
    analysis: article.tail_analysis,
    source: article.source,
    url: article.url,
    score: article.score,
    status: trafficLight(article.score)
  }))
};

fs.writeFileSync(outputPath, JSON.stringify(dashboard, null, 2) + '\n');
console.log(`Built dashboard: ${normalizedArticles.length} KB articles, ${forecasts.length} forecasts, TAIL index ${overall}, status ${processStatus}`);
