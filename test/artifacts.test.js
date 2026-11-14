import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, applyGroups, endRound, playSwap, intentDamage } from '../public/core/battle.js';
import { legalMoves, swapBoard } from '../public/core/board.js';
import { Random } from '../public/core/random.js';

const group = (type, count = 3) => ({type, indices: Array.from({length:count},(_,i)=>i)});
function battle(artifacts, enemyIds = ['furnace']) {
  const state = createBattle('relic-test', {artifacts, enemyIds});
  state.enemies.forEach(e => { e.hp = e.maxHp = 1000; e.resists = {}; });
  state.player.hp = 40;
  return state;
}

test('A01: thermal consumes chill once per action, including multiple cascades', () => {
  const state = battle(['thermal']); state.enemies[0].chill = 2;
  const next = applyGroups(state,[group('fire'),group('ice'),group('fire')]);
  assert.equal(next.enemies[0].hp, 964);
  assert.equal(next.enemies[0].chill, 1);
});
test('A02: ash splash respects secondary resistance and does not recursively splash', () => {
  const state = battle(['ash'],['furnace','sentinel']); state.enemies[1].resists.fire = .5;
  const next = applyGroups(state,[group('fire',4)]);
  assert.equal(next.enemies[0].hp,980); assert.equal(next.enemies[1].hp,995);
});
test('A03: frost amplifies only the first ice group in an action', () => {
  const state = battle(['frost']);
  assert.equal(applyGroups(state,[group('ice')]).enemies[0].chill,2);
});
test('A03: a killing first ice group still consumes the frost trigger', () => {
  const state=battle(['frost'],['furnace','sentinel']); state.enemies[0].hp=1;
  const next=applyGroups(state,[group('ice'),group('ice')]);
  assert.equal(next.enemies[1].chill,1);
});
test('A04/A05: steel needles require four; green vial works while healing is blocked', () => {
  assert.equal(applyGroups(battle(['needle']),[group('steel',4)]).enemies[0].poison,2);
  assert.equal(applyGroups(battle(['needle']),[group('steel')]).enemies[0].poison,0);
  const state = battle(['green']); state.storm.gap = 0;
  const next = applyGroups(state,[group('heal'),group('heal')]);
  assert.equal(next.enemies[0].poison,2); assert.equal(next.player.hp,40);
});
test('A06: spore transfers half the remaining poison after a poison kill', () => {
  const state = battle(['spore'],['furnace','sentinel']);
  state.enemies[0].hp = 1; state.enemies[0].poison = 10;
  const next = endRound(state);
  assert.equal(next.enemies[1].hp,996); assert.equal(next.enemies[1].poison,3);
});
test('A07: glass amplifies long elemental matches and all incoming damage', () => {
  const state = battle(['glass']); state.storm.gap = 1;
  assert.equal(applyGroups(state,[group('fire',4)]).enemies[0].hp,975);
  assert.equal(applyGroups(state,[group('poison',4)]).enemies[0].poison,12);
  const next = endRound(state);
  assert.equal(next.player.hp,28); // floor(7 * 1.2) + floor(4 * 1.2)
});
test('A08: coil fires once on the first additional cascade', () => {
  let state = battle(['coil']);
  let found;
  for (let n = 0; n < 100 && !found; n++) {
    state = createBattle(`cascade-${n}`,{artifacts:['coil']});
    found = legalMoves(state.board).find(([a,b]) => swapBoard(state.board,a,b,new Random(state.rng)).waves.length >= 3);
  }
  assert.ok(found);
  const next = playSwap(state,...found);
  assert.equal(next.events.filter(e => e.artifact === 'coil').length,1);
});
test('A10: overflow becomes damage once; storm healing produces no overflow', () => {
  const state = battle(['ampoule']); state.player.hp = 69;
  const next = applyGroups(state,[group('heal'),group('heal')]);
  assert.equal(next.enemies[0].hp,998); assert.equal(next.player.hp,70);
  state.storm.gap = 0;
  assert.equal(applyGroups(state,[group('heal')]).enemies[0].hp,1000);
});
test('E01: enemy definitions and paired scaling are concrete', () => {
  const state = createBattle('enemies',{enemyIds:['sentinel','collector'],paired:true});
  assert.equal(state.enemies[0].maxHp,58); assert.equal(state.enemies[1].maxHp,65);
  assert.equal(intentDamage(state.enemies[0]),3);
});
test('E02: lock intent marks three cells, costs no HP and preserves chill', () => {
  const state = createBattle('jailer',{enemyIds:['jailer']}); state.enemies[0].chill = 2;
  const next = endRound(state);
  assert.equal(next.board.locks.filter(Boolean).length,3);
  assert.equal(next.player.hp,70); assert.equal(next.enemies[0].chill,2);
});
test('E02: matching unstable cells hurts before healing and cannot revive a dead hero', () => {
  const state = battle([]); state.player.hp = 1;
  state.board.unstable[0] = true;
  const next = applyGroups(state,[group('heal')]);
  assert.equal(next.player.hp,0); assert.equal(next.events.some(e => e.type === 'heal'),false);
});
test('E03: boss transforms once at half health before its attack, corners stay removed', () => {
  let state = createBattle('boss',{enemyIds:['heart']});
  state.enemies[0].hp = 160; state.enemies[0].poison = 1;
  state = endRound(state);
  assert.equal(state.enemies[0].stage,2);
  assert.equal(state.board.blocked.filter(Boolean).length,4);
  assert.equal(state.enemies[0].resists.fire,1.5);
  assert.equal(state.player.hp,58);
  state = endRound(state);
  assert.equal(state.board.blocked.filter(Boolean).length,4);
  assert.equal(state.events.some(e=>e.type==='bossPhase'),false);
});

test('A09: mechanic glove cleans one neighboring temporary cell after a long match', () => {
  let fixture;
  for(let n=0;n<40&&!fixture;n++){
    const s=createBattle(`glove-${n}`,{artifacts:['glove']});
    for(const move of legalMoves(s.board)){
      const result=swapBoard(s.board,...move,new Random(s.rng));
      const groups=result.waves.flatMap(w=>w.groups).filter(g=>g.indices.length>=4);
      const matched=new Set(result.waves.flatMap(w=>w.groups.flatMap(g=>g.indices)));
      const candidates=[...new Set(groups.flatMap(g=>g.indices.flatMap(i=>[i-7,i+7,...(i%7?[i-1]:[]),...(i%7<6?[i+1]:[])])))].filter(i=>i>=0&&i<49&&!matched.has(i)&&!move.includes(i)).sort((a,b)=>a-b);
      if(candidates.length>=2){fixture={s,move,candidates};break;}
    }
  }
  assert.ok(fixture);
  const {s,move,candidates}=fixture;
  s.board.locks[candidates[0]]=s.board.locks[candidates[1]]=true;
  const next=playSwap(s,...move);
  assert.equal(next.board.locks[candidates[0]],false);
  assert.equal(next.board.locks[candidates[1]],true);
  assert.equal(next.events.filter(e=>e.artifact==='glove').length,1);
});
test('E03: player damage transforms a surviving boss before the next player action', () => {
  const state=createBattle('phase-swap',{enemyIds:['heart']}); state.enemies[0].hp=161;
  const move=legalMoves(state.board).find(m=>playSwap(state,...m).enemies[0].hp<160);
  assert.ok(move);
  const next=playSwap(state,...move);
  assert.equal(next.enemies[0].stage,2); assert.equal(next.actions,1);
  assert.equal(next.board.blocked.filter(Boolean).length,4);
});
