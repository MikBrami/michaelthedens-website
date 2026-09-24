import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createBoundedReviewer} from './bounded-review.mjs';

const endpoint='https://api.openai.com/v1/responses';
const options = input => ({method:'POST',body:JSON.stringify({model:'gpt-5-mini',input})});
async function setup(t, fetchImpl) {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'tail-cost-test-'));
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const auditPath=path.join(dir,'usage.jsonl');
  return {auditPath,request:createBoundedReviewer({cacheDir:path.join(dir,'cache'),auditPath,fetchImpl})};
}
test('Pilot enforces four attempts, bounded tools/output and exact response reuse',async t=>{
  let calls=0;
  const {request}=await setup(t,async (_,o)=>{
    calls++;const b=JSON.parse(o.body);
    assert.equal(b.max_tool_calls,2);assert.equal(b.max_output_tokens,4000);
    return {ok:true,json:async()=>({id:`r${calls}`,status:'completed',output:[],usage:{input_tokens:10,output_tokens:5}})};
  });
  const control={deadline:Date.now()+600000};
  assert.equal((await request(endpoint,options('a'),control)).id,'r1');
  assert.equal((await request(endpoint,options('a'),control)).id,'r1');
  await request(endpoint,options('b'),control);
  await request(endpoint,options('c'),control);
  await request(endpoint,options('d'),control);
  await assert.rejects(request(endpoint,options('e'),control),/budget exhausted/);
  assert.equal(calls,4);
});
test('Daily estimated spend stops paid requests before the next call',async t=>{
  let calls=0;
  const {request,auditPath}=await setup(t,async()=>{calls++;return {ok:true,json:async()=>({id:'r',status:'completed',output:[],usage:{input_tokens:10,output_tokens:5}})};});
  const today=new Date().toISOString();
  await fs.writeFile(auditPath,JSON.stringify({at:today,key:'earlier',status:'completed',startedAt:today,estimatedCostUsd:0.45})+'\n');
  await assert.rejects(request(endpoint,options('new'),{deadline:Date.now()+600000}),/estimated API budget exhausted/);
  assert.equal(calls,0);
});
test('A timeout is recorded as unknown cost and never automatically repeated',async t=>{
  let calls=0;
  const {request,auditPath}=await setup(t,async()=>{calls++;throw new DOMException('timeout','TimeoutError');});
  const control={deadline:Date.now()+600000};
  await assert.rejects(request(endpoint,options('a'),control),/timeout/);
  await assert.rejects(request(endpoint,options('a'),control),/retry blocked/);
  assert.equal(calls,1);
  assert.match(await fs.readFile(auditPath,'utf8'),/"usageUnknown":true/);
});
test('Oversized inputs and insufficient remaining time never call the API',async t=>{
  let calls=0;
  const {request}=await setup(t,async()=>{calls++;throw Error('unexpected');});
  await assert.rejects(request(endpoint,options('a'.repeat(200001)),{deadline:Date.now()+600000}),/input budget/);
  await assert.rejects(request(endpoint,options('a'),{deadline:Date.now()+1000}),/Insufficient time/);
  assert.equal(calls,0);
});
test('Incomplete responses keep usage and cached results instead of spending again',async t=>{
  let calls=0;
  const {request,auditPath}=await setup(t,async()=>{calls++;return {ok:true,json:async()=>({id:'incomplete',status:'incomplete',usage:{output_tokens:4000},output:[{type:'web_search_call'}]})};});
  const control={deadline:Date.now()+600000};
  await request(endpoint,options('a'),control);
  await request(endpoint,options('a'),control);
  assert.equal(calls,1);
  assert.match(await fs.readFile(auditPath,'utf8'),/"webToolCalls":1/);
});
