const deploymentUrl = process.argv[2] || process.env.DEPLOYMENT_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
const requiredForecastIds = ['dram', 'hbm', 'nand', 'enterprise_ssd', 'ai_infrastructure'];

if (!deploymentUrl) {
  throw new Error('No deployment URL provided. Pass it as an argument or set DEPLOYMENT_URL/VERCEL_URL.');
}

const base = deploymentUrl.replace(/\/$/, '');

async function assertOk(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response;
}

const page = await assertOk(base);
const html = await page.text();
for (const marker of ['INTELLIGENCE PLATFORM 3.0', 'brier-creation', 'methodology-status']) {
  if (!html.includes(marker)) throw new Error(`Dashboard HTML missing marker: ${marker}`);
}

const dataResponse = await assertOk(`${base}/data/dashboard.json?validation=${Date.now()}`);
const dashboard = await dataResponse.json();
const indexResponse = await assertOk(`${base}/data/daily-intelligence-index.json?validation=${Date.now()}`);
const dailyIndex = await indexResponse.json();
const latestDailyResponse = await assertOk(`${base}/data/${dailyIndex.latest}?validation=${Date.now()}`);
const latestDaily = await latestDailyResponse.json();

if (dashboard.sourceOfTruth !== 'TAIL Knowledge Base') throw new Error('Dashboard is not using the Knowledge Base source of truth marker');
if (!dashboard.lastSuccessfulUpdate || !dashboard.dataAsOf || !dashboard.lastForecastRun) throw new Error('Dashboard dynamic timestamps missing');
if (!Number.isInteger(dashboard.articleCount) || dashboard.articleCount <= 0) throw new Error('Dashboard article count is not dynamic or is empty');
if (!['ok', 'warning', 'error'].includes(dashboard.processStatus)) throw new Error(`Invalid process status: ${dashboard.processStatus}`);
if (!dashboard.pipeline?.steps?.length) throw new Error('Pipeline status not exposed');
if (!dashboard.inbox || !['ok', 'warning', 'error'].includes(dashboard.inbox.status)) throw new Error('Inbox status not exposed');
if (dashboard.methodology?.version !== '3.0') throw new Error('TAIL Methodology 3.0 is not live');
if (!dashboard.methodology.frozenForecasts?.includes('P-2026-07-24-01')) throw new Error('CXMT forecast quarantine is not live');
if (!Array.isArray(dailyIndex.files) || !dailyIndex.files.includes(dailyIndex.latest)) throw new Error('Daily intelligence index is incomplete');
if (dashboard.dataAsOf < new Date(latestDaily.updatedAt).toISOString().slice(0, 10)) {
  throw new Error(`Live Knowledge Base stale: ${dashboard.dataAsOf} vs daily intelligence ${latestDaily.updatedAt}`);
}

const forecastIds = new Set((dashboard.forecasts ?? []).map((forecast) => forecast.id));
for (const id of requiredForecastIds) {
  if (!forecastIds.has(id)) throw new Error(`Deployment missing forecast: ${id}`);
}

for (const forecast of dashboard.forecasts) {
  if (!forecast.sourceArticleIds?.length) throw new Error(`Forecast ${forecast.id} has no Knowledge Base references`);
}

console.log(`Live validation OK: ${base} · ${dashboard.articleCount} KB articles · ${dashboard.forecasts.length} forecasts · status ${dashboard.processStatus}`);