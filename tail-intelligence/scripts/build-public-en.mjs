import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(process.cwd());
const sourcePath = path.resolve(root, '..', 'public-tail', 'data.json');
const outputPath = path.resolve(root, '..', 'public-tail', 'data-en.json');
const tempPath = `${outputPath}.tmp`;
const model = process.env.OPENAI_TRANSLATION_MODEL || 'gpt-5-mini';
const EDITORIAL_VERSION = 3;

const readJson = (filePath, fallback = null) => {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
};

const stableSource = (snapshot) => ({
  platform: snapshot.platform,
  executivePulse: snapshot.executivePulse,
  signals: snapshot.signals,
  catalysts: snapshot.catalysts
});

const sourceHash = (snapshot) => crypto
  .createHash('sha256')
  .update(JSON.stringify(stableSource(snapshot)))
  .digest('hex')
  .slice(0, 24);

const numbersIn = (text = '') => String(text).match(/\d+(?:[.,]\d+)?/g) || [];
const normaliseNumber = (value) => String(value).replace(',', '.').replace(/^0+(?=\d)/, '');
const germanResidue = /[äöüß]|\b(?:und|oder|prüfen|testet|ob|wieder|haben|transaktion|strategie|bericht|zugang|öffentlichen|normalisierung|risiko|deal-wahrscheinlichkeit|kapitalzugang)\b/i;

function assertNoInventedNumbers(sourceText, translatedText, label) {
  const allowed = new Set(numbersIn(sourceText).map(normaliseNumber));
  const produced = numbersIn(translatedText).map(normaliseNumber);
  const invented = produced.filter((value) => !allowed.has(value));
  if (invented.length) throw new Error(`${label} introduced unsupported number(s): ${invented.join(', ')}`);
}

function assertEnglish(text, label) {
  if (germanResidue.test(String(text))) throw new Error(`${label} still contains German wording`);
}

function validateEditorial(source, editorial) {
  if (!editorial || typeof editorial !== 'object') throw new Error('English editorial response is not an object');
  if (!editorial.executivePulse?.interpretation) throw new Error('English executive interpretation missing');
  if (!Array.isArray(editorial.signals) || editorial.signals.length !== source.signals.length) {
    throw new Error(`English signals count mismatch: expected ${source.signals.length}, got ${editorial.signals?.length ?? 0}`);
  }
  if (!Array.isArray(editorial.catalysts) || editorial.catalysts.length !== source.catalysts.length) {
    throw new Error(`English catalysts count mismatch: expected ${source.catalysts.length}, got ${editorial.catalysts?.length ?? 0}`);
  }

  assertNoInventedNumbers(source.executivePulse?.interpretation, editorial.executivePulse.interpretation, 'Executive Pulse');
  assertEnglish(editorial.executivePulse.interpretation, 'Executive Pulse');
  source.signals.forEach((signal, index) => {
    const translated = editorial.signals[index];
    if (![translated?.title, translated?.summary, translated?.analysis].every((value) => typeof value === 'string' && value.trim())) {
      throw new Error(`English signal ${index + 1} is incomplete`);
    }
    assertNoInventedNumbers(signal.title, translated.title, `Signal ${index + 1} title`);
    assertNoInventedNumbers(signal.summary, translated.summary, `Signal ${index + 1} summary`);
    assertNoInventedNumbers(signal.analysis, translated.analysis, `Signal ${index + 1} analysis`);
    assertEnglish(`${translated.title} ${translated.summary} ${translated.analysis}`, `Signal ${index + 1}`);
  });
  source.catalysts.forEach((catalyst, index) => {
    const translated = editorial.catalysts[index];
    if (typeof translated?.event !== 'string' || !translated.event.trim()) throw new Error(`English catalyst ${index + 1} is incomplete`);
    assertNoInventedNumbers(catalyst.event, translated.event, `Catalyst ${index + 1}`);
    assertEnglish(translated.event, `Catalyst ${index + 1}`);
  });
}

function buildSnapshot(source, editorial) {
  return {
    schemaVersion: source.schemaVersion,
    generatedAt: new Date().toISOString(),
    editorial: {
      version: EDITORIAL_VERSION,
      language: 'en-GB',
      sourceLanguage: 'de-DE',
      sourceHash: sourceHash(source),
      model,
      mode: 'editorial_translation'
    },
    platform: {
      ...source.platform,
      markets: (source.platform?.markets || []).map((market) => ({ ...market }))
    },
    executivePulse: {
      ...source.executivePulse,
      interpretation: editorial.executivePulse.interpretation.trim()
    },
    signals: source.signals.map((signal, index) => ({
      ...signal,
      title: editorial.signals[index].title.trim(),
      summary: editorial.signals[index].summary.trim(),
      analysis: editorial.signals[index].analysis.trim()
    })),
    catalysts: source.catalysts.map((catalyst, index) => ({
      ...catalyst,
      event: editorial.catalysts[index].event.trim()
    }))
  };
}

function validateSnapshot(source, translated) {
  if (translated.schemaVersion !== source.schemaVersion) throw new Error('English schema version differs from German master');
  if (translated.platform?.dataAsOf !== source.platform?.dataAsOf) throw new Error('English dataAsOf differs from German master');
  if (translated.platform?.articleCount !== source.platform?.articleCount) throw new Error('English article count differs from German master');
  if (translated.executivePulse?.current !== source.executivePulse?.current) throw new Error('English Executive Pulse score differs from German master');
  if (translated.executivePulse?.status !== source.executivePulse?.status) throw new Error('English Executive Pulse status differs from German master');
  if (JSON.stringify(translated.platform?.markets) !== JSON.stringify(source.platform?.markets)) throw new Error('English market metrics differ from German master');
  translated.signals.forEach((signal, index) => {
    const sourceSignal = source.signals[index];
    if (signal.date !== sourceSignal.date || signal.score !== sourceSignal.score) throw new Error(`English signal ${index + 1} changed immutable fields`);
  });
  translated.catalysts.forEach((catalyst, index) => {
    if (catalyst.date !== source.catalysts[index].date) throw new Error(`English catalyst ${index + 1} changed its date`);
  });
}

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['executivePulse', 'signals', 'catalysts'],
  properties: {
    executivePulse: {
      type: 'object', additionalProperties: false, required: ['interpretation'],
      properties: { interpretation: { type: 'string' } }
    },
    signals: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['title', 'summary', 'analysis'],
        properties: { title: { type: 'string' }, summary: { type: 'string' }, analysis: { type: 'string' } }
      }
    },
    catalysts: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['event'],
        properties: { event: { type: 'string' } }
      }
    }
  }
};

function editorialInputFor(source) {
  return {
    executivePulse: { interpretation: source.executivePulse?.interpretation || '' },
    signals: source.signals.map(({ title, summary, analysis }) => ({ title, summary, analysis })),
    catalysts: source.catalysts.map(({ event }) => ({ event }))
  };
}

async function requestEditorial(input, repair = false) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      instructions: [
        'You are the English editorial desk for MT·AI Lighthouse, an AI infrastructure and semiconductor intelligence publication.',
        repair ? 'This is a repair pass. The previous output contained untranslated German. Rewrite ALL fields again and remove every German word or phrase.' : 'Rewrite every supplied text field into concise, publication-quality British English.',
        'Every catalyst event must be completely English even when the source mixes German and English industry terminology.',
        'Do not leave German words, German grammar or untranslated German phrases in the output.',
        'Preserve the exact meaning, factual claims, company names, product names, dates, figures, units and uncertainty.',
        'Do not add facts, explanations, numbers, sources, forecasts or interpretations that are not present in the input.',
        'Do not translate brand names. Prefer data centre, programme, prioritisation and other British spellings where natural.',
        'Keep headlines sharp and analytical. Keep analysis in the style of a professional intelligence brief, not marketing copy.',
        'Return exactly the same number of signals and catalysts, in exactly the same order.'
      ].join(' '),
      input: JSON.stringify(input),
      text: {
        format: {
          type: 'json_schema',
          name: 'mtai_english_editorial',
          strict: true,
          schema
        }
      }
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI editorial request failed (${response.status}): ${detail.slice(0, 400)}`);
  }

  const result = await response.json();
  const outputText = result.output_text || (result.output || [])
    .flatMap((item) => item.content || [])
    .find((part) => part.type === 'output_text')?.text;
  if (!outputText) throw new Error('OpenAI editorial response contains no output text');
  return JSON.parse(outputText);
}

async function translateWithOpenAI(source) {
  const input = editorialInputFor(source);
  let editorial = await requestEditorial(input, false);
  try {
    validateEditorial(source, editorial);
    return editorial;
  } catch (error) {
    if (!String(error.message).includes('still contains German wording')) throw error;
    console.warn(`::warning::English editorial first pass needs repair: ${error.message}`);
    editorial = await requestEditorial(input, true);
    validateEditorial(source, editorial);
    return editorial;
  }
}

async function main() {
  const source = readJson(sourcePath);
  if (!source?.platform || !Array.isArray(source.signals) || !Array.isArray(source.catalysts)) {
    throw new Error('German public snapshot is missing or invalid');
  }

  const hash = sourceHash(source);
  const previous = readJson(outputPath);
  if (previous?.editorial?.sourceHash === hash && previous?.editorial?.version === EDITORIAL_VERSION) {
    console.log(`English public snapshot already matches source ${hash} at editorial version ${EDITORIAL_VERSION}; no API call needed.`);
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.warn('::warning::OPENAI_API_KEY is not configured. Keeping the last valid English public snapshot.');
    return;
  }

  try {
    const editorial = await translateWithOpenAI(source);
    const translated = buildSnapshot(source, editorial);
    validateSnapshot(source, translated);
    fs.writeFileSync(tempPath, JSON.stringify(translated, null, 2) + '\n');
    JSON.parse(fs.readFileSync(tempPath, 'utf8'));
    fs.renameSync(tempPath, outputPath);
    console.log(`Built English public snapshot v${EDITORIAL_VERSION} from ${hash} with ${model}: ${translated.signals.length} signals, ${translated.catalysts.length} catalysts.`);
  } catch (error) {
    try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
    console.warn(`::warning::English editorial build failed; preserving last valid snapshot. ${error.message}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
