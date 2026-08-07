import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const publicScript = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const publicData = JSON.parse(fs.readFileSync(path.join(root, 'public-tail', 'data.json'), 'utf8'));
const middleware = fs.readFileSync(path.join(root, 'middleware.js'), 'utf8');

for (const forbiddenReference of [
  '/tail-intelligence/data/',
  'daily-intelligence-latest.json',
  'articles.json'
]) {
  if (publicScript.includes(forbiddenReference)) {
    throw new Error(`Public script still references private TAIL data: ${forbiddenReference}`);
  }
}

const allowedTopLevelKeys = new Set([
  'schemaVersion',
  'generatedAt',
  'platform',
  'executivePulse',
  'signals',
  'catalysts'
]);

for (const key of Object.keys(publicData)) {
  if (!allowedTopLevelKeys.has(key)) throw new Error(`Unexpected public TAIL data key: ${key}`);
}

for (const forbiddenKey of ['predictions', 'falsifiers', 'auditTrail', 'runHistory', 'articles', 'forecasts', 'pipeline']) {
  if (JSON.stringify(publicData).includes(`"${forbiddenKey}"`)) {
    throw new Error(`Private intelligence leaked into public snapshot: ${forbiddenKey}`);
  }
}

for (const requiredPath of ["'/tail-daily-intelligence'", "'/tail-intelligence'"]) {
  if (!middleware.includes(requiredPath)) throw new Error(`Vercel protection boundary missing: ${requiredPath}`);
}

if (!middleware.includes("process.env.VERCEL_ENV === 'preview'")) {
  throw new Error('Private dashboard is not restricted to Vercel-protected preview deployments.');
}

if (middleware.includes('CLERK_') || middleware.includes('@clerk/')) {
  throw new Error('Clerk dependency still present in the Vercel-only access boundary.');
}

console.log(`Public boundary OK: ${publicData.signals.length} selected signals, ${publicData.catalysts.length} catalysts.`);
