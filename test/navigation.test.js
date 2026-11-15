import test from 'node:test';
import assert from 'node:assert/strict';
import { createNavigation, navigate, paginate, routeSelection } from '../public/presentation/navigation.js';
import { createSession, startRun, buyUnlock } from '../public/core/run.js';
import { setLanguage, t } from '../public/i18n/index.js';
import * as views from '../public/views.js';

test('N01: opening menus never changes an active expedition and preserves workshop selection',()=>{
  const session=startRun(createSession(),'menu-state'),snapshot=structuredClone(session);
  let menu=navigate(createNavigation(),{type:'screen',value:'workshop'});
  menu=navigate(menu,{type:'workshopTab',value:'achievements'});
  menu=navigate(menu,{type:'achievement',value:'boss'});
  menu=navigate(menu,{type:'screen',value:'main'});
  menu=navigate(menu,{type:'screen',value:'workshop'});
  assert.equal(menu.screen,'workshop');assert.equal(menu.workshopTab,'achievements');assert.equal(menu.achievement,'boss');
  assert.deepEqual(session,snapshot);
  assert.equal(navigate(menu,{type:'screen',value:'unknown'}),menu);
});

test('N02: consecutive blueprint purchases keep the open tab and selected item',()=>{
  let session=createSession();session.profile.currency=10;
  let menu=navigate(createNavigation(),{type:'screen',value:'workshop'});
  menu=navigate(menu,{type:'blueprint',value:'spore'});
  const before=structuredClone(menu);
  session=buyUnlock(session,'artifact:spore');
  assert.match(views.workshopView(session,menu),/Споровый конденсатор/);
  assert.match(views.workshopView(session,menu),new RegExp(t('workshop.owned')));
  assert.deepEqual(menu,before);
  menu=navigate(menu,{type:'blueprint',value:'glove'});
  session=buyUnlock(session,'artifact:glove');
  assert.equal(menu.screen,'workshop');assert.equal(menu.workshopTab,'blueprints');assert.equal(menu.blueprint,'glove');
  assert.equal(session.profile.currency,4);
  assert.deepEqual(session.profile.unlocked,['artifact:spore','artifact:glove']);
  assert.equal(buyUnlock(session,'artifact:glove'),session);
});

test('N03: pagination reaches every item once and clamps invalid pages without dropping data',()=>{
  const items=Array.from({length:11},(_,i)=>i);
  assert.deepEqual([0,1,2].flatMap(page=>paginate(items,page,4).items),items);
  assert.deepEqual(paginate(items,99,4),{items:[8,9,10],page:2,pages:3});
  assert.deepEqual(paginate(items,-1,4).items,[0,1,2,3]);
  assert.deepEqual(paginate([],9,4),{items:[],page:0,pages:1});
});

test('N04: inspecting later route stages never enables a jump or mutates the expedition',()=>{
  const {run}=startRun(createSession(),'menu-route'),before=structuredClone(run);
  const future=routeSelection(run,7,'7-0');
  assert.equal(future.floor,7);assert.equal(future.node.enemyIds[0],'heart');assert.equal(future.canEnter,false);
  assert.equal(routeSelection(run,0,'0-0').canEnter,true);
  assert.deepEqual(run,before);
  const blocked={...run,floor:2,currentNode:'1-0',chosen:['0-0','1-0']};
  assert.equal(routeSelection(blocked,2,'2-2').canEnter,false);
  assert.equal(routeSelection(blocked,2,'2-1').canEnter,true);
});

test('N01/L02: the main menu is navigation, while loadouts and workshop have their own screens',()=>{
  const session=createSession(),menu=createNavigation();
  for(const locale of ['ru','en']){
    setLanguage(locale);
    const main=views.homeView(session);
    assert.doesNotMatch(main,new RegExp(t('home.genre')));
    assert.ok(!main.includes(t('artifact.spore.text')));
    assert.ok(views.loadoutView(session,menu.loadout).includes(t('loadout.coil.name')));
    assert.ok(views.workshopView(session,menu).includes(t('artifact.spore.name')));
  }
  setLanguage('ru');
});

test('N02: switching tabs restores the page and inspected achievement',()=>{
  let menu=navigate(createNavigation(),{type:'workshopTab',value:'achievements'});
  menu=navigate(menu,{type:'workshopPage',value:1});
  menu=navigate(menu,{type:'achievement',value:'boss'});
  menu=navigate(menu,{type:'workshopTab',value:'blueprints'});
  assert.equal(menu.workshopPage,0);
  menu=navigate(menu,{type:'workshopTab',value:'achievements'});
  assert.equal(menu.workshopPage,1);assert.equal(menu.achievement,'boss');
  assert.ok(views.workshopView(createSession(),menu).includes(t('achievement.boss.name')));
});

test('N01: completed expedition results remain reachable from the main menu',()=>{
  const session=startRun(createSession(),'menu-result');
  assert.ok(views.homeView(session).includes('data-action="continue"'));
  for(const phase of ['won','lost']){
    session.run.phase=phase;session.run.settled=true;
    assert.ok(views.homeView(session).includes('data-screen="run"'));
    assert.ok(!views.homeView(session).includes('data-action="continue"'));
  }
});
