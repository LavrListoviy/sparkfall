import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, applyGroups, playSwap, endRound, nextRoom, selectTarget, intentDamage } from '../public/core/battle.js';
import { legalMoves } from '../public/core/board.js';

const group = (type, count = 3) => ({ type, indices: Array.from({ length: count }, (_, i) => i) });
function sandbox() {
  const state = createBattle('battle-test');
  assert.ok(state, 'Battle must be initialized');
  state.enemies[0].resists = {};
  state.enemies[0].hp = state.enemies[0].maxHp = 1000;
  state.player.hp = 40;
  return state;
}

test('B03: each tile type has its specified effect and length bonus', () => {
  for (const [type, count, damage] of [['steel', 3, 9], ['fire', 3, 12], ['ice', 3, 6], ['steel', 4, 15], ['fire', 5, 30]]) {
    const before = sandbox();
    const after = applyGroups(before, [group(type, count)]);
    assert.equal(after.enemies[0].hp, 1000 - damage);
    assert.equal(before.enemies[0].hp, 1000);
  }
  const poisoned = applyGroups(sandbox(), [group('poison')]);
  assert.equal(poisoned.enemies[0].hp, 1000);
  assert.equal(poisoned.enemies[0].poison, 6);
  assert.equal(applyGroups(sandbox(), [group('heal')]).player.hp, 46);
});

test('B03/B04: resistance, weakness and final rounding apply once', () => {
  const state = sandbox();
  state.enemies[0].resists = { fire: 0.5, ice: 1.5 };
  assert.equal(applyGroups(state, [group('fire')]).enemies[0].hp, 994);
  assert.equal(applyGroups(state, [group('ice')]).enemies[0].hp, 991);
  state.player.hp = 69;
  assert.equal(applyGroups(state, [group('heal')]).player.hp, 70);
});

test('B04: chill caps at two, updates the forecast and is consumed by an attack', () => {
  let state = sandbox();
  const normalDamage = intentDamage(state.enemies[0]);
  state = applyGroups(state, [group('ice'), group('ice'), group('ice')]);
  assert.equal(state.enemies[0].chill, 2);
  assert.equal(intentDamage(state.enemies[0]), Math.floor(normalDamage * 0.6));
  const after = endRound(state);
  assert.equal(after.player.hp, state.player.hp - Math.floor(normalDamage * 0.6));
  assert.equal(after.enemies[0].chill, 0);
});

test('B02/B05: two swaps cost one action each and the storm advances only after the enemy phase', () => {
  const initial = sandbox();
  const first = playSwap(initial, ...legalMoves(initial.board)[0]);
  assert.equal(first.actions, 1);
  assert.equal(first.storm.gap, 4);
  assert.equal(first.round, 1);
  const second = playSwap(first, ...legalMoves(first.board)[0]);
  assert.equal(second.actions, 2);
  assert.equal(second.storm.gap, 3);
  assert.equal(second.round, 2);
  assert.equal(initial.actions, 2);
});

test('B02: invalid moves and terminal states cannot advance the battle', () => {
  const state = sandbox();
  assert.deepEqual(playSwap(state, -1, 0), state);
  for (const phase of ['victory', 'defeat']) {
    state.phase = phase;
    assert.deepEqual(playSwap(state, ...legalMoves(state.board)[0]), state);
    assert.deepEqual(endRound(state), state);
  }
});

test('B04: poison applies before attack, decreases by one and respects resistance', () => {
  const state = sandbox();
  state.enemies[0].poison = 6;
  state.enemies[0].resists.poison = 0.5;
  const after = endRound(state);
  assert.equal(after.enemies[0].hp, 997);
  assert.equal(after.enemies[0].poison, 5);
});

test('B04/B05: a poison kill ends the encounter before an attack or meteor', () => {
  const state = sandbox();
  state.enemies[0].hp = 3;
  state.enemies[0].poison = 6;
  state.storm.gap = 0;
  const after = endRound(state);
  assert.equal(after.phase, 'victory');
  assert.equal(after.player.hp, state.player.hp);
  assert.equal(after.board.craters.filter(Boolean).length, 0);
});

test('B02: targets can change for free and remaining groups retarget after a kill', () => {
  const state = sandbox();
  state.enemies.push({ ...structuredClone(state.enemies[0]), id: 'second' });
  state.enemies[0].hp = 1;
  const selected = selectTarget(state, 1);
  assert.equal(selected.target, 1);
  assert.equal(selected.actions, 2);
  const after = applyGroups(state, [group('steel'), group('fire')]);
  assert.equal(after.enemies[0].hp, 0);
  assert.equal(after.enemies[1].hp, 988);
});

test('B05: reaching the storm triggers the announced impact and disables healing', () => {
  const state = sandbox();
  state.storm.gap = 1;
  const target = state.storm.target;
  const after = endRound(state);
  assert.equal(after.storm.gap, 0);
  assert.equal(after.player.hp, state.player.hp - intentDamage(state.enemies[0]) - 4);
  assert.equal(after.board.craters[target], 2);
  assert.equal(after.board.tiles[target], null);
  const healed = applyGroups(after, [group('heal')]);
  assert.equal(healed.player.hp, after.player.hp);
  assert.ok(healed.events.some(e => e.type === 'healBlocked'));
  assert.equal(healed.events.some(e => e.type === 'heal' && e.amount > 0), false);
});

test('B05: a meteor can end the run and no new round begins after death', () => {
  const state = sandbox();
  state.player.hp = intentDamage(state.enemies[0]) + 2;
  state.storm.gap = 0;
  const after = endRound(state);
  assert.equal(after.phase, 'defeat');
  assert.equal(after.player.hp, 0);
  assert.equal(after.round, state.round);
});

test('B05: transition grants distance once, clears local craters and restores healing eligibility', () => {
  const state = sandbox();
  state.phase = 'victory';
  state.storm.gap = 0;
  state.board.craters[10] = 2;
  const after = nextRoom(state);
  assert.equal(after.storm.gap, 3);
  assert.equal(after.player.hp, state.player.hp);
  assert.equal(after.room, 2);
  assert.equal(after.board.craters.filter(Boolean).length, 0);
  assert.equal(after.phase, 'player');
  assert.deepEqual(nextRoom(after), after);
  assert.equal(applyGroups(after, [group('heal')]).player.hp, after.player.hp + 6);
  state.storm.gap = 5;
  assert.equal(nextRoom(state).storm.gap, 6);
});

test('S02: identical decisions and initial conditions replay deterministically', () => {
  const play = () => {
    let state = createBattle('repeatable', { stormGap: 1 });
    for (let i = 0; i < 12 && state.phase === 'player'; i++) state = playSwap(state, ...legalMoves(state.board)[0]);
    return state;
  };
  assert.deepEqual(play(), play());
});
