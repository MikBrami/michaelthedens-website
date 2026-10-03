import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {admissionState,eligibleCandidates,reviewKey,validateReview} from './admission-review.mjs';
import {calculateIndexModel} from './index-model.mjs';
const methodology=JSON.parse(fs.readFileSync('config/methodology.json'));
const asOf='2026-09-13T12:00:00Z';
const item={id:'candidate',title:'New qualified shipments',content_hash:'v1',relevance_score:90,published_at:'2026-09-12T10:00:00Z'};
const proposal={decision:'accepted',title:item.title,eventDate:'2026-09-12',nextReview:'2026-09-20',fact:'Qualified supplier shipments rose 10% in the named product basket.',placement:'Enterprise SSD / Europe / Market Layer / current quarter.',mechanism:'Verified qualified shipments improve availability for that product basket.',predictionId:'OUTLOOK-enterprise_ssd',predictionImpact:'Challenges the current availability assumption for this product basket.',falsifier:'Supplier withdraws the named qualified delivery schedule by review date.',novelty:'First confirmed shipment increase compared with the supplied baseline.',evidenceStatus:'VERIFIED DATA',classification:'Signal',scoreBreakdown:{sourceQuality:20,novelty:15,thesisRelevance:20,forecastImpact:15,falsifiability:15,timeSensitivity:10},markets:['enterprise_ssd'],driverScope:['availability'],signal:'verified_supply_relief',severity:70,confidence:90,indexImpact:true,indexEvidence:{metricType:'qualified_shipments',marketId:'enterprise_ssd',observation:'Qualified enterprise SSD shipments increased 10 percent.'},redPencilPass:true,sources:[{url:'https://supplier.example/news/shipments',label:'Supplier',kind:'primary',supports:'Confirmed product shipments'}]};
const context={item,methodology,forecastIds:new Set(['OUTLOOK-enterprise_ssd']),sourceUrls:new Set(['https://supplier.example/news/shipments']),asOf,knownArticles:[]};
test('Unreviewed news cannot establish no material change',()=>{assert.equal(admissionState([item],[],{asOf,inboxUpdatedAt:asOf}).status,'pending');assert.equal(admissionState([],[],{asOf,inboxUpdatedAt:null}).status,'pending');});
test('Missing retrieval, invalid forecast and uncertain evidence block admission',()=>{assert.equal(validateReview(proposal,{...context,sourceUrls:new Set()}).decision,'watchlist');for(const change of [{predictionId:'invented'},{evidenceStatus:'MODEL ESTIMATE'},{eventDate:'2026-10-01'},{scoreBreakdown:{}}])assert.equal(validateReview({...proposal,...change},context).decision,'watchlist');});
test('Verified scoped observation preserves separate event/admission dates',()=>{const r=validateReview(proposal,context);assert.equal(r.decision,'accepted');assert.equal(r.acceptedSignal.date,'2026-09-12');assert.equal(r.acceptedSignal.admittedAt,asOf);assert.equal(r.priorityScore,95);assert.equal(admissionState([item],[r],{asOf,inboxUpdatedAt:asOf}).status,'complete');});
test('Duplicate observation cannot inflate evidence',()=>{assert.notEqual(validateReview(proposal,{...context,knownArticles:[{url:proposal.sources[0].url,date:proposal.eventDate,signal:proposal.signal}]}).decision,'accepted');});
test('Missing/future dates and duplicate headlines are not fresh evidence',()=>{assert.equal(eligibleCandidates([item,{...item,id:'copy'},{...item,id:'future',title:'future',published_at:'2026-12-01'},{...item,id:'undated',title:'undated',published_at:null}],asOf).length,1);assert.notEqual(reviewKey(item),reviewKey({...item,content_hash:'v2'}));});
test('Silence does not lower operational floor; explicit supersession does',()=>{const old={id:'old',date:'2026-08-01',market:'enterprise_ssd',driver:'availability',state:'severely_restricted',confidence:90,halfLifeDays:14,sourceType:'operational_channel_observation'};const calc=(indicators,date)=>calculateIndexModel([],methodology,{asOf:date,operationalIndicators:indicators}).markets.find(m=>m.id==='enterprise_ssd').drivers.find(d=>d.id==='availability');const fresh=calc([old],'2026-08-01'),stale=calc([old],'2026-09-13');assert.equal(fresh.score,stale.score);assert.ok(stale.confidence<fresh.confidence);assert.ok(calc([{...old,supersededBy:'new'},{...old,id:'new',date:'2026-09-13',state:'normal'}],'2026-09-13').score<stale.score);assert.equal(calc([{...old,supersededBy:'missing'}],'2026-09-13').score,stale.score);});
test('Admitted price evidence moves the model without changing weights',()=>{const base=JSON.parse(fs.readFileSync('data/articles.json')).filter(a=>!methodology.signalOverrides?.[a.id]?.excludedFromScores);const operationalIndicators=JSON.parse(fs.readFileSync('data/operational-indicators.json')).indicators;const options={asOf:'2026-09-13',operationalIndicators};const before=calculateIndexModel(base,methodology,options);const after=calculateIndexModel([...base,{id:'new-price',date:'2026-09-13',title:'Verified price decrease',summary:'Same basket',signal:'price_down',severity:100,confidence:100,markets:['server_dram'],driverScope:['pricing']}],methodology,options);assert.ok(after.executiveScore<before.executiveScore);assert.deepEqual(methodology.indexModel.executiveMarketWeights,{server_dram:0.4,hbm:0.3,enterprise_ssd:0.3});});

test("Fractional confidence and unmeasured index effects stay on watchlist",()=>{for(const change of [{confidence:0.8},{indexEvidence:{metricType:"none",marketId:"enterprise_ssd",observation:"Aggregate market share"}}])assert.equal(validateReview({...proposal,...change},context).decision,"watchlist");});
test("Same source and event cannot be readmitted with opposite direction",()=>{assert.equal(validateReview({...proposal,signal:"negative_supply"},{...context,knownArticles:[{url:proposal.sources[0].url,date:proposal.eventDate,signal:"verified_supply_relief"}]}).decision,"watchlist");});

test("Aggregate market share may inform outlook but cannot move the index",()=>{const r=validateReview({...proposal,indexEvidence:{metricType:"qualified_shipments",marketId:"enterprise_ssd",observation:"Global NAND Bit-Anteil 14 Prozent in Q2 2026."}},context);assert.equal(r.decision,"accepted");assert.equal(r.acceptedSignal.indexImpact,false);});

import {triageCandidates,selectForReview} from './triage-inbox.mjs';
test('Triage archives explicit investment opinion but preserves operating news',()=>{
 const items=[{...item,id:'a',title:'Is Micron stock the next Nvidia? Buy now'},{...item,id:'b',title:'Micron stock rises after earnings report details capacity expansion'}];
 const t=triageCandidates(items);assert.equal(t.archivedOpinions,1);assert.equal(t.representatives[0].id,'b');
});
test('Free prefilter removes noise and clusters paraphrased cross-publisher duplicates',()=>{
 const base={...item,id:'m1',relevance_score:92,title:'Micron raises server DRAM contract prices 20 percent as allocation tightens',summary:'Supplier pricing and allocation update for RDIMM customers.',source_name:'Source A'};
 const duplicate={...base,id:'m2',title:'Server DRAM prices jump 20 percent as Micron tightens RDIMM supply',summary:'Micron contract pricing and allocation are tighter.',source_name:'Source B'};
 const generic={...item,id:'n1',relevance_score:78,title:'Nvidia weekly news roundup',summary:'A collection of product and market headlines.'};
 const weak={...item,id:'n2',relevance_score:70,title:'Samsung discusses AI chips',summary:'General company commentary.'};
 const t=triageCandidates([base,duplicate,generic,weak]);
 assert.equal(t.groupedDuplicates,1);
 assert.equal(t.archivedGenericNews,1);
 assert.equal(t.archivedLowRelevance,1);
 assert.equal(t.representatives.length,1);
});
test('Free triage keeps measurable memory events despite a modest relevance score',()=>{
 const headlines=[
  'CXMT G5 DRAM Enters Mass Production with 50% Higher Dies Per Wafer',
  'Micron demonstrates 512GB DDR5 module for AI servers',
  'Samsung to Double HBM4 Output Next Year, Sources Say',
  'YMTC wins patent battle against Micron'
 ];
 const candidates=headlines.map((title,i)=>({...item,id:`event-${i}`,title,relevance_score:i===2||i===3?83:69}));
 const eligible=eligibleCandidates(candidates,asOf);
 const triaged=triageCandidates(eligible);
 assert.equal(eligible.length,4);
 assert.equal(triaged.representatives.length,4);
});
test('Headline grouping preserves opposing direction and distinct quantities',()=>{
 const base={...item,title:'Samsung increases qualified HBM shipments to Nvidia by 20 percent'};
 const same={...base,id:'b',title:base.title+' — News'};
 const opposite={...base,id:'c',title:base.title.replace('increases','cuts')};
 const quantity={...base,id:'d',title:base.title.replace('20','30')};
 const t=triageCandidates([base,same,opposite,quantity]);assert.equal(t.groupedDuplicates,1);assert.equal(t.representatives.length,3);
 const again=triageCandidates([base,same],[{candidateKey:reviewKey(base),decision:'accepted'}]);assert.equal(again.groupedDuplicates,1);
});
test('Catch-up selection reserves room for both oldest and newest evidence',()=>{
 const p=Array.from({length:10},(_,i)=>({...item,id:String(i),published_at:`2026-09-${String(i+1).padStart(2,'0')}T00:00:00Z`}));
 const selected=selectForReview(p,4);assert.deepEqual(new Set(selected.map(c=>c.id)),new Set(['9','8','0','1']));
});

import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
test('Bounded pilot admits shared observations only once and persists partial progress',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mtai-admission-'));
 try {
  for(const folder of ['scripts','data','config'])fs.mkdirSync(path.join(root,folder));
  for(const file of ['review-inbox.mjs','admission-review.mjs','triage-inbox.mjs','analyst-request.mjs','bounded-review.mjs'])fs.copyFileSync('scripts/'+file,path.join(root,'scripts',file));
  const put=(file,data)=>fs.writeFileSync(path.join(root,file),JSON.stringify(data));
  put('data/inbox.json',{updated_at:new Date().toISOString(),items:Array.from({length:2},(_,i)=>({...item,id:'candidate'+i,title:'Qualified shipments batch '+i,published_at:new Date().toISOString()}))});
  put('config/methodology.json',methodology);put('data/articles.json',[]);put('config/market-outlook.json',{outlooks:[{marketId:'enterprise_ssd',view:'Supply remains tight',changeRules:'Qualified supply improves'}]});
  const day=new Date().toISOString().slice(0,10),future=new Date(Date.now()+86400000*7).toISOString().slice(0,10);
  const fixture={...proposal,eventDate:day,nextReview:future};
  fs.writeFileSync(path.join(root,'mock.mjs'),`const fixture=${JSON.stringify(fixture)}; globalThis.fetch=async (_url,options)=>{const request=JSON.parse(options.body), input=JSON.parse(request.input);if(input.candidates.length!==1)throw new Error('Expected one candidate per request');await new Promise(r=>setTimeout(r,20));return {ok:true,json:async()=>({id:'mock',status:process.env.MOCK_PARTIAL_FAILURE && input.candidates[0].id==='candidate1'?'failed':'completed',output:[{type:'web_search_call',action:{sources:[{url:fixture.sources[0].url}]}},{content:[{type:'output_text',text:JSON.stringify({reviews:Object.fromEntries(input.candidates.map(c=>[c.id,{...fixture,candidateId:'ignored-model-id'}]))})}]}]})};};`);
  execFileSync(process.execPath,['--import',path.join(root,'mock.mjs'),path.join(root,'scripts/review-inbox.mjs')],{env:{...process.env,OPENAI_API_KEY:'mock-only',TAIL_PAID_REVIEW:'pilot',TAIL_REVIEW_LIMIT:'8',TAIL_REVIEW_CONCURRENCY:'2'},stdio:'pipe'});
  const read=file=>JSON.parse(fs.readFileSync(path.join(root,'data',file)));
  assert.equal(read('admission-status.json').reviewed,2);assert.ok(read('admission-reviews.json').reviews.every(r=>r.candidateId.startsWith('candidate')));assert.equal(read('admission-status.json').accepted,1);assert.equal(read('admission-status.json').lastRun.concurrency,1);
  assert.equal(read('admission-backlog.json').items.length,2);assert.equal(read('admission-reviews.json').reviews.length,2);
  put('data/admission-reviews.json',{schemaVersion:1,reviews:[]});
  fs.rmSync(path.join(root,'data/review-cache'),{recursive:true,force:true});
  const summary=path.join(root,'summary.md');
  execFileSync(process.execPath,['--import',path.join(root,'mock.mjs'),path.join(root,'scripts/review-inbox.mjs')],{env:{...process.env,OPENAI_API_KEY:'mock-only',TAIL_PAID_REVIEW:'pilot',TAIL_REVIEW_LIMIT:'8',TAIL_REVIEW_CONCURRENCY:'2',MOCK_PARTIAL_FAILURE:'1',GITHUB_STEP_SUMMARY:summary},stdio:'pipe'});
  const partial=read('admission-status.json');
  assert.equal(partial.status,'error');assert.equal(partial.reviewed,1);assert.equal(partial.pending,1);
  assert.equal(read('admission-reviews.json').reviews.length,1);assert.equal(partial.lastRun.batchSize,1);
  assert.match(partial.batchErrors[0],/candidate1/);assert.match(fs.readFileSync(summary,'utf8'),/Status: error/);

 } finally {fs.rmSync(root,{recursive:true,force:true});}
});

import {analystRequest} from './analyst-request.mjs';
test('Rate limiting retries with provider delay; quota exhaustion does not retry',async()=>{
 let calls=0;const delays=[];const options={deadline:Date.now()+60000,wait:async ms=>delays.push(ms),fetchImpl:async()=>++calls===1?{ok:false,status:429,headers:{get:()=> '2'},json:async()=>({error:{code:'rate_limit_exceeded',message:'Rate limited'}})}:{ok:true}};
 assert.equal((await analystRequest('mock',{},options)).ok,true);assert.equal(calls,2);assert.deepEqual(delays,[2000]);
 calls=0;await assert.rejects(analystRequest('mock',{}, {...options,fetchImpl:async()=>{calls++;return {ok:false,status:429,json:async()=>({error:{code:'insufficient_quota'}})};}}),/insufficient_quota/);assert.equal(calls,1);
});

test('Timeout retries once with a fresh signal and includes response body reads',async()=>{
 for(const phase of ['fetch','body']) {
  let calls=0;const signals=[],retries=[];
  const result=await analystRequest('mock',{}, {deadline:Date.now()+600000,parseJson:true,wait:async()=>{},onRetry:r=>retries.push(r),fetchImpl:async(_url,options)=>{
   signals.push(options.signal);calls++;
   if(calls===1 && phase==='fetch')throw new DOMException('slow','TimeoutError');
   const thisCall=calls;
   return {ok:true,json:async()=>{if(thisCall===1)throw new DOMException('slow body','TimeoutError');return {status:'completed'};}};
  }});
  assert.equal(result.status,'completed');assert.equal(calls,2);assert.notEqual(signals[0],signals[1]);assert.equal(retries[0].code,'request_timeout');
 }
});
test('Persistent timeout is bounded and a short remaining budget prevents retry',async()=>{
 for(const budget of [600000,100000]) {
  let calls=0;
  await assert.rejects(analystRequest('mock',{}, {deadline:Date.now()+budget,wait:async()=>{},fetchImpl:async()=>{calls++;throw new DOMException('slow','TimeoutError');}}),/timed out/);
  assert.equal(calls,budget===600000?2:1);
 }
});
test('Malformed responses are not retried as timeouts',async()=>{
 let calls=0;
 await assert.rejects(analystRequest('mock',{}, {deadline:Date.now()+600000,parseJson:true,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>{throw new SyntaxError('bad JSON');}};}}),/bad JSON/);
 assert.equal(calls,1);
});
