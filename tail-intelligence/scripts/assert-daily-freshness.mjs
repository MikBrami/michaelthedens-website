import fs from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const DATA = new URL('data/', ROOT);
const INDEX = new URL('data/daily-intelligence-index.json', ROOT);
const STATUS = new URL('data/update-status.json', ROOT);

const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());
const expected = `daily-intelligence-${today}.json`;

async function readJson(url, fallback) {
  try { return JSON.parse(await fs.readFile(url, 'utf8')); } catch { return fallback; }
}

async function main() {
  const index = await readJson(INDEX, null);
  const status = await readJson(STATUS, {});
  let fileExists = true;
  try { await fs.access(new URL(expected, DATA)); } catch { fileExists = false; }

  const dashboard = await readJson(new URL('data/dashboard.json',ROOT),{});
  const daily = await readJson(new URL('data/daily-intelligence-latest.json',ROOT),{});
  const publicData = await readJson(new URL('../public-tail/data.json',ROOT),{});
  const english = await readJson(new URL('../public-tail/data-en.json',ROOT),{});
  for (const [name,snapshot] of [['DE',publicData],['EN',english]]) {
    if (snapshot.executivePulse?.current !== dashboard.executivePulse?.current || snapshot.platform?.analysisAsOf !== dashboard.analysisAsOf) throw new Error(`${name}: index/analysis mismatch`);
    for (const m of snapshot.platform?.markets || []) if (dashboard.markets.find(x=>x.id===m.id)?.score !== m.score) throw new Error(`${name}: segment mismatch ${m.id}`);
    if (snapshot.platform?.sourceDataAsOf !== dashboard.sourceDataAsOf) throw new Error(`${name}: source timestamp mismatch`);
  }
  if (daily.automatedDaily && daily.executivePulse?.current !== dashboard.executivePulse?.current) throw new Error('Daily metrics lag canonical calculation');
  if (publicData.platform?.admissionReview?.status !== 'complete' && publicData.dailyStatus?.type === 'no-material-change') throw new Error('Incomplete admission review cannot claim no material change');

  const latest = index?.latest || null;
  const ok = fileExists && latest === expected;

  if (!ok) {
    await fs.writeFile(STATUS, JSON.stringify({
      ...status,
      status: 'error',
      freshness_guard_at: new Date().toISOString(),
      freshness_guard_expected: expected,
      freshness_guard_latest: latest,
      message: `TAIL Daily Freshness Guard failed: expected ${expected}, latest index is ${latest || 'missing'}.`
    }, null, 2) + '\n');
    throw new Error(`TAIL Daily Freshness Guard: expected ${expected}, got ${latest || 'no indexed daily file'}.`);
  }

  await fs.writeFile(STATUS, JSON.stringify({
    ...status,
    freshness_guard_at: new Date().toISOString(),
    freshness_guard_expected: expected,
    freshness_guard_latest: latest,
    freshness_guard_status: 'ok'
  }, null, 2) + '\n');

  console.log(`TAIL Daily Freshness Guard OK: ${expected}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
