import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const sourcePath = path.resolve(root, '..', 'public-tail', 'data.json');
const tempPath = `${sourcePath}.de.tmp`;
const model = process.env.OPENAI_TRANSLATION_MODEL || 'gpt-5-mini';

const readJson = (filePath, fallback = null) => {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
};

const germanResidue = /\b(?:the|and|with|from|ahead|report|faces|using|close to|beyond|surges|target|patent fight|returns could lift)\b/i;

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['signals'],
  properties: {
    signals: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'summary'],
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' }
        }
      }
    }
  }
};

async function requestEditorial(signals) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      instructions: [
        'Du bist die deutsche Redaktion von MT·AI Lighthouse, einer Publikation für Memory, Storage, Halbleiter und AI-Infrastruktur.',
        'Redigiere ausschließlich Titel und Kurztext in präzises, natürliches Deutsch.',
        'Keine wortwörtliche Maschinenübersetzung. Formuliere wie eine kurze professionelle Wirtschafts- oder Technologie-Nachricht.',
        'Erhalte Bedeutung, Unsicherheit, Zahlen, Firmen-, Produkt- und Markennamen exakt.',
        'Füge keine Fakten, Zahlen, Quellen oder Bewertungen hinzu.',
        'Entferne Publisher-Suffixe aus Überschriften, wenn sie nur die Quelle wiederholen.',
        'Fachbegriffe wie HBM4, DRAM, NAND, Enterprise SSD, Yield, AI, Datacenter, GPU, Capex und Foundry dürfen auf Englisch bleiben, wenn das im Deutschen üblich ist.',
        'Gib exakt gleich viele Signale und in identischer Reihenfolge zurück.'
      ].join(' '),
      input: JSON.stringify({ signals: signals.map(({ title, summary }) => ({ title, summary })) }),
      text: { format: { type: 'json_schema', name: 'mtai_german_news_editorial', strict: true, schema } }
    })
  });

  if (!response.ok) throw new Error(`OpenAI German editorial request failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
  const result = await response.json();
  const outputText = result.output_text || (result.output || []).flatMap((item) => item.content || []).find((part) => part.type === 'output_text')?.text;
  if (!outputText) throw new Error('OpenAI German editorial response contains no output text');
  return JSON.parse(outputText);
}

async function main() {
  const source = readJson(sourcePath);
  if (!source || !Array.isArray(source.signals)) throw new Error('public-tail/data.json missing or invalid');

  const newsIndexes = source.signals
    .map((signal, index) => ({ signal, index }))
    .filter(({ signal }) => signal.layer === 'news');

  if (!newsIndexes.length) {
    console.log('German public editorial: no public news cards to translate.');
    return;
  }

  // Preserve the publisher/original-language wording for the English homepage.
  const originalSignals = source.signals.map((signal) => ({ ...signal }));

  if (!process.env.OPENAI_API_KEY) {
    console.warn('::warning::OPENAI_API_KEY is not configured; German public news keeps original wording for this run.');
    source.originalSignals = originalSignals;
    fs.writeFileSync(sourcePath, JSON.stringify(source, null, 2) + '\n');
    return;
  }

  const editorial = await requestEditorial(newsIndexes.map(({ signal }) => signal));
  if (!Array.isArray(editorial.signals) || editorial.signals.length !== newsIndexes.length) {
    throw new Error('German public editorial returned an invalid signal count');
  }

  newsIndexes.forEach(({ index }, editorialIndex) => {
    const translated = editorial.signals[editorialIndex];
    if (!translated?.title?.trim() || !translated?.summary?.trim()) throw new Error(`German public editorial signal ${editorialIndex + 1} incomplete`);
    source.signals[index] = {
      ...source.signals[index],
      title: translated.title.trim(),
      summary: translated.summary.trim()
    };
  });

  source.originalSignals = originalSignals;
  source.editorial = {
    ...(source.editorial || {}),
    germanNews: {
      language: 'de-DE',
      model,
      mode: 'editorial_translation',
      generatedAt: new Date().toISOString()
    }
  };

  fs.writeFileSync(tempPath, JSON.stringify(source, null, 2) + '\n');
  JSON.parse(fs.readFileSync(tempPath, 'utf8'));
  fs.renameSync(tempPath, sourcePath);
  const suspicious = source.signals.filter((signal) => signal.layer === 'news' && germanResidue.test(`${signal.title} ${signal.summary}`));
  if (suspicious.length) console.warn(`::warning::German public editorial may contain English residue in ${suspicious.length} card(s).`);
  console.log(`German public editorial: translated ${newsIndexes.length} news cards with ${model}; originals preserved for EN.`);
}

main().catch((error) => {
  try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
  console.error(error);
  process.exit(1);
});
