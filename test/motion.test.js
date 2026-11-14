import test from 'node:test';
import assert from 'node:assert/strict';
import { actorPose } from '../public/presentation/motion.js';

test('V06: wind-up precedes contact, recovery returns to rest, death stays visible',()=>{
  const wind=actorPose(.15,{attacking:true}),hit=actorPose(.48,{attacking:true}),rest=actorPose(1,{attacking:true});
  assert.ok(wind.advance<0);assert.ok(hit.advance>0);
  assert.equal(rest.advance,0);assert.equal(rest.scaleX,1);assert.equal(rest.scaleY,1);
  const death=actorPose(1,{dying:true});assert.equal(death.opacity,.18);assert.ok(death.drop>0);
});
test('V06: reduced motion preserves readable death opacity without movement',()=>{
  for(const progress of [0,.15,.48,.65,1]){
    const pose=actorPose(progress,{attacking:true,hit:true,dying:true,reducedMotion:true});
    assert.equal(pose.advance,0);assert.equal(pose.recoil,0);assert.equal(pose.drop,0);assert.equal(pose.rotation,0);
    assert.equal(pose.scaleX,1);assert.equal(pose.scaleY,1);
  }
  assert.equal(actorPose(1,{dying:true,reducedMotion:true}).opacity,.18);
});
