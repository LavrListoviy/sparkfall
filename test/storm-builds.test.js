import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, applyGroups, endRound, playSwap } from '../public/core/battle.js';
import { legalMoves } from '../public/core/board.js';
import { nextMeteorDamage } from '../public/core/storm.js';

const battle = options => createBattle('storm-builds',{ruleset:2,...options});
const group = (type,count=3) => ({type,indices:Array.from({length:count},(_,i)=>i)});

test('V06/B06: next meteor forecast agrees with the actual impact across depth thresholds and shields',()=>{
  for(const gap of [2,1,0,-2,-5,-100])for(const shield of [0,4]){
    const state=battle({stormGap:gap,artifacts:['glass','grounding']});state.player.stormShield=shield;
    const expected=nextMeteorDamage(state);
    assert.equal(endRound(state).events.find(e=>e.type==='meteor')?.amount??0,expected);
  }
});

test('B06: storm distance continues below zero and damage has three capped tiers',()=>{
  for(const [gap,expectedDamage] of [[1,4],[-1,4],[-2,6],[-5,8],[-500,8]]){
    const state=battle({stormGap:gap});
    const next=endRound(state);
    assert.equal(next.storm.gap,gap-1);
    assert.equal(next.events.find(e=>e.type==='meteor').amount,expectedDamage);
    assert.equal(next.board.craters.filter(Boolean).length,1);
  }
});

test('A11: overclock provides exactly three swaps before the enemy and storm response',()=>{
  let state=battle({artifacts:['overclock']});
  state.enemies[0].hp=state.enemies[0].maxHp=10000;
  assert.equal(state.actions,3);
  for(let n=0;n<2;n++)state=playSwap(state,...legalMoves(state.board)[0]);
  assert.equal(state.round,1);assert.equal(state.actions,1);assert.equal(state.storm.gap,4);
  state=playSwap(state,...legalMoves(state.board)[0]);
  assert.equal(state.round,2);assert.equal(state.actions,3);assert.equal(state.storm.gap,3);
});

test('A12: stormweave heals the first long group of any type once per action',()=>{
  for(const type of ['steel','fire','ice','poison','heal']){
    const state=battle({stormGap:-8,hp:40,artifacts:['stormweave']});
    const first=applyGroups(state,[group(type,4)]);
    assert.equal(first.player.hp,44,type);
    assert.equal(applyGroups(first,[group('heal',4)]).player.hp,44);
    assert.equal(applyGroups(battle({hp:40,artifacts:['stormweave']}),[group('steel',4)]).player.hp,40);
  }
});

test('A13: tempest heart inverts normal healing, while retort still triggers on blocked healing',()=>{
  const outside=applyGroups(battle({hp:40,artifacts:['tempestHeart','green']}),[group('heal')]);
  assert.equal(outside.player.hp,40);assert.equal(outside.enemies[0].poison,2);
  const inside=applyGroups(battle({hp:40,stormGap:-2,artifacts:['tempestHeart']}),[group('heal')]);
  assert.equal(inside.player.hp,46);
  const overflow=applyGroups(battle({hp:70,stormGap:-2,artifacts:['tempestHeart','ampoule']}),[group('heal')]);
  assert.equal(overflow.enemies[0].hp,107);
});

test('A12/A13: instability kills before any storm healing and never revives the hero',()=>{
  const state=battle({hp:1,stormGap:-3,artifacts:['stormweave','tempestHeart']});
  state.board.unstable[0]=true;
  const result=applyGroups(state,[group('heal',4)]);
  assert.equal(result.player.hp,0);
  assert.equal(result.events.some(e=>e.type==='heal'),false);
});

test('A14: grounding absorbs meteor damage after glass, never an enemy attack or crater',()=>{
  const state=battle({stormGap:-6,artifacts:['grounding','glass']});
  const charged=applyGroups(state,[group('steel',4),group('steel',4)]);
  assert.equal(charged.player.stormShield,4);
  const after=endRound(charged);
  assert.equal(after.events.find(e=>e.type==='attack').amount,8);
  assert.equal(after.events.find(e=>e.type==='meteor').amount,5);
  assert.equal(after.player.stormShield,0);
  assert.equal(after.board.craters.filter(Boolean).length,1);
});

test('A15: epicenter lens scales with depth, respects resistance and triggers once per action',()=>{
  const state=battle({stormGap:-20,artifacts:['stormlens']});
  const first=applyGroups(state,[group('steel',4)]);
  assert.equal(first.enemies[0].hp,83);
  assert.equal(applyGroups(first,[group('steel',4)]).enemies[0].hp,68);
  const armor=battle({stormGap:-20,enemyIds:['guardian'],artifacts:['stormlens']});
  assert.equal(applyGroups(armor,[group('fire',4)]).enemies[0].hp,104);
});

test('B06: legacy encounters keep the original storm boundary and meteor damage',()=>{
  const state=createBattle('old-storm',{stormGap:0,ruleset:1});
  const after=endRound(state);
  assert.equal(after.storm.gap,0);assert.equal(after.events.find(e=>e.type==='meteor').amount,4);
});
