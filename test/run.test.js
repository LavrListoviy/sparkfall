import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, startRun, enterNode, battleAction, chooseReward, chooseEvent, abandonRun, buyUnlock } from '../public/core/run.js';
import { legalMoves } from '../public/core/board.js';

const started = (seed='route') => startRun(createSession(),seed,'coil');
function win(session) {
  const fixture = structuredClone(session);
  fixture.run.battle.enemies.forEach(e => e.hp = 0);
  return battleAction(fixture,{type:'endRound'});
}
function advanceCombat(session,choice=0) {
  session = enterNode(session,session.run.route[session.run.floor][choice].id);
  session = win(session);
  return session.run.phase === 'reward' ? chooseReward(session,session.run.reward[0]) : session;
}
test('R01: seeded route has eight floors ending at one boss, no hidden power bonuses', () => {
  const a = started(); const b = started();
  assert.deepEqual(a,b); assert.equal(a.run.route.length,8);
  assert.equal(a.run.route[7][0].enemyIds[0],'heart');
  assert.equal(a.run.hp,70); assert.deepEqual(a.run.artifacts,['coil']);
  assert.equal(startRun(a,'overwrite','coil'),a);
});
test('R02: travel applies once, a reward is distinct and cannot be claimed twice', () => {
  let state = started(); state = enterNode(state,state.run.route[0][0].id);
  assert.equal(state.run.gap,4); assert.equal(enterNode(state,'0-0'),state);
  state = win(state);
  assert.equal(state.run.phase,'reward'); assert.equal(state.run.reward.length,3);
  assert.equal(new Set(state.run.reward).size,3); assert.ok(!state.run.reward.includes('coil'));
  const artifact = state.run.reward[0]; state = chooseReward(state,artifact);
  assert.equal(chooseReward(state,artifact),state);
  state = enterNode(state,state.run.route[1][0].id); assert.equal(state.run.gap,6);
});
test('R03: all eight floors resolve to victory and settlement is idempotent', () => {
  let state = started('complete');
  for (let floor=0;floor<8;floor++) {
    const node = state.run.route[floor][0];
    state = enterNode(state,node.id);
    if (state.run.phase === 'battle') state = win(state);
    else state = chooseEvent(state,state.run.event === 'experiment' ? 'leave' : state.run.event === 'workshop' ? 'learn' : 'hurry');
    if (state.run.phase === 'reward') state = chooseReward(state,state.run.reward[0]);
  }
  assert.equal(state.run.phase,'won'); assert.equal(state.run.settled,true);
  assert.equal(state.profile.stats.wins,1);
  assert.ok(state.profile.achievements.includes('boss'));
  const bank = state.profile.currency;
  assert.equal(abandonRun(state),state); assert.equal(state.profile.currency,bank);
});
test('M01: earned currency survives defeat once; empty abandonment grants nothing', () => {
  let state = advanceCombat(started()); const achievementCurrency = state.profile.currency;
  state = abandonRun(state);
  assert.equal(state.profile.currency,achievementCurrency+1);
  assert.equal(abandonRun(state),state);
  const next = abandonRun(startRun(state,'empty','coil'));
  assert.equal(next.profile.currency,state.profile.currency);
});
test('M02: unlock purchases cost currency once, alter options only and are blocked midrun', () => {
  let state = createSession(); state.profile.currency = 10;
  state = buyUnlock(state,'artifact:glass'); assert.equal(state.profile.currency,6);
  assert.equal(buyUnlock(state,'artifact:glass'),state);
  state = buyUnlock(state,'loadout:thermal'); assert.equal(state.profile.currency,0);
  state = startRun(state,'meta','thermal');
  assert.deepEqual(state.run.artifacts,['thermal']); assert.equal(state.run.hp,70);
  state.profile.currency = 100;
  assert.equal(buyUnlock(state,'artifact:spore'),state);
});
test('R04: event choices show real costs, cannot kill or heal inside the storm, and apply once', () => {
  let state = advanceCombat(advanceCombat(started()));
  state = enterNode(state,state.run.route[2][0].id);
  state.run.event = 'experiment'; state.run.hp = 8;
  assert.equal(chooseEvent(state,'study'),state);
  state.run.hp = 9;
  const next = chooseEvent(state,'study');
  assert.equal(next.run.hp,1); assert.equal(next.run.pendingEmbers,state.run.pendingEmbers+4);
  assert.equal(chooseEvent(next,'study'),next);
  state.run.event = 'fountain'; state.run.gap = 0;
  assert.equal(chooseEvent(state,'drink'),state);
  assert.equal(chooseEvent(state,'hurry').run.gap,1);
});
test('S02: recorded actions include targets and invalid input changes nothing', () => {
  let state = started(); state = enterNode(state,state.run.route[0][0].id);
  assert.equal(battleAction(state,{type:'swap',a:-1,b:0}),state);
  const [a,b] = legalMoves(state.run.battle.board)[0];
  const next = battleAction(state,{type:'swap',a,b});
  assert.deepEqual(next.run.history.at(-1),{type:'battle',action:{type:'swap',a,b}});
  assert.equal(state.run.history.length,1);
});
