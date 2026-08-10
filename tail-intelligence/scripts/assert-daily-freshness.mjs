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
