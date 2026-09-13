import fs from 'node:fs';
let state;
try { state=JSON.parse(fs.readFileSync(new URL('../data/admission-status.json',import.meta.url),'utf8')); } catch (e) { if(e.code!=='ENOENT')throw e; }
console.log(`run=${process.env.TAIL_IS_CATCHUP !== 'true' || !state || state.pending > 48}`);
