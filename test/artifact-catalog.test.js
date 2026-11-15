import test from 'node:test';
import assert from 'node:assert/strict';
import { ARTIFACT_CATALOG } from '../public/core/artifact-catalog.js';
import { catalogErrors } from '../public/core/artifact-schema.js';
import { createSession,startRun,enterNode,battleAction,chooseReward } from '../public/core/run.js';
import { legalMoves } from '../public/core/board.js';
import { parseSave,encodeSession } from '../public/core/save.js';
import { runReport } from '../public/report.js';
import { replayReport } from '../public/core/replay.js';
import { ARTIFACTS } from '../public/core/content.js';
import { workshopView, rewardView } from '../public/views.js';
import { setLanguage } from '../public/i18n/index.js';
import { ARTIFACTS as displayedArtifacts } from '../public/i18n/content.js';

test('AE01: current catalog is valid, invalid effects and removed IDs are rejected',()=>{
  assert.deepEqual(catalogErrors(ARTIFACT_CATALOG),[]);
  const invalid=structuredClone(ARTIFACT_CATALOG);
  invalid.items.coil.rules=[{effect:'eval',amount:Infinity}];
  assert.ok(catalogErrors(invalid).length>0);
  delete invalid.items.coil;
  assert.ok(catalogErrors(invalid,ARTIFACT_CATALOG).some(e=>e.includes('coil')));
});
test('AE01: an unfinished draft can recover numeric blanks without becoming saveable',()=>{
  const draft=structuredClone(ARTIFACT_CATALOG);draft.items.coil.name='';draft.items.coil.cost=null;
  assert.ok(catalogErrors(draft).length>0);
  assert.deepEqual(catalogErrors(draft,ARTIFACT_CATALOG,{draft:true}),[]);
});
test('AE03: expedition and report capture a detached catalog and save resumes it',()=>{
  const catalog=structuredClone(ARTIFACT_CATALOG.items);
  catalog.coil.rules=[{trigger:'group',tile:'any',min:3,weather:'any',status:'any',limit:'battle',effect:'damage',amount:8,element:'fire',target:'current',ignoreStorm:false}];
  const initial=startRun(createSession(),'editor-snapshot','coil',{artifactCatalog:catalog});
  assert.deepEqual(initial.run.artifactCatalog,catalog);
  catalog.coil.name='Changed after start';
  assert.notEqual(initial.run.artifactCatalog.coil.name,catalog.coil.name);
  let entered=enterNode(initial,initial.run.route[0][0].id);
  const [a,b]=legalMoves(entered.run.battle.board)[0];entered=battleAction(entered,{type:'swap',a,b});
  assert.equal(entered.run.battle.ruleFlags['rule:coil:0'],1);
  const restored=parseSave(encodeSession(entered));
  assert.equal(restored.ok,true,restored.error);
  assert.deepEqual(restored.session.run.artifactCatalog,initial.run.artifactCatalog);
  const report=runReport(entered.run);
  assert.deepEqual(report.artifactCatalog,initial.run.artifactCatalog);
  assert.deepEqual(replayReport(report).run,entered.run);
});

test('AE03: new item enters rewards and the next battle from the captured catalog',()=>{
  const catalog=structuredClone(ARTIFACT_CATALOG.items);
  catalog.editorReward={...structuredClone(catalog.steelMagnet),name:'Новый предмет',introduced:5,glyphBonus:{fire:50}};
  let offered;
  for(let seed=0;seed<30&&!offered;seed++){
    let session=enterNode(startRun(createSession(),`reward-editor-${seed}`,'coil',{artifactCatalog:catalog}),'0-0');
    session.run.battle.enemies.forEach(enemy=>{enemy.hp=1;enemy.poison=100;});
    session=battleAction(session,{type:'endRound'});
    if(session.run.reward.includes('editorReward'))offered=session;
  }
  assert.ok(offered,'new artifact can actually be offered');
  catalog.editorReward.glyphBonus.fire=100;
  const chosen=chooseReward(offered,'editorReward');
  const next=enterNode(chosen,chosen.run.route[1].find(node=>chosen.run.route[0][0].next.includes(node.id)&&node.enemyIds).id);
  assert.equal(next.run.battle.board.glyphWeights.fire,150);
  assert.equal(parseSave(encodeSession(next)).ok,true);
});

test('AE01: workshop remains usable when every blueprint is free or disabled',()=>{
  const original=Object.fromEntries(Object.entries(displayedArtifacts).map(([id,item])=>[id,item.cost]));
  try{
    for(const item of Object.values(displayedArtifacts))item.cost=0;
    assert.match(workshopView(createSession()),/Доступных чертежей пока нет/);
  }finally{for(const [id,cost] of Object.entries(original))displayedArtifacts[id].cost=cost;}
});
test('AE03: snapshot descriptions are escaped and retain their own English translation',()=>{
  const catalog=structuredClone(ARTIFACT_CATALOG.items);
  catalog.coil.name='<b>Historical coil</b>';catalog.coil.en.name='<b>Snapshot coil</b>';
  const run={artifactCatalog:catalog,reward:['coil'],rewardRarity:'normal',artifacts:[],hp:70,pendingEmbers:0};
  assert.match(rewardView(run),/&lt;b&gt;Historical coil&lt;\/b&gt;/);
  setLanguage('en');
  try{assert.match(rewardView(run),/&lt;b&gt;Snapshot coil&lt;\/b&gt;/);}finally{setLanguage('ru');}
});
test('AE03: pre-editor 0.6 saves retain weighted boards and gain the frozen catalog',()=>{
  const original=enterNode(startRun(createSession(),'legacy-editor'),'0-0');
  const old=structuredClone(original);old.version='0.6.0';old.run.battle.version='0.6.0';
  delete old.run.artifactCatalog;delete old.run.battle.artifactCatalog;delete old.run.battle.ruleFlags;
  const result=parseSave(encodeSession(old));
  assert.equal(result.ok,true,result.error);
  assert.equal(result.session.run.glyphVersion,1);
  assert.deepEqual(result.session.run.battle.board,original.run.battle.board);
});
test('AE03: new saves and reports cannot silently lose their catalog',()=>{
  const session=startRun(createSession(),'missing-catalog');
  const report=runReport(session.run);delete report.artifactCatalog;
  assert.throws(()=>replayReport(report),/catalog/i);
  delete session.run.artifactCatalog;
  assert.equal(parseSave(encodeSession(session)).ok,false);
});
test('AE01: authored artifact labels are plain text, not parameter templates',()=>{
  const name=ARTIFACTS.coil.name;
  try{ARTIFACTS.coil.name='Катушка {A}';assert.equal(displayedArtifacts.coil.name,'Катушка {A}');}
  finally{ARTIFACTS.coil.name=name;}
});
