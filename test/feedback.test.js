import test from 'node:test';
import assert from 'node:assert/strict';
import { feedbackPayload, createFeedbackSender } from '../public/feedback.js';
import { createSession, startRun } from '../public/core/run.js';

const input={kind:'bug',message:'После удара исчезла подсказка.',email:''};
const endpoint='https://formsubmit.co/ajax/1234567890abcdef1234567890abcdef';
test('F01: feedback validates bounded text and optional email without interpreting markup',()=>{
  for(const message of ['', 'коротко','a'.repeat(4001)])assert.throws(()=>feedbackPayload({...input,message}));
  assert.throws(()=>feedbackPayload({...input,email:'wrong address'}));
  assert.throws(()=>feedbackPayload({...input,kind:'unknown'}));
  const payload=feedbackPayload({...input,message:'  <script>hello</script>  ',email:' player@example.com '});
  assert.equal(payload.message,'<script>hello</script>');assert.equal(payload.email,'player@example.com');
  assert.match(payload._subject,/^\[Sparkfall Feedback\]/);
});
test('F01: no run data or profile leaves without the explicit report switch',()=>{
  const session=startRun(createSession(),'feedback-seed');session.profile.currency=99;
  const plain=feedbackPayload(input,session.run);
  assert.equal(plain.run_report,undefined);assert.equal(plain.email,undefined);
  const attached=feedbackPayload({...input,attachReport:true},session.run);
  const report=JSON.parse(attached.run_report);
  assert.equal(report.seed,'feedback-seed');assert.deepEqual(report.decisions,[]);
  assert.equal(report.profile,undefined);assert.equal(report.currency,undefined);assert.equal(report.battle,undefined);
  assert.equal(feedbackPayload({...input,attachReport:true}).run_report,undefined);
});
test('F01: oversized replay reports fail before a request can be sent',()=>{
  const session=startRun(createSession(),'large');session.run.history=[{type:'x',data:'x'.repeat(100001)}];
  assert.throws(()=>feedbackPayload({...input,attachReport:true},session.run),/отчёт/i);
});
test('F01: only explicit provider acceptance counts as success',async()=>{
  for(const body of [{success:false,message:'activation'},{success:'false'},{message:'ok'}]){
    const send=createFeedbackSender({endpoint,request:async()=>({ok:true,json:async()=>body})});
    await assert.rejects(send(feedbackPayload(input)));
  }
  const send=createFeedbackSender({endpoint,request:async(url,options)=>{
    assert.equal(url,endpoint);assert.equal(options.method,'POST');assert.equal(options.credentials,'omit');
    assert.equal(JSON.parse(options.body).message,input.message);
    return {ok:true,json:async()=>({success:'true'})};
  }});
  assert.equal((await send(feedbackPayload(input))).accepted,true);
});
test('F01: one pending request cannot send duplicate feedback',async()=>{
  let resolve,calls=0;
  const send=createFeedbackSender({endpoint,request:()=>{calls++;return new Promise(r=>resolve=r);}});
  const first=send(feedbackPayload(input));
  await assert.rejects(send(feedbackPayload(input)),/отправ/i);assert.equal(calls,1);
  resolve({ok:true,json:async()=>({success:true})});await first;
});
test('F01: network and server errors allow an explicit retry and never silently resend',async()=>{
  let calls=0;
  const send=createFeedbackSender({endpoint,request:async()=>{calls++;if(calls===1)throw new Error('network');return {ok:false,status:429};}});
  await assert.rejects(send(feedbackPayload(input)));assert.equal(calls,1);
  await assert.rejects(send(feedbackPayload(input)));assert.equal(calls,2);
  await assert.rejects(createFeedbackSender({endpoint:''})(feedbackPayload(input)),/настро/i);
});
