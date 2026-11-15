import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSession, startRun, enterNode, battleAction, chooseReward } from '../public/core/run.js';
import { glyphWeights } from '../public/core/glyphs.js';
import { legalMoves } from '../public/core/board.js';
import { encodeSession, parseSave } from '../public/core/save.js';
import { replayReport } from '../public/core/replay.js';
import { runReport } from '../public/report.js';
import { ARTIFACTS } from '../public/core/content.js';

const ids=['steelMagnet','emberResonator','frostResonator','sporeLure','still'];
const start=(loadout='thermal',options)=>{
  const s=createSession();s.profile.unlocked=['loadout:thermal','loadout:needle'];
  return startRun(s,'glyph-integration',loadout,options);
};

test('G02/G04: a new expedition uses class and artifact weights after reload and in replay',()=>{
  let s=enterNode(start(),'0-0');
  assert.equal(s.run.glyphVersion,1);
  assert.deepEqual(s.run.battle.board.glyphWeights,glyphWeights('thermal',['thermal']));
  const loaded=parseSave(encodeSession(s));assert.equal(loaded.ok,true,loaded.error);
  const [a,b]=legalMoves(s.run.battle.board)[0],action={type:'swap',a,b};
  assert.deepEqual(battleAction(loaded.session,action),battleAction(s,action));
  s=battleAction(s,action);
  const replayed=replayReport(runReport(s.run));
  assert.deepEqual(replayed.run,s.run);
});

test('G02: new artifacts are offered only in new expeditions and never offered twice',()=>{
  for(const glyphVersion of [0,1]){
    let s=start('coil',{glyphVersion});
    s.run.artifacts=Object.keys(ARTIFACTS).filter(id=>!ids.includes(id));
    s=enterNode(s,'0-0');
    s.run.battle.enemies.forEach(e=>{e.hp=1;e.poison=2;});
    s=battleAction(s,{type:'endRound'});
    if(!glyphVersion){assert.deepEqual(s.run.reward,[]);continue;}
    assert.equal(s.run.reward.length,3);assert.equal(new Set(s.run.reward).size,3);
    assert.ok(s.run.reward.every(id=>ids.includes(id)));
    const taken=s.run.reward[0],before=structuredClone(s),next=chooseReward(s,taken);
    assert.equal(next.run.rng,before.run.rng);assert.deepEqual(next.run.battle,before.run.battle);
    assert.equal(chooseReward(next,taken),next);
    const entered=enterNode(next,'1-0');
    assert.deepEqual(entered.run.battle.board.glyphWeights,glyphWeights('coil',entered.run.artifacts));
    entered.run.battle.enemies.forEach(e=>{e.hp=1;e.poison=2;});
    const reward=battleAction(entered,{type:'endRound'}).run.reward;
    assert.ok(!reward.includes(taken));
  }
});

test('G04: a genuine 0.5 save retains the exact next action and old generation',()=>{
  const {session,action,expected}=JSON.parse(readFileSync(new URL('./fixtures/glyph-legacy-0.5.json',import.meta.url),'utf8'));
  const loaded=parseSave(JSON.stringify(session));assert.equal(loaded.ok,true,loaded.error);
  assert.equal(loaded.session.run.glyphVersion,0);
  assert.deepEqual(loaded.session.profile,session.profile);
  const next=battleAction(loaded.session,action),battle=next.run.battle;
  for(const key of ['board','rng','events','player','enemies','storm'])assert.deepEqual(battle[key],expected.run.battle[key],key);
  assert.deepEqual(next.run.reward,expected.run.reward);
  assert.deepEqual(replayReport(runReport(next.run)).run,next.run);
});

test('G04: save validation rejects modified weights and mismatched generation versions',()=>{
  const s=enterNode(start(),'0-0');
  s.run.battle.board.glyphWeights={...glyphWeights('thermal',['thermal']),fire:999};
  assert.equal(parseSave(encodeSession(s)).ok,false);
  s.run.battle.board.glyphWeights=glyphWeights('thermal',['thermal']);s.run.glyphVersion=99;
  assert.equal(parseSave(encodeSession(s)).ok,false);
});
