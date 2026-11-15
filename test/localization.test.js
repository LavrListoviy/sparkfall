import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings, loadSettings, persistSettings } from '../public/presentation/settings.js';
import { t, number, setLanguage, messages } from '../public/i18n/index.js';
import { createSession, startRun, enterNode, battleAction } from '../public/core/run.js';
import { legalMoves } from '../public/core/board.js';
import { runReport, reportFilename } from '../public/report.js';
import * as content from '../public/core/content.js';
import { homeView, loadoutView, workshopView, mapView, rewardView, eventView, resultView, relicInventory, glossaryView, glyphFrequencyView } from '../public/views.js';
import { eventText, battleAnnouncement } from '../public/presentation/text.js';
import { feedbackPayload, feedbackErrorMessage } from '../public/feedback.js';
import { readFile } from 'node:fs/promises';
import { glossaryTerms } from '../public/i18n/glossary-data.js';
import { glossaryMarkdown } from '../scripts/glossary.mjs';

test('L01: language defaults to Russian and accepts only supported explicit choices',()=>{
  assert.equal(normalizeSettings().language,'ru');
  assert.equal(normalizeSettings({language:'en'}).language,'en');
  assert.equal(normalizeSettings({language:'de'}).language,'ru');
  assert.equal(normalizeSettings(null).language,'ru');
});

test('L02: every catalog message has both locales with identical named parameters',()=>{
  const parameters=value=>[...new Set((typeof value==='object'?Object.values(value):[value]).flatMap(text=>[...text.matchAll(/\{(\w+)\}/g)].map(match=>match[1])))].sort();
  for(const [key,record] of Object.entries(messages)){
    for(const locale of ['ru','en']){
      assert.ok(record[locale],`${key}: missing ${locale}`);
      const values=typeof record[locale]==='object'?Object.values(record[locale]):[record[locale]];
      assert.ok(values.every(text=>typeof text==='string'&&text.trim().length),`${key}: empty ${locale}`);
      assert.ok(values.every(text=>!/[<>]/.test(text)),`${key}: markup belongs to views`);
    }
    assert.deepEqual(parameters(record.ru),parameters(record.en),key);
  }
});

test('L03: the in-game glossary and reference document use the same bilingual definitions',async()=>{
  assert.equal(await readFile(new URL('../docs/GLOSSARY.md',import.meta.url),'utf8'),glossaryMarkdown());
  for(const locale of ['ru','en']){
    setLanguage(locale);
    for(const term of glossaryTerms){
      const index=glossaryTerms.filter(item=>item.group===term.group).indexOf(term);
      const html=glossaryView({group:term.group,page:Math.floor(index/4),term:term.id});
      assert.ok(html.includes(term.name[locale]),term.id);
      assert.ok(t(`term.${term.id}.description`).length>10,term.id);
    }
  }
  setLanguage('ru');
});

test('S02/L02: downloading a report uses the current expedition seed and a safe filename',()=>{
  assert.equal(reportFilename({seed:'ISKRA-01'}),'sparkfall-ISKRA-01.json');
  assert.equal(reportFilename({seed:'user/<seed>'}),'sparkfall-user__seed_.json');
});

test('L02: existing screen-reader announcements translate from the current battle facts',()=>{
  const battle={player:{hp:55},storm:{gap:2}};
  setLanguage('ru');
  assert.equal(battleAnnouncement(battle),'Здоровье 55. Отрыв 2.');
  setLanguage('en');
  assert.equal(battleAnnouncement(battle),'Health: 55. Lead 2.');
  assert.equal(battleAnnouncement(null),'');
  setLanguage('ru');
});

test('L02: a retained feedback error uses the language selected when it is shown again',()=>{
  setLanguage('ru');
  let problem;
  try{feedbackPayload({kind:'impression',message:''});}catch(error){problem=error;}
  setLanguage('en');
  assert.equal(feedbackErrorMessage(problem),t('feedback.errorLength'));
  assert.equal(feedbackErrorMessage(new Error('Browser detail')),'Browser detail');
  setLanguage('ru');
});

test('L02: structured combat events render in the selected language without irrelevant parameters',()=>{
  const attack={type:'attack',amount:5};
  setLanguage('en');
  assert.equal(eventText(attack),'Enemy attack: −5 health.');
  assert.equal(eventText({type:'damage',element:'steel',amount:3,artifact:'coil'}),'Cascade Coil: Physical damage: 3.');
  for(const type of ['enemyPhase','chill','poison','poisonTick','heal','healBlocked','meteor','storm','ward','locks','unstable','charge','bossPhase','artifact']){
    assert.doesNotMatch(eventText({type,amount:2,gap:0}),/[А-Яа-яЁё]|undefined|NaN/);
  }
  setLanguage('ru');
  assert.equal(eventText(attack),'Противник атакует: −5 здоровья.');
  assert.equal(eventText({type:'unknown'}),'');
  assert.deepEqual(attack,{type:'attack',amount:5});
});

test('L02: all expedition screens use English, including content and disabled choices',()=>{
  const session=startRun(createSession(),'locale-views');
  const run={...session.run,hp:1,gap:0,event:'workshop',reward:['thermal','frost'],rewardRarity:'rare'};
  setLanguage('en');
  try{
    const screens=[()=>homeView(session),()=>loadoutView(session,'coil'),()=>workshopView(session),()=>workshopView(session,{workshopTab:'achievements'}),()=>mapView(run),()=>rewardView(run),()=>eventView(run),()=>resultView({...session,run:{...run,phase:'won'}}),()=>relicInventory(Object.keys(content.ARTIFACTS))];
    screens.push(()=>glyphFrequencyView({...run,loadout:'thermal',artifacts:['thermal','emberResonator']}),()=>glyphFrequencyView({...run,glyphVersion:0}));
    for(const version of [1,2])screens.push(()=>mapView({...run,routeVersion:version}));
    for(const event of Object.keys(content.EVENTS))screens.push(()=>eventView({...run,event,phase:event==='rest'?'rest':'event'}));
    screens.push(()=>rewardView({...run,rewardRarity:'normal'}),()=>resultView({...session,run:{...run,phase:'lost',pendingEmbers:0}}));
    for(const render of screens)assert.doesNotMatch(render(),/[А-Яа-яЁё]|undefined|NaN/);
    assert.match(loadoutView(session,'coil'),/Cascade Engineer/);
    assert.match(eventView(run),/The storm blocks healing/);
    assert.match(rewardView(run),/Thermocouple/);
  }finally{setLanguage('ru');}
});

test('G04/L02: frequency explanations show actual class sources and legacy probabilities',()=>{
  const run={glyphVersion:1,loadout:'thermal',artifacts:['thermal','emberResonator']};
  for(const language of ['ru','en']){
    setLanguage(language);
    const html=glyphFrequencyView(run);
    assert.ok(html.includes(t('loadout.thermal.name')));
    assert.ok(html.includes(t('artifact.emberResonator.name')));
    for(const percent of [29.2,20.8,16.7])assert.ok(html.includes(`${number(percent)}%`));
    const legacy=glyphFrequencyView({...run,glyphVersion:0});
    assert.equal(legacy.match(/20%/g).length,5);assert.ok(legacy.includes(t('glyph.legacy')));
  }
  setLanguage('ru');
});

test('L02: every content name, description, intent and choice has an English translation',()=>{
  const fields=['name','tag','text','subtitle','flavor'];
  function check(item,prefix){
    for(const field of fields)if(typeof item[field]==='string'){
      assert.equal(typeof messages[`${prefix}.${field}`]?.en,'string',`${prefix}.${field}`);
      assert.ok(messages[`${prefix}.${field}`].en.trim());
    }
    for(const list of ['intents','second','choices'])for(const [i,child] of (item[list]??[]).entries())check(child,`${prefix}.${list}.${child.id??i}`);
  }
  for(const [name,prefix] of [['ARTIFACTS','artifact'],['ENEMIES','enemy'],['LOADOUTS','loadout'],['EVENTS','event'],['ACHIEVEMENTS','achievement']]){
    for(const [id,item] of Object.entries(content[name]))check(item,`${prefix}.${id}`);
  }
});

test('L02: English labels, named parameters and locale-specific numbers are readable',()=>{
  setLanguage('en');
  assert.equal(t('combat.endRound'),'End round');
  assert.equal(t('combat.round',{count:21}),'Round 21');
  assert.equal(number(1.5),'1.5');
  setLanguage('ru');
  assert.equal(number(1.5),'1,5');
  assert.equal(t('tile.heal'),'Зелье');
});

test('L02: action counts use Russian and English plural rules',()=>{
  const counts=[0,1,2,5,11,21,22];
  setLanguage('ru');
  assert.deepEqual(counts.map(count=>t('combat.actions',{count})),['0 действий','1 действие','2 действия','5 действий','11 действий','21 действие','22 действия']);
  setLanguage('en');
  assert.deepEqual(counts.map(count=>t('combat.actions',{count})),counts.map(n=>`${n} ${n===1?'action':'actions'}`));
  setLanguage('ru');
});

test('L02: missing English falls back to Russian; missing keys and parameters fail explicitly',()=>{
  messages['test.fallback']={ru:'Текст {name}'};
  try{
    setLanguage('en');
    assert.equal(t('test.fallback',{name:'<user>'}),'Текст <user>');
    assert.throws(()=>t('test.fallback'),/name/);
    assert.throws(()=>t('missing.key'),/missing.key/);
  }finally{delete messages['test.fallback'];setLanguage('ru');}
});

test('L01: language changes cannot alter battle state, decisions or replay data',()=>{
  const initial=startRun(createSession(),'locale-replay');
  const before=enterNode(initial,initial.run.route[0][0].id);
  const snapshot=structuredClone(before),report=runReport(before.run);
  const [a,b]=legalMoves(before.run.battle.board)[0];
  setLanguage('ru');const russian=battleAction(before,{type:'swap',a,b});
  setLanguage('en');const english=battleAction(before,{type:'swap',a,b});
  assert.deepEqual(english,russian);
  assert.deepEqual(before,snapshot);
  assert.deepEqual(runReport(before.run),report);
  setLanguage('ru');
});

test('L01: language survives reload independently from the profile, including old settings',()=>{
  const values=new Map([['sparkfall.save.v1','unchanged profile']]);
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  assert.equal(persistSettings(storage,{language:'en',speed:2}).ok,true);
  assert.equal(loadSettings(storage).language,'en');
  assert.equal(values.get('sparkfall.save.v1'),'unchanged profile');
  storage.setItem('sparkfall.settings.v1','{"speed":0.5,"sound":true}');
  assert.equal(loadSettings(storage).language,'ru');
  assert.equal(loadSettings({getItem:()=>'{broken'}).language,'ru');
  assert.equal(persistSettings(null,{language:'en'}).ok,false);
});
