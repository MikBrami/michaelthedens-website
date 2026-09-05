import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const configPath = path.join(root, 'config', 'market-outlook.json');
const dashboardPath = path.join(root, 'data', 'dashboard.json');
const publicPath = path.resolve(root, '..', 'public-tail', 'data.json');

const readJson = (filePath, fallback = null) => {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
};

const config = readJson(configPath);
const dashboard = readJson(dashboardPath);
const publicSnapshot = readJson(publicPath);

if (!config || config.schemaVersion !== 1 || !Array.isArray(config.outlooks)) {
  throw new Error('market-outlook.json missing or invalid');
}
if (!dashboard?.markets || !Array.isArray(dashboard.markets)) {
  throw new Error('dashboard.json missing markets');
}
if (!publicSnapshot?.platform) {
  throw new Error('public-tail/data.json missing platform');
}

const marketById = new Map(dashboard.markets.map((market) => [market.id, market]));

const outlooks = config.outlooks.map((outlook) => {
  const market = marketById.get(outlook.marketId);
  if (!market) throw new Error(`Market outlook references unknown market: ${outlook.marketId}`);
  if (!outlook.evidenceAsOf) throw new Error(`Market outlook ${outlook.marketId} is missing evidenceAsOf`);
  if (!Array.isArray(outlook.scenarios) || outlook.scenarios.length < 2) {
    throw new Error(`Market outlook ${outlook.marketId} needs at least two scenarios`);
  }
  const probabilityTotal = outlook.scenarios.reduce((sum, scenario) => sum + Number(scenario.probability || 0), 0);
  if (Math.abs(probabilityTotal - 100) > 0.0001) {
    throw new Error(`Market outlook ${outlook.marketId} probabilities total ${probabilityTotal}, expected 100`);
  }

  return {
    ...outlook,
    currentScore: market.score,
    currentStatus: market.status,
    confidence: market.confidence,
    coverage: market.coverage,
    indexAsOf: dashboard.dataAsOf
  };
});

const outlookBlock = {
  schemaVersion: config.schemaVersion,
  updatedAt: config.updatedAt,
  source: config.source,
  outlooks
};

dashboard.marketOutlook = outlookBlock;
publicSnapshot.marketOutlook = {
  schemaVersion: config.schemaVersion,
  updatedAt: config.updatedAt,
  outlooks: outlooks
    .filter((outlook) => outlook.public !== false)
    .map(({ marketId, horizon, evidenceAsOf, headline, view, scenarios, timeline, changeRules, watchSignals, methodologyNote, currentScore, currentStatus, confidence, coverage, indexAsOf }) => ({
      marketId,
      horizon,
      evidenceAsOf,
      headline,
      view,
      scenarios,
      timeline,
      changeRules,
      watchSignals,
      methodologyNote,
      currentScore,
      currentStatus,
      confidence,
      coverage,
      indexAsOf
    }))
};

fs.writeFileSync(dashboardPath, JSON.stringify(dashboard, null, 2) + '\n');
fs.writeFileSync(publicPath, JSON.stringify(publicSnapshot, null, 2) + '\n');
console.log(`Built market outlook: ${outlooks.length} outlook(s), source ${config.source}`);
