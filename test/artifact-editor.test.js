import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, applyGroups, endRound, playSwap } from '../public/core/battle.js';
import { ARTIFACTS } from '../public/core/content.js';
import { legalMoves } from '../public/core/board.js';
import { simulateArtifact } from '../public/core/artifact-sandbox.js';

const group=(type='steel',count=3)=>({type,indices:Array.from({length:count},(_,i)=>i)});
const rule=(overrides={})=>({trigger:'group',tile:'steel',min:3,weather:'any',status:'any',limit:'action',effect:'damage',amount:6,element:'fire',target:'current',ignoreStorm:false,...overrides});
export function editorItem(rules=[rule()]) {
  return {name:'Угольная шестерня',text:'Дополнительный огонь.',en:{name:'Cinder gear',text:'Additional fire.'},icon:'fire',color:'fire',cost:0,rarity:'normal',introduced:5,enabled:true,base:null,glyphBonus:{},rules};
}
function fixture(rules) {
  const state=createBattle('editor',{artifacts:['cinder'],artifactCatalog:{...ARTIFACTS,cinder:editorItem(rules)},ruleset:2});
  state.enemies[0].hp=state.enemies[0].maxHp=1000;
  return state;
}
test('AE02: composed fire damage respects resistance and fires once across action groups',()=>{
  const state=fixture([rule()]);
  const next=applyGroups(state,[group(),group()]);
  assert.equal(next.enemies[0].hp,979);
  assert.equal(next.events.filter(e=>e.artifact==='cinder').length,1);
  assert.equal(next.rng,state.rng);
  assert.equal(state.enemies[0].hp,1000);
});
test('AE02: new action resets its rule limit, while a battle limit stays consumed',()=>{
  const state=fixture([rule({tile:'any',effect:'poison',limit:'battle',amount:7})]);
  const first=applyGroups(state,[group()]);
  const next=playSwap(first,...legalMoves(first.board)[0]);
  assert.equal(first.enemies[0].poison,7);
  assert.equal(next.events.filter(e=>e.artifact==='cinder').length,0);
});
test('AE02: a killing basic hit consumes the trigger without retargeting',()=>{
  const state=createBattle('killing',{enemyIds:['furnace','sentinel'],artifacts:['cinder'],artifactCatalog:{...ARTIFACTS,cinder:editorItem()},ruleset:2});
  state.enemies[0].hp=1;
  const next=applyGroups(state,[group(),group()]);
  assert.equal(next.enemies[1].hp,77);
});
test('AE02: storm conditions, healing prohibition and capped shields use real battle state',()=>{
  const state=fixture([rule({weather:'inside',effect:'heal',amount:10,limit:'event'}),rule({effect:'shield',amount:4,limit:'event'})]);
  state.storm.gap=0;state.player.hp=30;
  const next=applyGroups(state,[group(),group()]);
  assert.equal(next.player.hp,30);
  assert.equal(next.player.stormShield,4);
});

test('AE02: action limits reset only on valid swaps; conditions and per-round limits stay independent',()=>{
  const state=fixture([rule({tile:'any',effect:'heal',amount:1}),rule({effect:'poison',amount:3,limit:'round',weather:'outside',min:4})]);
  state.player.hp=20;
  const first=applyGroups(state,[group('steel',4),group('steel',4)]);
  assert.equal(first.player.hp,21);assert.equal(first.enemies[0].poison,3);
  assert.equal(playSwap(first,0,48),first);
  const action=playSwap(first,...legalMoves(first.board)[0]);
  assert.equal(action.events.filter(e=>e.artifact==='cinder'&&e.type==='heal').length,1);
  const round=endRound(first);
  const again=applyGroups(round,[group('steel',4)]);
  assert.equal(again.enemies[0].poison,5);
});
test('AE02: round-end effects happen after storm and cannot revive a killed hero',()=>{
  const state=fixture([rule({trigger:'roundEnd',tile:'any',effect:'heal',amount:10,ignoreStorm:true})]);
  state.storm.gap=1;state.player.hp=40;
  const next=endRound(state);
  assert.equal(next.player.hp,39);
  assert.equal(next.events.at(-1).artifact,'cinder');
  state.player.hp=1;
  assert.equal(endRound(state).events.some(e=>e.artifact==='cinder'),false);
});
test('AE02: targeting all, status conditions, chill cap and heart healing block',()=>{
  const catalog={...ARTIFACTS,cinder:editorItem([rule({effect:'chill',amount:2,target:'all',status:'poison'}),rule({effect:'heal',amount:100,ignoreStorm:true})])};
  const state=createBattle('targets',{enemyIds:['furnace','sentinel'],artifacts:['cinder','tempestHeart'],artifactCatalog:catalog,ruleset:2});
  state.player.hp=30;state.enemies[0].poison=2;state.enemies[1].chill=1;
  const next=applyGroups(state,[group()]);
  assert.deepEqual(next.enemies.map(e=>e.chill),[2,2]);
  assert.equal(next.player.hp,30);
});
test('AE05: sandbox executes the same core and exposes actual artifact events',()=>{
  const result=simulateArtifact({...ARTIFACTS,cinder:editorItem()},'cinder',{trigger:'group',tile:'steel',count:3,repeats:2});
  assert.equal(result.enemies[0].hp,89);
  assert.equal(result.events.filter(e=>e.artifact==='cinder').length,1);
});

test('AE02: inherited blocks label their actual owner even if the original ID has a different block',()=>{
  const catalog=structuredClone(ARTIFACTS);catalog.thermal.base='glove';catalog.cinder={...editorItem([]),base:'thermal'};
  const state=createBattle('alias',{artifacts:['thermal','cinder'],artifactCatalog:catalog});state.enemies[0].chill=1;
  const next=applyGroups(state,[group('fire')]);
  assert.equal(next.events.find(e=>e.type==='artifact').artifact,'cinder');
});
test('AE03: observing rule conditions cannot change the legacy selected target',()=>{
  const state=createBattle('legacy-target',{enemyIds:['furnace','sentinel']});state.enemies[0].hp=1;
  assert.equal(applyGroups(state,[group(),group('heal')]).target,0);
  state.enemies[0].poison=10;
  assert.equal(endRound(state).target,0);
});
