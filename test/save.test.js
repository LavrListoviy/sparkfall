import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, startRun, enterNode, battleAction, chooseReward, chooseEvent, abandonRun } from '../public/core/run.js';
import { encodeSession, parseSave, loadSession, saveSession } from '../public/core/save.js';
import { legalMoves } from '../public/core/board.js';

function running() {
  const state = startRun(createSession(),'persist','coil');
  return enterNode(state,state.run.route[0][0].id);
}
test('S01: a save restores RNG and the next action exactly, with no presentation snapshots', () => {
  const state = running(); const move = legalMoves(state.run.battle.board)[0];
  const after = battleAction(state,{type:'swap',a:move[0],b:move[1]});
  const raw = encodeSession(after); const loaded = parseSave(raw);
  assert.equal(loaded.ok,true); assert.deepEqual(loaded.session.run.battle.waves,[]);
  assert.equal(loaded.session.run.battle.rng,after.run.battle.rng);
  assert.deepEqual(battleAction(loaded.session,{type:'endRound'}),battleAction(after,{type:'endRound'}));
});
test('S01: corrupted and incompatible saves are reported with the original raw value', () => {
  for (const raw of ['{broken','{}',JSON.stringify({...createSession(),version:'99'})]) {
    const parsed = parseSave(raw); assert.equal(parsed.ok,false); assert.equal(parsed.raw,raw);
  }
  const state = running(); state.run.battle.board.tiles[0] = 'cheese';
  assert.equal(parseSave(JSON.stringify(state)).ok,false);
});
test('S01: inconsistent encounter references and dead active heroes cannot softlock a save', () => {
  const missing=running(); missing.run.currentNode='nonexistent';
  assert.equal(parseSave(JSON.stringify(missing)).ok,false);
  const dead=running(); dead.run.battle.player.hp=0; dead.run.hp=0;
  assert.equal(parseSave(JSON.stringify(dead)).ok,false);
});
test('S01: atomic storage failure is surfaced and does not mutate in-memory state', () => {
  const state = running(); const before = structuredClone(state);
  const result = saveSession({setItem(){throw new Error('quota');}},state);
  assert.equal(result.ok,false); assert.match(result.error,/quota/); assert.deepEqual(state,before);
  const loaded = loadSession({getItem(){throw new Error('blocked');}});
  assert.equal(loaded.ok,false); assert.match(loaded.error,/blocked/);
});
test('S01: absent save starts fresh; valid save takes one atomic write', () => {
  assert.deepEqual(loadSession({getItem:()=>null}).session,createSession());
  const writes=[];
  assert.equal(saveSession({setItem:(...args)=>writes.push(args)},running()).ok,true);
  assert.equal(writes.length,1); assert.equal(parseSave(writes[0][1]).ok,true);
});
test('S01: reward offer survives reload and terminal rewards cannot be paid twice', () => {
  let state=running(); state.run.battle.enemies[0].hp=0;
  state=battleAction(state,{type:'endRound'});
  const loaded=parseSave(encodeSession(state)).session;
  assert.deepEqual(loaded.run.reward,state.run.reward);
  state=abandonRun(chooseReward(loaded,loaded.run.reward[0]));
  const settled=parseSave(encodeSession(state)).session;
  assert.equal(abandonRun(settled),settled);
  assert.equal(settled.profile.currency,state.profile.currency);
});
