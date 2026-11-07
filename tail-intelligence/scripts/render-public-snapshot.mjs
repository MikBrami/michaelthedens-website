import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('../../',import.meta.url));
const escape = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
for (const [page,data,en] of [['index.html','data.json',false],['en/index.html','data-en.json',true]]) {
  const snapshot = JSON.parse(fs.readFileSync(path.join(root,'public-tail',data),'utf8'));
  const p = snapshot.platform, pulse = snapshot.executivePulse;
  let html = fs.readFileSync(path.join(root,page),'utf8');
  const review = p.admissionReview || {};
  const excluded = Number(review.historicalCandidatesSkipped || 0);
  const freshness = en
    ? `Calculated ${p.analysisAsOf || p.dataAsOf} · latest index evidence ${p.indexEvidenceAsOf || p.sourceDataAsOf || 'unknown'} · ${review.pending ?? '–'} pending${excluded ? ` · ${excluded} older candidates excluded` : ''}`
    : `Berechnet ${p.analysisAsOf || p.dataAsOf} · jüngste Index-Evidenz ${p.indexEvidenceAsOf || p.sourceDataAsOf || 'unbekannt'} · ${review.pending ?? '–'} offen${excluded ? ` · ${excluded} ältere Kandidaten ausgenommen` : ''}`;
  const replaceText = (id,text) => { html=html.replace(new RegExp(`(<[^>]+id="${id}"[^>]*>)[\\s\\S]*?(<\\/[^>]+>)`),(_,a,b)=>a+escape(text)+b); };
  replaceText('tail-index',Number.isFinite(pulse.current)?pulse.current:'–');
  replaceText('index-summary',pulse.interpretation);
  replaceText('freshness-text',freshness);
  replaceText('signal-freshness',en ? `News published ${snapshot.signals.map(s=>s.date).sort().at(-1)||'unknown'}` : `Nachrichtenstand ${snapshot.signals.map(s=>s.date).sort().at(-1)||'unbekannt'}`);
  replaceText('index-label',p.admissionReview?.status === 'complete' ? (en?'REVIEWED':'GEPRÜFT') : (en?'REVIEW PENDING':'PRÜFUNG OFFEN'));
  // The HTML includes a dated snapshot for crawlers; JS refreshes the same source.
  fs.writeFileSync(path.join(root,page),html);
}
console.log('Public HTML now includes dated DE/EN numeric snapshots.');
