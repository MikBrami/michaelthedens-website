import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const ROOT = new URL('../', import.meta.url);
const CONFIG = new URL('config/sources.json', ROOT);
const ARTICLES = new URL('data/articles.json', ROOT);
const INBOX = new URL('data/inbox.json', ROOT);
const MANUAL = new URL('data/manual-inbox.json', ROOT);
const STATUS = new URL('data/update-status.json', ROOT);

const now = new Date().toISOString();
const strip = (value = '') => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex').slice(0, 20);
const escapeRx = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const tokenize = (value = '') => new Set(strip(value).toLowerCase().replace(/[^a-z0-9äöüß\s-]/gi, ' ').split(/\s+/).filter((token) => token.length > 2));

function similarity(a, b) {
  const left = tokenize(a);
  const right = tokenize(b);
  if (!left.size || !right.size) return 0;
  const overlap = [...left].filter((token) => right.has(token)).length;
  return overlap / Math.max(left.size, right.size);
}

function canonicalUrl(value = '') {
  try {
    const url = new URL(value.trim());
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_)/i.test(key)) url.searchParams.delete(key);
    }
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return value.trim().replace(/\/$/, '');
  }
}

function extractTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return strip((match?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, ''));
}

function parseFeed(xml, source) {
  const blocks = [...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].map((match) => match[2]);
  return blocks.map((block) => {
    const title = extractTag(block, 'title');
    const linkTag = block.match(/<link(?:\s[^>]*)?href=["']([^"']+)["'][^>]*>/i)?.[1];
    const link = linkTag || extractTag(block, 'link') || extractTag(block, 'guid');
    const published = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated');
    const summary = extractTag(block, 'description') || extractTag(block, 'summary') || extractTag(block, 'content');
    if (!title || !link) return null;
    const url = canonicalUrl(link);
    return {
      id: hash(`${source.id}|${url}`),
      source_id: source.id,
      source_name: source.name,
      title,
      url,
      canonical_url: url,
      content_hash: hash(`${title}|${summary}`),
      published_at: published ? new Date(published).toISOString() : now,
      summary,
      categories: source.categories || [],
      source_weight: source.weight ?? 1,
      status: 'new'
    };
  }).filter(Boolean);
}

function scoreItem(item, keywords) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  let score = 0;
  const hits = [];
  for (const term of keywords.high_priority || []) {
    if (new RegExp(`\\b${escapeRx(term.toLowerCase())}\\b`, 'i').test(text)) {
      score += 20;
      hits.push(term);
    }
  }
  for (const term of keywords.medium_priority || []) {
    if (new RegExp(`\\b${escapeRx(term.toLowerCase())}\\b`, 'i').test(text)) {
      score += 8;
      hits.push(term);
    }
  }
  return { relevance_score: Math.min(100, Math.round(score * (item.source_weight || 1))), keyword_hits: [...new Set(hits)] };
}

async function readJson(url, fallback) {
  try { return JSON.parse(await fs.readFile(url, 'utf8')); } catch { return fallback; }
}

function findDuplicate(item, known) {
  const canonical = canonicalUrl(item.url);
  const exact = known.find((entry) => entry.url && canonicalUrl(entry.url) === canonical);
  if (exact) return { type: 'url', duplicate_of: exact.id ?? exact.url };

  const sameContent = known.find((entry) => entry.content_hash && entry.content_hash === item.content_hash);
  if (sameContent) return { type: 'content_hash', duplicate_of: sameContent.id ?? sameContent.url };

  const similarTitle = known.find((entry) => entry.title && similarity(entry.title, item.title) >= 0.82);
  if (similarTitle) return { type: 'title_similarity', duplicate_of: similarTitle.id ?? similarTitle.url };

  return null;
}

async function main() {
  const config = await readJson(CONFIG, { sources: [], keywords: {} });
  const currentInbox = await readJson(INBOX, { updated_at: null, items: [], duplicate_items: [] });
  const manual = await readJson(MANUAL, { items: [] });
  const articles = await readJson(ARTICLES, []);

  const collected = [];
  const errors = [];
  for (const source of config.sources.filter((source) => source.enabled && source.type === 'rss')) {
    try {
      const response = await fetch(source.url, { headers: { 'user-agent': 'TAIL-Intelligence/2.0' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      collected.push(...parseFeed(await response.text(), source));
    } catch (error) {
      errors.push({ source: source.id, message: error.message });
    }
  }

  for (const item of manual.items || []) {
    if (!item.title || !item.url) continue;
    const url = canonicalUrl(item.url);
    collected.push({
      id: item.id || hash(`manual|${url}`),
      source_id: 'manual-tail-inbox',
      source_name: 'TAIL Manual Inbox',
      published_at: item.published_at || now,
      status: item.status || 'new',
      source_weight: 1,
      categories: item.categories || ['all'],
      ...item,
      url,
      canonical_url: url,
      content_hash: item.content_hash || hash(`${item.title}|${item.summary ?? ''}`)
    });
  }

  const known = [
    ...(currentInbox.items || []),
    ...(articles || []).map((article) => ({
      id: article.id,
      title: article.title,
      url: article.url ?? `tail://knowledge-base/${article.id}`,
      content_hash: article.content_hash ?? hash(`${article.title}|${article.summary ?? ''}`)
    }))
  ];

  const fresh = [];
  const duplicates = [];
  for (const item of collected.map((entry) => ({ ...entry, ...scoreItem(entry, config.keywords), ingested_at: now }))) {
    const duplicate = findDuplicate(item, [...known, ...fresh]);
    if (duplicate) {
      duplicates.push({ ...item, status: 'duplicate', ...duplicate });
      continue;
    }
    fresh.push({ ...item, status: item.relevance_score >= 25 ? 'new' : 'irrelevant' });
  }

  const merged = [...fresh, ...(currentInbox.items || [])]
    .filter((item, index, arr) => arr.findIndex((candidate) => canonicalUrl(candidate.url) === canonicalUrl(item.url)) === index)
    .sort((a, b) => Number(b.relevance_score ?? 0) - Number(a.relevance_score ?? 0) || new Date(b.published_at) - new Date(a.published_at))
    .slice(0, 1000);

  const duplicateItems = [...duplicates, ...(currentInbox.duplicate_items || [])].slice(0, 200);

  await fs.writeFile(INBOX, JSON.stringify({
    updated_at: now,
    new_items: fresh.length,
    duplicate_items: duplicateItems,
    items: merged
  }, null, 2) + '\n');

  await fs.writeFile(STATUS, JSON.stringify({
    status: errors.length ? 'warning' : 'ok',
    last_attempt: now,
    last_successful_update: now,
    newly_processed_articles: fresh.length,
    deduplicated_articles: duplicates.length,
    inbox_size: merged.length,
    source_errors: errors,
    message: errors.length ? 'Einige Quellen konnten nicht gelesen werden; vorhandene Daten bleiben verfügbar.' : 'TAIL Inbox erfolgreich aktualisiert.'
  }, null, 2) + '\n');

  console.log(`TAIL Inbox: ${fresh.length} neue Artikel, ${duplicates.length} Duplikate, ${merged.length} Inbox gesamt, ${errors.length} Quellenfehler.`);
}

main().catch(async (error) => {
  await fs.writeFile(STATUS, JSON.stringify({
    status: 'error',
    last_attempt: now,
    last_successful_update: null,
    newly_processed_articles: 0,
    deduplicated_articles: 0,
    message: error.message
  }, null, 2) + '\n');
  console.error(error);
  process.exit(1);
});
