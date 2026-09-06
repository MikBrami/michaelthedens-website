import fs from 'node:fs';
import path from 'node:path';
import { calculateIndexModel, statusForIndex } from './index-model.mjs';

const root = path.resolve(process.cwd());
const dataDir = path.join(root, 'data');
const articlesPath = path.join(dataDir, 'articles.json');
const dashboardPath = path.join(dataDir, 'dashboard.json');
const methodologyPath = path.join(root, 'config', 'methodology.json');
const latestDailyPath = path.join(dataDir, 'daily-intelligence-latest.json');
const operationalIndicatorsPath = path.join(dataDir, 'operational-indicators.json');
const publicPath = path.resolve(root, '..', 'public-tail', 'data.json');

const readJson = (file, fallback = null) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
};

const articles = readJson(articlesPath, []);
const dashboard = readJson(dashboardPath);
const methodology = readJson(methodologyPath);
const latestDaily = readJson(latestDailyPath, {});
const operational = readJson(operationalIndicatorsPath, { indicators: [] });
const publicSnapshot = readJson(publicPath);

if (!Array.isArray(articles) || !articles.length) throw new Error('articles.json missing or empty');
if (!dashboard || !methodology?.indexModel || !publicSnapshot?.platform) throw new Error('index inputs missing');

const analysisAsOf = String(
  latestDaily.updatedAt ||
  latestDaily.dailyStatus?.date ||
  publicSnapshot.platform.analysisAsOf ||
  new Date().toISOString()
).slice(0, 10);

const normalizedArticles = articles.map((article) => ({
  source: article.source ?? 'TAIL Knowledge Base',
  url: article.url ?? `tail://knowledge-base/${article.id}`,
  ...article,
  dataStatus: methodology.signalOverrides?.[article.id]?.dataStatus ?? 'verified',
  excludedFromScores: methodology.signalOverrides?.[article.id]?.excludedFromScores ?? false
}));

const indexModel = calculateIndexModel(
  normalizedArticles.filter((article) => !article.excludedFromScores),
  methodology,
  { asOf: analysisAsOf, operationalIndicators: operational.indicators || [] }
);

const labels = new Map((dashboard.markets || []).map((market) => [market.id, market.label]));
const markets = indexModel.markets
  .map((market) => ({ ...market, label: labels.get(market.id) || methodology.indexModel.marketEvidencePolicies?.[market.id]?.label || market.id }))
  .sort((a, b) => Number(b.score ?? -1) - Number(a.score ?? -1));

const current = indexModel.executiveScore;
dashboard.dataAsOf = analysisAsOf;
dashboard.tailIndex = current;
dashboard.indexStatus = statusForIndex(current, methodology.indexModel.statusThresholds);
dashboard.markets = markets;
dashboard.executivePulse = {
  ...(dashboard.executivePulse || {}),
  current,
  status: indexModel.status,
  confidence: indexModel.executiveConfidence,
  riskPressure: indexModel.riskPressure,
  coverage: indexModel.coverage,
  methodologyVersion: indexModel.version,
  drivers: indexModel.drivers
};

const publicMarketIds = ['server_dram', 'hbm', 'enterprise_ssd'];
publicSnapshot.platform = {
  ...(publicSnapshot.platform || {}),
  dataAsOf: analysisAsOf,
  analysisAsOf,
  sourceDataAsOf: dashboard.sourceDataAsOf,
  markets: publicMarketIds.map((id) => markets.find((market) => market.id === id)).filter(Boolean)
};
publicSnapshot.executivePulse = {
  ...(publicSnapshot.executivePulse || {}),
  current,
  status: indexModel.status,
  confidence: indexModel.executiveConfidence,
  riskPressure: indexModel.riskPressure,
  coverage: indexModel.coverage,
  methodologyVersion: indexModel.version
};

fs.writeFileSync(dashboardPath, JSON.stringify(dashboard, null, 2) + '\n');
fs.writeFileSync(publicPath, JSON.stringify(publicSnapshot, null, 2) + '\n');
console.log(`Index re-aged against analysis date ${analysisAsOf}: ${current}/100.`);
