import test from 'node:test';
import assert from 'node:assert/strict';
import { replayReport } from '../public/core/replay.js';
import { RULES_VERSION } from '../public/core/battle.js';
import { simulate } from '../scripts/simulate.mjs';
import { runReport } from '../public/report.js';
import { ARTIFACTS } from '../public/core/content.js';

test('S02: an exported report reproduces a complete boss victory for each loadout', () => {
  for(const loadout of ['coil','thermal','needle']){
    const {session}=simulate('PLAY-0',loadout,0);
    const r=session.run;
    const report=runReport(r);
    const replayed=replayReport(report);
    assert.equal(replayed?.run.phase,'won');
    assert.deepEqual(replayed.run.battle,r.battle);
    assert.deepEqual(replayed.run.artifacts,r.artifacts);
    assert.equal(replayed.run.hp,r.hp);
  }
});
test('S02: incompatible versions and impossible decisions produce actionable failures', () => {
  assert.throws(()=>replayReport({version:'nope'}),/version/i);
  assert.throws(()=>replayReport({game:'sparkfall',version:RULES_VERSION,artifactCatalog:ARTIFACTS,seed:'bad',loadout:'coil',initialUnlocks:[],decisions:[{type:'reward',id:'glass'}]}),/decision 1/i);
});
