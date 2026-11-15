import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, playSwap, endRound, applyGroups } from '../public/core/battle.js';
import { legalMoves } from '../public/core/board.js';
import { frameDuration, buildTimeline, advanceElapsed } from '../public/presentation/timeline.js';
import { normalizeSettings, loadSettings, persistSettings } from '../public/presentation/settings.js';
import { combatLayout } from '../public/presentation/layout.js';
import { encodeSession } from '../public/core/save.js';

test('V05: the timeline interleaves match, impacts and falling before enemy responses',()=>{
  const before=createBattle('timing');before.actions=1;
  const after=playSwap(before,...legalMoves(before.board)[0]);
  const frames=buildTimeline(before,after);
  assert.equal(frames[0].kind,'swap');
  const match=frames.findIndex(f=>f.kind==='match');
  const effect=frames.findIndex(f=>f.kind==='effect');
  const fall=frames.findIndex(f=>f.kind==='fall');
  assert.ok(match<effect && effect<fall);
  const attack=frames.findIndex(f=>f.event?.type==='attack');
  assert.ok(attack>fall);
  const hit=frames[attack];
  assert.equal(hit.snapshot.player.hp,after.events.filter(e=>e.type==='attack').reduce((hp,e)=>hp-e.amount,70));
  assert.equal(frames.at(-1).kind,'settle');
});
test('V05: target-specific effects carry intermediate HP, never final HP for every hit',()=>{
  const before=createBattle('sequence',{enemyIds:['sentinel','collector','guardian']});
  const after=endRound(before);const hits=buildTimeline(before,after).filter(f=>f.event?.type==='attack');
  assert.deepEqual(hits.map(f=>f.event.source),[0,1,2]);
  assert.deepEqual(hits.map(f=>f.snapshot.player.hp),[68,65,62]);
  assert.deepEqual(JSON.parse(encodeSession(after)).presentation,[]);
});
test('V05: speed adjusts time, reduced motion stays readable and hidden time does not advance',()=>{
  const frame={kind:'effect',event:{type:'attack'}};
  const normal=frameDuration(frame,{speed:1});
  assert.ok(normal>=700);
  assert.equal(frameDuration(frame,{speed:.5}),normal*2);
  assert.equal(frameDuration(frame,{speed:2}),normal/2);
  assert.ok(frameDuration(frame,{speed:2,reducedMotion:true})>=250);
  assert.equal(advanceElapsed(200,800,{hidden:true}),200);
  assert.equal(advanceElapsed(200,16,{hidden:false}),216);
});
test('V05: settings validate and persist independently from run state',()=>{
  assert.deepEqual(normalizeSettings({speed:99,reducedMotion:'yes',sound:true}),{speed:1,reducedMotion:false,sound:true,language:'ru'});
  let stored;const storage={setItem:(k,v)=>{stored=v;},getItem:()=>stored};
  assert.equal(persistSettings(storage,{speed:.5,reducedMotion:true,sound:false}).ok,true);
  assert.equal(loadSettings(storage).speed,.5);
  assert.equal(loadSettings({getItem:()=>'{broken'}).speed,1);
});
test('V03: hero stays left, all enemies right, board below, targets remain at least 44px',()=>{
  for(const width of [329,345,375,700,753,1425])for(const count of [1,2,3]){
    const layout=combatLayout(width,900,count);
    assert.equal(layout.actors.length,count+1);
    for(let i=2;i<layout.actors.length;i++){
      const a=layout.actors[i-1],b=layout.actors[i];
      assert.ok(b.x-b.hudWidth/2>=a.x+a.hudWidth/2+2);
    }
    assert.ok(layout.actors.slice(1).every(a=>a.x>layout.actors[0].x));
    assert.ok(layout.board.y>layout.actors[0].y);
    assert.ok(layout.board.cell>=44);
    assert.ok(layout.board.x+layout.board.size<=width);
    if(width<=375)assert.ok(layout.height+160<=740);
  }
});

test('V05: chill becomes visible with its effect and is consumed on the enemy impact',()=>{
  const before=createBattle('cold-snapshot');
  const cold=applyGroups(before,[{type:'ice',indices:[0,1,2]}]);
  const frame=cold.presentation.find(f=>f.event?.type==='chill');
  assert.equal(frame?.snapshot.enemies[0].chill,1);
  const attack=endRound(cold).presentation.find(f=>f.event?.type==='attack');
  assert.equal(attack.snapshot.enemies[0].chill,0);
  assert.equal(attack.event.amount,5);
});

test('V06: a short desktop window keeps combat in view without shrinking input targets',()=>{
  const layout=combatLayout(1028,714,3);
  assert.ok(layout.height+190<=714);
  assert.ok(layout.board.cell>=44);
  assert.ok(layout.actors.slice(1).every(a=>a.x>layout.actors[0].x));
});
