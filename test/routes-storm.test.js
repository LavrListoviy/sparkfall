import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, startRun, enterNode, battleAction, chooseReward, chooseEvent } from '../public/core/run.js';
import { ARTIFACTS } from '../public/core/content.js';
import { travelGain, travelForecast } from '../public/core/storm.js';
import { encodeSession, parseSave } from '../public/core/save.js';
import { replayReport } from '../public/core/replay.js';
import { readFileSync } from 'node:fs';

const start = () => startRun(createSession(),'storm-route','coil',{routeVersion:3});
function atFloor(floor,lane=2,gap=-4) {
  const state=start();state.run.floor=floor;state.run.gap=gap;
  state.run.currentNode=floor===1?'0-0':`${floor-1}-${lane}`;
  state.run.chosen=[state.run.currentNode];return state;
}
function eliteReward(entryGap,endGap,owned=[]) {
  const state=enterNode(start(),'0-0');
  state.run.route[0][0].kind='elite';state.run.artifacts.push(...owned);state.run.battle.artifacts=[...state.run.artifacts];
  state.run.battle.initialGap=entryGap;state.run.battle.storm.gap=endGap;
  state.run.battle.enemies.forEach(e=>e.hp=0);
  return battleAction(state,{type:'endRound'});
}

test('R05: eight-layer graph has three distinct lanes and a boss reachable from every node',()=>{
  const {run}=start();assert.equal(run.route.length,8);
  assert.equal(run.route[1].length,3);
  assert.deepEqual(run.route[1].map(n=>n.travel),[4,2,0]);
  for(let floor=0;floor<7;floor++)for(const node of run.route[floor]){
    assert.ok(node.next.length>0);
    assert.ok(node.next.every(id=>run.route[floor+1].some(n=>n.id===id)));
  }
  assert.deepEqual(run.route[1][0].next,['2-0','2-1']);
  assert.deepEqual(run.route[1][2].next,['2-1','2-2']);
  assert.notEqual(run.route[2][0].kind,run.route[2][2].kind);
  assert.deepEqual(start(),start());
});

test('R05: skipping from the transit lane into the far storm lane is rejected',()=>{
  const state=atFloor(2,0);
  assert.equal(enterNode(state,'2-2'),state);
  assert.notEqual(enterNode(state,'2-1'),state);
});

test('A11/A16: signed travel stacks compass and overclock and happens once',()=>{
  const state=atFloor(1,0,-10);state.run.artifacts=['overclock','stormcompass'];
  const node=state.run.route[1][0];
  assert.equal(travelGain(state.run,node),5);assert.equal(travelForecast(state.run,node),-5);
  const next=enterNode(state,node.id);
  assert.equal(next.run.gap,-5);assert.equal(next.run.battle.actions,3);
  assert.equal(enterNode(next,node.id),next);
  state.run.artifacts=['overclock'];
  assert.equal(travelForecast(state.run,state.run.route[1][2]),-11);
  state.run.gap=5;state.run.artifacts=['stormcompass'];
  assert.equal(travelGain(state.run,node),4);assert.equal(travelForecast(state.run,node),6);
});

test('R06: only an elite entered and defeated inside the storm grants rare offers',()=>{
  for(const [entry,end,rarity] of [[0,-4,'rare'],[-20,-23,'rare'],[1,-4,'normal'],[-4,1,'normal']]){
    const result=eliteReward(entry,end);
    assert.equal(result.run.rewardRarity,rarity);
    assert.equal(result.run.reward.length,3);
    assert.equal(new Set(result.run.reward).size,3);
    assert.ok(result.run.reward.every(id=>(ARTIFACTS[id].rarity==='rare')===(rarity==='rare')));
  }
});

test('R06: rare pool excludes owned items and exhaustion is explicit and paid once',()=>{
  const all=['stormweave','tempestHeart','grounding','stormlens','stormcompass'];
  const partial=eliteReward(0,-5,all.slice(0,3));
  assert.equal(partial.run.reward.length,2);
  assert.ok(partial.run.reward.every(id=>all.slice(3).includes(id)));
  const empty=eliteReward(0,-5,all);
  assert.equal(empty.run.phase,'map');assert.equal(empty.run.rewardExhausted,'rare');
  assert.equal(empty.run.pendingEmbers,7);
  assert.equal(battleAction(empty,{type:'endRound'}),empty);
});

test('R06/S04: rare offers, entry weather and negative distance survive save and choice',()=>{
  const state=eliteReward(-10,-12);
  const loaded=parseSave(encodeSession(state));assert.equal(loaded.ok,true);
  assert.deepEqual(loaded.session.run.reward,state.run.reward);
  assert.equal(loaded.session.run.rewardRarity,'rare');
  const next=chooseReward(loaded.session,state.run.reward[0]);
  assert.equal(next.run.gap,-12);assert.ok(next.run.artifacts.includes(state.run.reward[0]));
  assert.equal(chooseReward(next,state.run.reward[0]),next);
});

test('R07: weather event is resolved after travel and remains fixed after reload',()=>{
  const state=atFloor(3,2,-4);
  const next=enterNode(state,'3-2');
  assert.equal(next.run.phase,'event');
  assert.ok(['ashCaravan','groundTower'].includes(next.run.event));
  const loaded=parseSave(encodeSession(next));assert.equal(loaded.ok,true);
  assert.equal(loaded.session.run.event,next.run.event);
  state.run.gap=4;
  const clear=enterNode(state,'3-2');
  assert.ok(['experiment','workshop','fountain'].includes(clear.run.event));
});

test('R07/A13: event healing follows heart policy and artifact purchases are not repeatable',()=>{
  const state=enterNode(atFloor(3,2,-4),'3-2');
  state.run.event='fountain';state.run.artifacts=['tempestHeart'];state.run.hp=40;
  assert.equal(chooseEvent(state,'drink').run.hp,56);
  state.run.gap=1;assert.equal(chooseEvent(state,'drink'),state);
  state.run.gap=-4;state.run.event='ashCaravan';state.run.artifacts=[];
  const taken=chooseEvent(state,'salvage');
  assert.ok(taken.run.artifacts.includes('overclock'));assert.equal(taken.run.hp,34);assert.equal(taken.run.gap,-5);
  assert.equal(chooseEvent(taken,'salvage'),taken);
  state.run.hp=6;assert.equal(chooseEvent(state,'salvage'),state);
});

test('S04: the recorded 0.4 expedition retains its exact result and old reward pool',()=>{
  const report=JSON.parse(readFileSync(new URL('../docs/browser-playthrough-0.4.json',import.meta.url),'utf8'));
  const {run}=replayReport(report);
  assert.equal(run.hp,58);assert.equal(run.phase,'won');assert.equal(run.stats.swaps,43);
  assert.equal(run.routeVersion,2);
});

test('S04: a 0.4 active save keeps profile, route and next round under legacy rules',()=>{
  const old=enterNode(startRun(createSession(),'migration-04','coil',{routeVersion:2}),'0-0');
  old.profile.currency=17;old.run.battle.storm.gap=0;old.run.gap=0;
  const expected=battleAction(old,{type:'endRound'});
  const raw=JSON.parse(encodeSession(old));raw.version='0.4.0';raw.run.battle.version='0.4.0';
  delete raw.run.battle.ruleset;delete raw.run.battle.player.stormShield;delete raw.run.rewardRarity;delete raw.run.rewardExhausted;
  const loaded=parseSave(JSON.stringify(raw));assert.equal(loaded.ok,true);
  assert.deepEqual(loaded.session.profile,old.profile);assert.deepEqual(loaded.session.run.route,old.run.route);
  assert.deepEqual(battleAction(loaded.session,{type:'endRound'}),expected);
});

test('S04: new saves preserve three actions, deep weather and meteor shield, rejecting missing edges',()=>{
  const state=start();state.run.artifacts.push('overclock','grounding');state.run.gap=-900;
  const entered=enterNode(state,'0-0');entered.run.battle.player.stormShield=4;
  const loaded=parseSave(encodeSession(entered));assert.equal(loaded.ok,true);
  assert.equal(loaded.session.run.battle.actions,3);assert.equal(loaded.session.run.battle.player.stormShield,4);
  assert.equal(loaded.session.run.gap,-900);
  const invalid=JSON.parse(encodeSession(entered));invalid.run.route[1][0].next=['missing'];
  assert.equal(parseSave(JSON.stringify(invalid)).ok,false);
});

test('R05/R06/A11–A16: the recorded 0.5 storm build defeats the boss at depth fourteen',()=>{
  const report=JSON.parse(readFileSync(new URL('../docs/browser-playthrough-0.5.json',import.meta.url),'utf8'));
  const {run}=replayReport(report);
  assert.equal(run.phase,'won');assert.equal(run.hp,41);assert.equal(run.gap,-13);
  assert.equal(run.stats.swaps,48);assert.equal(run.stats.combats,6);
  assert.deepEqual(run.artifacts,['coil','green','overclock','tempestHeart','stormlens','stormweave']);
});
