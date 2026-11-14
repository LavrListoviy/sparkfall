import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, endRound, selectTarget, RULES_VERSION } from '../public/core/battle.js';
import { createSession, startRun, enterNode, battleAction } from '../public/core/run.js';
import { legalMoves } from '../public/core/board.js';
import { encodeSession, parseSave } from '../public/core/save.js';
import { replayReport } from '../public/core/replay.js';
import { readFileSync } from 'node:fs';

test('E04: triple encounters scale each foe and resolve all living intents in order',()=>{
  const s=createBattle('triple',{enemyIds:['guardian','sentinel','collector'],paired:true});
  assert.deepEqual(s.enemies.map(e=>e.maxHp),[62,43,48]);
  const next=endRound(s);
  assert.deepEqual(next.events.filter(e=>e.type==='attack').map(e=>[e.source,e.amount]),[[0,3],[1,2],[2,3]]);
  assert.equal(next.player.hp,62);
  assert.equal(selectTarget(s,2).actions,2);
});
test('E04: fourth enemy is rejected and new routes contain exactly one triple option',()=>{
  assert.throws(()=>createBattle('too-many',{enemyIds:['furnace','sentinel','collector','guardian']}),/three|3/i);
  const s=startRun(createSession(),'route');
  assert.equal(s.run.route.flat().filter(n=>n.enemyIds?.length===3).length,1);
});
test('S03: legacy saves preserve profile, route, RNG and pending rewards',()=>{
  const s=startRun(createSession(),'legacy','coil',{routeVersion:1});
  s.version='0.3.0'; delete s.run.routeVersion;
  s.run.route[6][0].enemyIds=['guardian','sentinel'];
  s.profile.currency=13;s.run.pendingEmbers=4;
  const loaded=parseSave(encodeSession(s));
  assert.equal(loaded.ok,true); assert.equal(loaded.session.version,RULES_VERSION);
  assert.equal(loaded.session.run.routeVersion,1);
  assert.deepEqual(loaded.session.run.route,s.run.route);
  assert.equal(loaded.session.run.rng,s.run.rng);
  assert.equal(loaded.session.profile.currency,13);
  assert.equal(loaded.session.run.pendingEmbers,4);
});
test('S03: the recorded 0.3 browser expedition still replays to the same ending',()=>{
  const report=JSON.parse(readFileSync(new URL('../docs/browser-playthrough.json',import.meta.url),'utf8'));
  const {run}=replayReport(report);
  assert.equal(run.hp,68);assert.equal(run.phase,'won');assert.equal(run.routeVersion,1);
});

test('S03: an active legacy battle resumes with the exact next swap and RNG',()=>{
  const current=enterNode(startRun(createSession(),'active-legacy','coil',{routeVersion:1}),'0-0');
  const legacy=structuredClone(current);
  legacy.version='0.3.0';delete legacy.run.routeVersion;
  legacy.run.battle.version='0.3.0';
  const restored=parseSave(encodeSession(legacy));
  assert.equal(restored.ok,true);
  const [a,b]=legalMoves(current.run.battle.board)[0];
  const action={type:'swap',a,b};
  assert.deepEqual(JSON.parse(encodeSession(battleAction(restored.session,action))),JSON.parse(encodeSession(battleAction(current,action))));
});
