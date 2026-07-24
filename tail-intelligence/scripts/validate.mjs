import fs from 'node:fs';

const args = new Set(process.argv.slice(2));
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const exists = (file) => fs.existsSync(file);
const dailyFilePattern = /^daily-intelligence-(\d{4}-\d{2}-\d{2})\.json$/;
const requiredArticleFields = ['id', 'date', 'title', 'category', 'markets', 'severity', 'confidence', 'signal', 'summary', 'tail_analysis'];
const requiredForecastIds = ['dram', 'hbm', 'nand', 'enterprise_ssd', 'ai_infrastructure'];

function validateArticles(articles) {
  if (!Array.isArray(articles) || articles.length === 0) throw new Error('No articles available in Knowledge Base');
  const ids = new Set();
  for (const [index, article] of articles.entries()) {
    for (const field of requiredArticleFields) {
      if (article[field] === undefined) throw new Error(`Article ${index} missing ${field}`);
    }
    if (ids.has(article.id)) throw new Error(`Duplicate article id: ${article.id}`);
    ids.add(article.id);
    if (!Array.isArray(article.markets) || article.markets.length === 0) throw new Error(`Article ${article.id} has no markets`);
    if (article.severity < 0 || article.severity > 100 || article.confidence < 0 || article.confidence > 100) throw new Error(`Article ${article.id} has invalid score`);
  }
}

function validateDashboard(dashboard, articles) {
  if (dashboard.schemaVersion !== 3) throw new Error('Dashboard schemaVersion must be 3');
  if (dashboard.sourceOfTruth !== 'TAIL Knowledge Base') throw new Error('Dashboard must declare TAIL Knowledge Base as source of truth');
  if (!['ok', 'warning', 'error'].includes(dashboard.processStatus)) throw new Error(`Invalid processStatus: ${dashboard.processStatus}`);
  if (!['current', 'stale', 'invalid'].includes(dashboard.dataFreshness)) throw new Error(`Invalid dataFreshness: ${dashboard.dataFreshness}`);
  if (!dashboard.lastSuccessfulUpdate || !dashboard.dataAsOf || !dashboard.lastForecastRun) throw new Error('Dashboard timestamps missing');
  if (dashboard.totalArticles !== articles.length || dashboard.articleCount !== articles.length) throw new Error('Article count mismatch');
  if (dashboard.tailIndex < 0 || dashboard.tailIndex > 100) throw new Error('TAIL index out of range');
  if (!Array.isArray(dashboard.markets) || dashboard.markets.length < 5) throw new Error('Market indicators incomplete');
  if (!dashboard.inbox || !['ok', 'warning', 'error'].includes(dashboard.inbox.status)) throw new Error('Inbox status missing');
  if (!dashboard.pipeline || !Array.isArray(dashboard.pipeline.steps) || dashboard.pipeline.steps.length < 4) throw new Error('Pipeline status incomplete');
  if (dashboard.platformVersion !== '3.1' || dashboard.methodology?.version !== '3.1') throw new Error('TAIL Methodology 3.1 missing');
  if (!Array.isArray(dashboard.methodology.frozenForecasts) || !dashboard.methodology.frozenForecasts.includes('P-2026-07-24-01')) throw new Error('CXMT forecast is not frozen');
  if (!Array.isArray(dashboard.methodology.quarantinedSignals) || !dashboard.methodology.quarantinedSignals.includes('S-2026-07-24-02')) throw new Error('CXMT source signal is not quarantined');

  const forecastIds = new Set((dashboard.forecasts ?? []).map((forecast) => forecast.id));
  for (const id of requiredForecastIds) {
    if (!forecastIds.has(id)) throw new Error(`Missing required forecast: ${id}`);
  }
  for (const forecast of dashboard.forecasts) {
    if (!forecast.market || !forecast.horizon || !forecast.keyThesis) throw new Error(`Forecast ${forecast.id} incomplete`);
    if (!Array.isArray(forecast.sourceArticleIds) || forecast.sourceArticleIds.length === 0) throw new Error(`Forecast ${forecast.id} has no source article references`);
    if (!Array.isArray(forecast.supportingSignals) || forecast.supportingSignals.length === 0) throw new Error(`Forecast ${forecast.id} has no supporting signals`);
    if (forecast.relevanceScore < 0 || forecast.relevanceScore > 100) throw new Error(`Forecast ${forecast.id} relevance out of range`);
    if (forecast.confidenceScore < 0 || forecast.confidenceScore > 100) throw new Error(`Forecast ${forecast.id} confidence out of range`);
  }
}

function validateForecastLedger(ledger, methodology) {
  if (ledger.schemaVersion !== 1 || ledger.methodologyVersion !== '3.1') throw new Error('Forecast ledger 3.1 missing');
  if (!Array.isArray(ledger.forecasts) || ledger.forecasts.length === 0) throw new Error('Forecast ledger empty');
  const ids = new Set();
  for (const forecast of ledger.forecasts) {
    if (ids.has(forecast.id)) throw new Error(`Duplicate ledger forecast ${forecast.id}`);
    ids.add(forecast.id);
    if (!forecast.clusterId || forecast.clusterId === 'SECOND-ORDER-2026') throw new Error(`Forecast ${forecast.id} has invalid catch-all cluster`);
    if (!methodology.clusters?.[forecast.clusterId]) throw new Error(`Forecast ${forecast.id} references unknown cluster`);
    if (forecast.confidenceCreation !== null && (!Number.isFinite(forecast.confidenceCreation) || forecast.confidenceCreation < 0 || forecast.confidenceCreation > 100)) {
      throw new Error(`Forecast ${forecast.id} has invalid creation confidence`);
    }
    if (forecast.creationSource === 'migration_review_required') throw new Error(`Forecast ${forecast.id} still needs creation-confidence migration`);
    if (forecast.resolved && ![0, 1].includes(forecast.outcome)) throw new Error(`Resolved forecast ${forecast.id} has no binary outcome`);
    if (forecast.adversarialCase?.probability === null && forecast.adversarialCase?.assessmentStatus !== 'probability_pending') {
      throw new Error(`Forecast ${forecast.id} has inconsistent adversarial assessment`);
    }
  }
  if (ledger.forecasts.find((item) => item.id === 'P-2026-07-22-01')?.confidenceCreation !== 74) throw new Error('Wistron creation confidence must be 74');
  if (ledger.forecasts.find((item) => item.id === 'P-2026-07-21-01')?.clusterId !== 'GEO-ENERGY-HORMUZ-2026') throw new Error('Houthi forecast cluster incorrect');
  if (ledger.forecasts.find((item) => item.id === 'P-2026-07-24-04')?.clusterId !== 'AI-CAPITAL-MARKETS-2026') throw new Error('Capital-market forecast cluster incorrect');
  const resolved = ledger.forecasts.filter((item) => item.resolved);
  if (resolved.length !== 4) throw new Error(`Expected 4 resolved forecasts, got ${resolved.length}`);
  const activeWeight = ledger.forecasts.filter((item) => item.active).reduce((sum, item) => sum + item.effectiveWeight, 0);
  if (Math.abs(activeWeight - 1) > 0.000001) throw new Error(`Active forecast weights must total 1, got ${activeWeight}`);
  if (!ledger.scopeStatus?.hardGateActive) throw new Error('Hard scope gate should be active while raw Memory share is below 60%');
}

function validateDailySync(articles) {
  const dailyFiles = fs.readdirSync('data').filter((name) => dailyFilePattern.test(name)).sort();
  if (!dailyFiles.length) return;

  const latestFile = dailyFiles.at(-1);
  const latestDaily = readJson(`data/${latestFile}`);
  const latestDailyDate = new Date(latestDaily.updatedAt).toISOString().slice(0, 10);
  const newestArticleDate = articles.map((article) => article.date).sort().at(-1);
  const acceptedIds = (latestDaily.acceptedSignals ?? []).map((signal) => signal.id).filter(Boolean);
  const articleIds = new Set(articles.map((article) => article.id));
  const missingIds = acceptedIds.filter((id) => !articleIds.has(id));

  if (newestArticleDate < latestDailyDate) {
    throw new Error(`Knowledge Base stale: newest article ${newestArticleDate}, latest daily intelligence ${latestDailyDate}`);
  }
  if (missingIds.length) {
    throw new Error(`Knowledge Base missing accepted daily signals: ${missingIds.join(', ')}`);
  }
  if (!exists('data/daily-intelligence-index.json')) {
    throw new Error('daily-intelligence-index.json missing');
  }
  const index = readJson('data/daily-intelligence-index.json');
  if (index.latest !== latestFile || !Array.isArray(index.files) || !index.files.includes(latestFile)) {
    throw new Error(`Daily intelligence index does not point to ${latestFile}`);
  }
}

if (!exists('data/articles.json')) throw new Error('data/articles.json missing');
if (!exists('config/sources.json')) throw new Error('config/sources.json missing');
if (!exists('config/methodology.json')) throw new Error('config/methodology.json missing');

const methodology = readJson('config/methodology.json');
if (methodology.schemaVersion !== 2 || methodology.version !== '3.1') throw new Error('Methodology config must be 3.1 schema 2');
const rubricTotal = Object.values(methodology.signalRubric ?? {}).reduce((sum, value) => sum + Number(value || 0), 0);
if (rubricTotal !== 100) throw new Error(`Signal rubric must total 100, got ${rubricTotal}`);
if (methodology.gates?.accepted !== 80 || methodology.gates?.watchlist !== 65) throw new Error('Signal gates must be 80/65');
const clusterBudget = Object.values(methodology.clusters ?? {}).reduce((sum, cluster) => sum + Number(cluster.budget || 0), 0);
if (Math.abs(clusterBudget - 1) > 0.000001) throw new Error(`Cluster budgets must total 1, got ${clusterBudget}`);

const articles = readJson('data/articles.json');
validateArticles(articles);

if (args.has('--static')) {
  const config = readJson('config/sources.json');
  if (!Array.isArray(config.sources) || config.sources.length === 0) throw new Error('No inbox sources configured');
  console.log(`Static validation OK: ${articles.length} KB articles, ${config.sources.length} inbox sources`);
  process.exit(0);
}

validateDailySync(articles);

if (!exists('data/dashboard.json')) throw new Error('data/dashboard.json missing. Run npm run build first.');
if (!exists('data/forecast-ledger.json')) throw new Error('data/forecast-ledger.json missing. Run npm run build first.');
const dashboard = readJson('data/dashboard.json');
const forecastLedger = readJson('data/forecast-ledger.json');
validateForecastLedger(forecastLedger, methodology);
validateDashboard(dashboard, articles);

console.log(`Validation OK: ${articles.length} KB articles, ${dashboard.forecasts.length} forecasts, status ${dashboard.processStatus}, index ${dashboard.tailIndex}`);
