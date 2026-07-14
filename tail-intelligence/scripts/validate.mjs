import fs from 'node:fs';

const args = new Set(process.argv.slice(2));
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const exists = (file) => fs.existsSync(file);
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
  if (dashboard.schemaVersion !== 2) throw new Error('Dashboard schemaVersion must be 2');
  if (dashboard.sourceOfTruth !== 'TAIL Knowledge Base') throw new Error('Dashboard must declare TAIL Knowledge Base as source of truth');
  if (!['ok', 'warning', 'error'].includes(dashboard.processStatus)) throw new Error(`Invalid processStatus: ${dashboard.processStatus}`);
  if (!['current', 'stale', 'invalid'].includes(dashboard.dataFreshness)) throw new Error(`Invalid dataFreshness: ${dashboard.dataFreshness}`);
  if (!dashboard.lastSuccessfulUpdate || !dashboard.dataAsOf || !dashboard.lastForecastRun) throw new Error('Dashboard timestamps missing');
  if (dashboard.totalArticles !== articles.length || dashboard.articleCount !== articles.length) throw new Error('Article count mismatch');
  if (dashboard.tailIndex < 0 || dashboard.tailIndex > 100) throw new Error('TAIL index out of range');
  if (!Array.isArray(dashboard.markets) || dashboard.markets.length < 5) throw new Error('Market indicators incomplete');
  if (!dashboard.inbox || !['ok', 'warning', 'error'].includes(dashboard.inbox.status)) throw new Error('Inbox status missing');
  if (!dashboard.pipeline || !Array.isArray(dashboard.pipeline.steps) || dashboard.pipeline.steps.length < 4) throw new Error('Pipeline status incomplete');

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

if (!exists('data/articles.json')) throw new Error('data/articles.json missing');
if (!exists('config/sources.json')) throw new Error('config/sources.json missing');

const articles = readJson('data/articles.json');
validateArticles(articles);

if (args.has('--static')) {
  const config = readJson('config/sources.json');
  if (!Array.isArray(config.sources) || config.sources.length === 0) throw new Error('No inbox sources configured');
  console.log(`Static validation OK: ${articles.length} KB articles, ${config.sources.length} inbox sources`);
  process.exit(0);
}

if (!exists('data/dashboard.json')) throw new Error('data/dashboard.json missing. Run npm run build first.');
const dashboard = readJson('data/dashboard.json');
validateDashboard(dashboard, articles);

console.log(`Validation OK: ${articles.length} KB articles, ${dashboard.forecasts.length} forecasts, status ${dashboard.processStatus}, index ${dashboard.tailIndex}`);
