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

function extractTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return strip((match?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, ''));
}

function parseFeed(xml, source) {
  const blocks = [...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].map((m) => m[2]);
  return blocks.map((block) => {
    const title = extractTag(block, 'title');
    const linkTag = block.match(/<link(?:\s[^>]*)?href=["']([^"']+)["'][^>]*>/i)?.[1];
    const link = linkTag || extractTag(block, 'link') || extractTag(block, 'guid');
    const published = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated');
    const summary = extractTag(block, 'description') || extractTag(block, 'summary') || extractTag(block, 'content');
    if (!title || !link) return null;
    return {
      id: hash(`${source.id}|${link}`),
      source_id: source.id,
      source_name: source.name,
      title,
      url: link,
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

async function main() {
  const config = await readJson(CONFIG, { sources: [], keywords: {} });
  const currentInbox = await readJson(INBOX, { updated_at: null, items: [] });
  const manual = await readJson(MANUAL, { items: [] });
  const articles = await readJson(ARTICLES, []);
  const knownUrls = new Set([
    ...currentInbox.items.map((i) => i.url).filter(Boolean),
    ...articles.map((i) => i.url).filter(Boolean)
  ]);

  const collected = [];
  const errors = [];
  for (const source of config.sources.filter((s) => s.enabled && s.type === 'rss')) {
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
    collected.push({
      id: item.id || hash(`manual|${item.url}`),
      source_id: 'manual-tail-inbox',
      source_name: 'TAIL Manual Inbox',
      published_at: item.published_at || now,
      status: item.status || 'new',
      source_weight: 1,
      categories: item.categories || ['all'],
      ...item
    });
  }

  const fresh = collected
    .filter((item) => !knownUrls.has(item.url))
    .map((item) => ({ ...item, ...scoreItem(item, config.keywords), ingested_at: now }))
    .sort((a, b) => b.relevance_score - a.relevance_score || new Date(b.published_at) - new Date(a.published_at));

  const merged = [...fresh, ...currentInbox.items]
    .filter((item, index, arr) => arr.findIndex((x) => x.url === item.url) === index)
    .slice(0, 1000);

  await fs.writeFile(INBOX, JSON.stringify({ updated_at: now, new_items: fresh.length, items: merged }, null, 2) + '\n');
  await fs.writeFile(STATUS, JSON.stringify({
    status: errors.length ? 'warning' : 'ok',
    last_attempt: now,
    last_successful_update: now,
    newly_processed_articles: fresh.length,
    inbox_size: merged.length,
    source_errors: errors,
    message: errors.length ? 'Einige Quellen konnten nicht gelesen werden; vorhandene Daten bleiben verfügbar.' : 'TAIL Inbox erfolgreich aktualisiert.'
  }, null, 2) + '\n');

  console.log(`TAIL Inbox: ${fresh.length} neue Artikel, ${merged.length} gesamt, ${errors.length} Quellenfehler.`);
}

main().catch(async (error) => {
  await fs.writeFile(STATUS, JSON.stringify({
    status: 'error',
    last_attempt: now,
    last_successful_update: null,
    newly_processed_articles: 0,
    message: error.message
  }, null, 2) + '\n');
  console.error(error);
  process.exit(1);
});
