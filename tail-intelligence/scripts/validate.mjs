import fs from 'node:fs';

const requiredArticleFields = ['id','date','title','category','markets','severity','confidence','signal','summary','tail_analysis'];
const articles = JSON.parse(fs.readFileSync('data/articles.json','utf8'));
const dashboard = JSON.parse(fs.readFileSync('data/dashboard.json','utf8'));

if (!Array.isArray(articles) || articles.length === 0) throw new Error('No articles available');
for (const [i,a] of articles.entries()) {
  for (const field of requiredArticleFields) if (a[field] === undefined) throw new Error(`Article ${i} missing ${field}`);
  if (a.severity < 0 || a.severity > 100 || a.confidence < 0 || a.confidence > 100) throw new Error(`Article ${a.id} has invalid score`);
}
if (dashboard.processStatus !== 'ok') throw new Error(`Dashboard process status is ${dashboard.processStatus}`);
if (!dashboard.lastSuccessfulUpdate || !dashboard.dataAsOf) throw new Error('Dashboard timestamps missing');
if (dashboard.totalArticles !== articles.length) throw new Error('Article count mismatch');
if (dashboard.tailIndex < 0 || dashboard.tailIndex > 100) throw new Error('TAIL index out of range');
if (!Array.isArray(dashboard.markets) || dashboard.markets.length < 4) throw new Error('Market indicators incomplete');
console.log(`Validation OK: ${articles.length} articles, ${dashboard.markets.length} markets, index ${dashboard.tailIndex}`);
