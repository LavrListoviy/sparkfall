import { eventText, battleAnnouncement } from './presentation/text.js';
import { t, setLanguage, getLanguage, number, tileName } from './i18n/index.js';
import { BattleScene } from './presentation/scene.js';
import { buildTimeline, frameDuration } from './presentation/timeline.js';
import { createNavigation, navigate, paginate } from './presentation/navigation.js';
import { bindCategoryPicker } from './presentation/category-picker.js';
import { loadSettings, persistSettings } from './presentation/settings.js';
import { intentDamage, currentIntent } from './core/battle.js';
import { legalMoves } from './core/board.js';
import { swipeTarget, chooseCell } from './core/input.js';
import { createSession, startRun, enterNode, battleAction, chooseReward, chooseEvent, abandonRun, buyUnlock, isActive } from './core/run.js';
import { loadSession, saveSession } from './core/save.js';
import { ARTIFACTS, ENEMIES, LOADOUTS, ACHIEVEMENTS, intentName } from './i18n/content.js';
import { localizeDocument } from './i18n/document.js';
import { errorText } from './i18n/errors.js';
import { homeView, loadoutView, workshopView, mapView, rewardView, eventView, resultView, relicInventory, glossaryView, pager, escape, glyphFrequencyView } from './views.js';
import { icon } from './icons.js';
import { inStorm, stormDepth, nextMeteorDamage, healingBlock } from './core/storm.js';
import { runReport, reportFilename } from './report.js';
import { feedbackDialog } from './feedback-dialog.js';

const $ = selector => document.querySelector(selector);
const boardElement = $('#board'); const modal = $('#modal');
let storage;
try { storage = window.localStorage; } catch { storage = null; }
const loaded = storage ? loadSession(storage) : {ok:false,error:'storage.unavailable',raw:null};
let session = loaded.ok ? loaded.session : createSession();
let corrupt = !loaded.ok && loaded.raw !== null;
let state = session.run?.battle;
let navigation=createNavigation();
let modalPage=0,currentModal='info',glossaryState={group:'board',page:0,term:null};
let disposeCategoryPicker;
let settings=loadSettings(storage,{reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
setLanguage(settings.language);
let selected=null,busy=false,gesture=null,soundEnabled=settings.sound,audioContext;
let reducedMotion=settings.reducedMotion;
let saveStatus='storage.local',lastSaveError=null;
let scene,sceneError=null;
try {
  scene=new BattleScene($('#combat-stage'),applyLayout,graphicsFailure);
  scene.load().then(()=>{if(state)render();}).catch(error=>graphicsFailure('graphics.loadFailed',{message:error.message}));
} catch(error) { graphicsFailure('graphics.webgl'); }
let logEntries = state?.events ?? [];
const message = text => { $('#move-message').textContent = text; };
const banner = (text,visible=true) => { $('#board-banner').textContent=text; $('#board-banner').classList.toggle('visible',visible); };

document.querySelectorAll('[data-icon]').forEach(e=>{e.innerHTML=icon(e.dataset.icon);});
$('#storm-icon').innerHTML=icon('storm'); $('#sound').innerHTML=icon(soundEnabled?'sound':'mute');
$('#sound').setAttribute('aria-pressed',String(soundEnabled));
$('#sound').setAttribute('aria-label',soundEnabled?t('sound.disable'):t('sound.enable'));
if (!loaded.ok) storageWarning(loaded.error);

function storageWarning(error) {
  lastSaveError=error;saveStatus='storage.unsaved';
  $('#save-warning').hidden = false;
  $('#save-warning').textContent = t('storage.warning',{error:errorText(error)});
  $('#save-status').textContent = t('storage.unsaved');
}
/** Persist the complete result before starting any animation or changing views. */
function commit(next) {
  if (next === session || corrupt) return;
  if(next.run?.phase!==session.run?.phase||next.run?.floor!==session.run?.floor)navigation={...navigation,mapFloor:null,mapNode:null,reward:0};
  session = next;
  const result = storage ? saveSession(storage,session) : {ok:false,error:'storage.unavailable'};
  if (result.ok) { lastSaveError=null;saveStatus='storage.saved';$('#save-warning').hidden=true; $('#save-status').textContent=t(saveStatus); }
  else storageWarning(result.error);
}
function render() {
  const languageOptions=$('#language-options');if(languageOptions)languageOptions.disabled=busy;
  const languageNotice=$('#language-busy-note');if(languageNotice)languageNotice.hidden=!busy;
  if (corrupt) {
    if(scene)scene.active=false;
    $('#combat-view').hidden=true; $('#view').hidden=false;
    $('#view').innerHTML=`<section class="event-view"><p class="eyebrow">${t('recovery.kicker')}</p><h1>${t('recovery.title')}</h1><p>${escape(errorText(loaded.error))}</p><p>${t('recovery.description')}</p><div class="modal-actions"><button class="secondary-button" data-action="export-corrupt">${t('recovery.export')}</button><button class="primary-button" data-action="reset-corrupt">${t('recovery.reset')}</button></div></section>`;
    return;
  }
  const run=session.run;
  const combat=navigation.screen==='run'&&run?.phase==='battle';
  document.body.classList.toggle('at-main',navigation.screen==='main');
  $('#combat-view').hidden=!combat; $('#view').hidden=combat;
  document.body.classList.toggle('in-combat',combat);
  if(scene){scene.active=combat;scene.reducedMotion=settings.reducedMotion;}
  document.body.classList.toggle('storm-active',Boolean(combat && inStorm(run.gap)));
  document.body.classList.toggle('busy',busy);
  $('#seed-label').textContent=run?.seed ?? t('world.lowerCity');
  $('#report').disabled=!run || busy; $('#restart').disabled=busy; $('#feedback-open').disabled=busy;
  $('#restart').textContent=t('menu.pause');
  if (combat) { state=run.battle; renderBattle(); return; }
  if(navigation.screen==='main')$('#view').innerHTML=homeView(session);
  else if(navigation.screen==='workshop')$('#view').innerHTML=workshopView(session,navigation);
  else if(navigation.screen==='loadout')$('#view').innerHTML=loadoutView(session,navigation.loadout);
  else if(!run)$('#view').innerHTML=homeView(session);
  else if(run.phase==='map')$('#view').innerHTML=mapView(run,navigation);
  else if(run.phase==='reward')$('#view').innerHTML=rewardView(run,navigation.reward);
  else if (['event','rest'].includes(run.phase)) $('#view').innerHTML=eventView(run);
  else $('#view').innerHTML=resultView(session);
}
function renderBoard(board=state.board,matching=[]) {
  const focused=document.activeElement?.dataset.index; const hits=new Set(matching);
  boardElement.innerHTML=board.tiles.map((type,index)=>{
    const crater=board.craters[index], blocked=board.blocked[index], locked=board.locks[index], unstable=board.unstable[index];
    const marked=state.storm.target===index && !blocked;
    const blockedHeal=type==='heal' && Boolean(healingBlock(state.storm.gap,state.artifacts,state.ruleset));
    const label=t('cell.label',{row:Math.floor(index/7)+1,column:index%7+1,tile:blocked?t('cell.destroyed'):crater?t('cell.crater',{crater:crater}):tileName(type),chains:locked?t('cell.chained'):'',instability:unstable?t('cell.unstable'):'',meteor:marked?t('cell.meteor'):'',healing:blockedHeal?t('cell.healBlocked'):''});
    return `<button class="tile ${blocked?'void':crater?'crater':type}${hits.has(index)?' matching':''}${selected===index?' selected':''}${locked?' chained':''}${unstable?' unstable':''}${blockedHeal?' blocked-heal':''}" data-index="${index}" aria-label="${label}" aria-pressed="${selected===index}" ${blocked||crater||locked||busy||state.phase!=='player'?'disabled':''}>${blocked?'<span>×</span>':icon(crater?'crater':type)}${crater?`<span class="crater-age">${crater}</span>`:''}${locked?'<span class="hazard-label">⛓</span>':''}${unstable?'<span class="hazard-label">!</span>':''}${marked?'<span class="meteor-mark"></span>':''}</button>`;
  }).join('');
  scene?.setBoard(board,matching);
  if (focused!==undefined && !busy) boardElement.querySelector(`[data-index="${focused}"]:not(:disabled)`)?.focus({preventScroll:true});
}
/** Position the semantic input layer on the same geometry as the Three.js scene. */
function applyLayout(layout) {
  const b=layout.board;
  Object.assign(boardElement.style,{left:`${b.x}px`,top:`${b.y}px`,width:`${b.size}px`,height:`${b.size}px`,padding:`${b.padding}px`,gap:`${b.gap}px`});
  Object.assign($('#matrix-label').style,{left:`${b.x}px`,top:`${b.y-23}px`,width:`${b.size}px`});
  const a=layout.actors[0];Object.assign($('#hero-hud').style,{left:`${Math.max(4,a.x-a.hudWidth/2)}px`,width:`${a.hudWidth}px`});
  document.querySelectorAll('.enemy-hud').forEach((el,i)=>{const e=layout.actors[i+1];if(e)Object.assign(el.style,{left:`${Math.min(layout.width-e.hudWidth-3,e.x-e.hudWidth/2)}px`,width:`${e.hudWidth}px`});});
  document.querySelectorAll('.actor-target').forEach((el,i)=>{const e=layout.actors[i+1];if(e)Object.assign(el.style,{left:`${e.x-e.size/2}px`,top:`${e.y-e.size}px`,width:`${e.size}px`,height:`${e.size+8}px`});});
}
function graphicsFailure(key,parameters={}){sceneError={key,parameters};$('#graphics-error').hidden=false;$('#graphics-error').textContent=t(key,parameters);$('#end-turn').disabled=true;$('#hint').disabled=true;}
/** HUD state advances at impact boundaries, independently of the committed save. */
function renderHUD() {
  $('#hero-hp').textContent=`${state.player.hp} / ${state.player.maxHp}`;
  $('#hero-health').style.width=`${state.player.hp/state.player.maxHp*100}%`;
  $('#hero-hud').classList.toggle('critical',state.player.hp<=20);
  const storm=inStorm(state.storm.gap),block=healingBlock(state.storm.gap,state.artifacts,state.ruleset);
  $('#healing-status').textContent=block==='heart'?t('healing.insideOnly'):block?(state.artifacts.includes('stormweave')?t('healing.longOnly'):t('healing.blocked')):t('healing.allowed');
  $('#healing-status').classList.toggle('blocked',Boolean(block));
  $('#hero-shield').textContent=state.player.stormShield?t('combat.shield',{stormShield:state.player.stormShield}):'';
  $('#storm-count').textContent=storm?t('combat.depth',{depth:stormDepth(state.storm.gap)}):state.storm.gap;
  $('#storm-caption').textContent=storm?t('combat.nextMeteor',{damage:nextMeteorDamage(state)}):t('combat.untilFront',{count:state.storm.gap});
  document.body.classList.toggle('storm-active',storm);
  $('#storm-help').classList.toggle('caught',storm);
  $('#enemy-huds').innerHTML=state.enemies.map((enemy,i)=>{
    const data=ENEMIES[enemy.id],intent=currentIntent(enemy),amount=Math.floor(intentDamage(enemy)*(state.artifacts.includes('glass')?1.2:1));
    return `<div class="actor-hud enemy-hud ${i===state.target?'chosen':''} ${enemy.hp<=0?'dead':''}"><button class="enemy-name" data-target="${i}" ${busy||enemy.hp<=0?'disabled':''} aria-pressed="${i===state.target}">${data.name}${enemy.id==='heart'?` <small>${t('enemy.phase',{stage:enemy.stage})}</small>`:''}</button><div class="health-bar enemy-health"><span style="width:${enemy.hp/enemy.maxHp*100}%"></span></div><div class="enemy-vitals"><b>${enemy.hp}/${enemy.maxHp}</b><span class="ice">${enemy.chill?`❄${enemy.chill}`:''}</span><span class="poison">${enemy.poison?`☠${enemy.poison}`:''}</span></div><div class="hud-intent" title="${intentName(enemy)}">${enemy.hp<=0?t('enemy.defeated'):intent.kind==='attack'?`${icon('steel')} ${amount}`:intent.kind==='locks'?`⛓ ${intent.amount}`:intent.kind==='unstable'?`! ${intent.amount}`:t('enemy.charging')}</div><div class="hud-resists">${Object.entries(enemy.resists).map(([type,mult])=>`<button data-resist="${type}:${mult}" class="${type}" aria-label="${data.name}: ${tileName(type)} ×${number(mult)}">${icon(type)}<span>×${number(mult)}</span></button>`).join('')}</div></div><button class="actor-target" data-target="${i}" ${busy||enemy.hp<=0?'disabled':''} aria-label="${t('enemy.select',{enemy:data.name,health:enemy.hp,intent:intentName(enemy),attackDamage:intent.kind==='attack'?` ${amount}`:''})}"></button>`;
  }).join('');
  $('#round-label').textContent=t('combat.roundLabel',{round:state.round});
  $('#actions-label').textContent=busy?t('combat.resolving'):t('combat.actions',{count:state.actions});
  $('#room-label').textContent=`${state.room} / 8`;
  $('#relic-count').textContent=state.artifacts.length;
  if(scene?.layout)applyLayout(scene.layout);
}
function renderBattle(){
  renderHUD();$('#end-turn').disabled=busy||Boolean(sceneError);$('#hint').disabled=busy||Boolean(sceneError);
  scene?.setState(state);renderBoard();
}
function updateSelection() {
  scene?.select(selected);
  boardElement.querySelectorAll('.tile').forEach(tile=>{ const active=Number(tile.dataset.index)===selected; tile.classList.toggle('selected',active); tile.setAttribute('aria-pressed',String(active)); });
}
/** Synthesized audio is local and only enabled by an explicit gesture. */
function tone(frequency=500,duration=.08,shape='sine') {
  if (!soundEnabled) return;
  try {
    audioContext??=new (window.AudioContext||window.webkitAudioContext)(); audioContext.resume().catch(()=>{});
    const oscillator=audioContext.createOscillator(), gain=audioContext.createGain();
    oscillator.type=shape; oscillator.frequency.setValueAtTime(frequency,audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40,frequency*.65),audioContext.currentTime+duration);
    gain.gain.setValueAtTime(.045,audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);
    oscillator.connect(gain).connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime+duration);
  } catch { soundEnabled=false; }
}
/** Animation reads snapshots; the resulting session has already been safely committed. */
async function runAction(action) {
  if(busy||sceneError||!scene?.ready||session.run?.phase!=='battle')return;
  const before=state,next=battleAction(session,action);
  if(next===session){selected=null;updateSelection();message(t('input.invalid'));tone(150);return;}
  const previousAchievements=session.profile.achievements.length,result=next.run.battle;
  busy=true;selected=null;$('#report').disabled=true;$('#restart').disabled=true;$('#feedback-open').disabled=true;scene?.select(null);renderBattle();commit(next);
  try{
    for(const frame of buildTimeline(before,result)){
      if(frame.kind==='match'){banner(frame.wave?t('combat.wave',{wave:frame.wave+1}):t('combat.firstWave'));tone(430+frame.wave*90,.12,'triangle');}
      if(frame.event){const text=eventText(frame.event);if(text)message(text);if(frame.event.type==='enemyPhase')banner(t('combat.enemyPhase'));if(frame.event.type==='meteor')banner(t('combat.stormStrike'));if(frame.event.type==='bossPhase')banner(t('combat.bossPhase'));}
      await scene.play(frame,settings,()=>{
        if(frame.snapshot){state={...state,...structuredClone(frame.snapshot)};scene.state=state;if(frame.snapshot.board)scene.setBoard(frame.snapshot.board);renderHUD();}
        if(frame.event?.amount)tone(frame.event.type==='attack'?150:frame.event.type==='heal'?720:480,.08);
      });
      if(frame.board){state={...state,board:frame.board};renderBoard(frame.board);}
    }
    logEntries=[...logEntries,...result.events].slice(-30);
    message(result.actions===1?t('combat.oneLeft'):t('combat.yourAction'));
    $('#live-status').textContent=battleAnnouncement(result);
  }catch(error){console.error('Combat presentation failed',error);message(t('graphics.interrupted'));}
  finally{busy=false;banner('',false);render();}
  if(session.profile.achievements.length>previousAchievements)toast(t('achievement.unlocked',{names:session.profile.achievements.slice(previousAchievements).map(id=>ACHIEVEMENTS[id].name).join(' · '),count:session.profile.achievements.length-previousAchievements}));
  if(session.run.phase!=='battle')focusView();
}

function tap(index) {
  if (busy || session.run?.phase!=='battle') return;
  const choice=chooseCell(state.board,selected,index); selected=choice.selected; updateSelection();
  if (choice.swap) runAction({type:'swap',a:choice.swap[0],b:choice.swap[1]});
  else if (selected!==null) { message(t('input.selectNeighbor',{tile:tileName(state.board.tiles[index])})); tone(650,.035); }
}
boardElement.addEventListener('pointerdown',e=>{
  if (!e.isPrimary || gesture || busy || session.run?.phase!=='battle' || e.button!==0) return;
  const tile=e.target.closest('[data-index]'); if (!tile || tile.disabled) return;
  gesture={id:e.pointerId,index:Number(tile.dataset.index),x:e.clientX,y:e.clientY,size:tile.getBoundingClientRect().width}; boardElement.setPointerCapture(e.pointerId);
});
boardElement.addEventListener('pointerup',e=>{
  if (!gesture || e.pointerId!==gesture.id) return;
  const current=gesture; gesture=null;
  const dx=e.clientX-current.x,dy=e.clientY-current.y;
  if (busy || session.run?.phase!=='battle') return;
  if (Math.max(Math.abs(dx),Math.abs(dy))<8) tap(current.index);
  else { const target=swipeTarget(state.board,current.index,dx,dy,current.size); if (target!==null) runAction({type:'swap',a:current.index,b:target}); else message(t('input.swipe')); }
});
boardElement.addEventListener('pointercancel',()=>{gesture=null;});
boardElement.addEventListener('lostpointercapture',()=>{gesture=null;});
boardElement.addEventListener('click',e=>{if(e.detail===0){const tile=e.target.closest('[data-index]'); if(tile)tap(Number(tile.dataset.index));}});
boardElement.addEventListener('keydown',e=>{
  const index=Number(e.target.dataset.index); if(!Number.isInteger(index))return;
  const vectors={ArrowLeft:[-50,0],ArrowRight:[50,0],ArrowUp:[0,-50],ArrowDown:[0,50]};
  if(vectors[e.key]){e.preventDefault();const target=swipeTarget(state.board,index,...vectors[e.key],44);if(target!==null)boardElement.querySelector(`[data-index="${target}"]`)?.focus();}
  else if(e.key==='Escape'){selected=null;updateSelection();}
});
$('#end-turn').onclick=()=>runAction({type:'endRound'});
$('#hint').onclick=()=>{
  if(busy || session.run?.phase!=='battle')return;
  const move=legalMoves(state.board)[0]; if(!move)return;
  scene?.hint(move);
  move.forEach(i=>boardElement.querySelector(`[data-index="${i}"]`)?.classList.add('hinted'));
  message(t('input.hintShown'));
  setTimeout(()=>boardElement.querySelectorAll('.hinted').forEach(e=>e.classList.remove('hinted')),3000);
};
function focusView(){const next=navigation.screen==='run'&&session.run?.phase==='battle'?$('#end-turn'):$('#view h1');next?.focus({preventScroll:true});}
function openScreen(screen){navigation=navigate(navigation,{type:'screen',value:screen});render();focusView();}
function renderFocused(selector){render();document.querySelector(selector)?.focus({preventScroll:true});}
function showModal(html,kind='info'){disposeCategoryPicker?.();disposeCategoryPicker=null;currentModal=kind;modal.dataset.kind=kind;$('#modal-body').innerHTML=html;if(!modal.open)modal.showModal();const title=$('#modal-body h2');if(title){title.id='modal-title';title.tabIndex=-1;modal.setAttribute('aria-labelledby',title.id);title.focus({preventScroll:true});}}
$('.close-modal').onclick=()=>modal.close();
modal.addEventListener('click',e=>{if(e.target===modal){const b=modal.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)modal.close();}});
function toast(text){let el=$('#toast');if(!el){el=document.createElement('div');el.id='toast';el.setAttribute('role','status');document.body.append(el);}el.textContent=text;el.classList.add('visible');setTimeout(()=>el.classList.remove('visible'),4500);}
function download(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function showReport(){
  if(busy||!session.run)return;
  const report=JSON.stringify(runReport(session.run),null,2);
  showModal(`<p class="modal-kicker">${t('feedback.kicker')}</p><h2>${t('report.title')}</h2><p>${t('report.description')}</p><textarea id="report-text" readonly aria-label="${t('report.label')}"></textarea><div class="modal-actions"><button id="copy-report" class="primary-button">${t('report.copy')}</button><button id="download-report" class="secondary-button">${t('report.download')}</button></div>`);
  currentModal='report';modal.dataset.kind='report';$('#report-text').value=report;
  $('#download-report').onclick=()=>download(report,reportFilename(session.run));
  $('#copy-report').onclick=async()=>{try{await navigator.clipboard.writeText(report);$('#copy-report').textContent=t('report.copied');}catch{$('#report-text').select();$('#copy-report').textContent=t('report.manualCopy');}};
}
function showAbandon(){showModal(`<p class="modal-kicker">${t('menu.new')}</p><h2>${t('menu.replaceTitle')}</h2><p>${t('menu.replaceBody')}</p><div class="modal-actions"><button class="secondary-button" data-action="close">${t('common.cancel')}</button><button class="primary-button" data-action="abandon">${t('menu.replaceConfirm')}</button></div>`);}
$('.brand').onclick=e=>{e.preventDefault();if(!busy)openScreen('main');};
$('#restart').onclick=()=>{if(!busy)openScreen('main');};
$('#report').onclick=showReport;
const showFeedback=feedbackDialog({showModal:html=>showModal(html,'feedback'),getRun:()=>corrupt?null:session.run});
$('#feedback-open').onclick=()=>{if(!busy)showFeedback();};
$('#sound').onclick=()=>{soundEnabled=!soundEnabled;$('#sound').innerHTML=icon(soundEnabled?'sound':'mute');$('#sound').setAttribute('aria-pressed',String(soundEnabled));$('#sound').setAttribute('aria-label',soundEnabled?t('sound.disable'):t('sound.enable'));tone();settings={...settings,sound:soundEnabled};persistSettings(storage,settings);};

/** Long reference material uses bounded pages, never an expanding document. */
function showHelp(page=0){
  const pages=[
    ['menu.matchRules',`<p>${t('help.actions')}</p><p>${t('help.bonuses')}</p>`],
    ['menu.controls',`<ul>${['touch','mouse','keyboard','target'].map(key=>`<li>${t(`help.${key}`)}</li>`).join('')}</ul>`],
    ['menu.hazards',`<p>${t('help.hazards')}</p><p>${t('help.boss')}</p>`],
    ['menu.stormRules',`<p>${t('storm.roundRules')}</p><p>${t('storm.craterRules',{damageRules:session.run?.battle?.ruleset===1?t('storm.legacyRules'):t('storm.damageRules')})}</p>`],
    ['menu.healingRules',`<p>${t('storm.healingRules')}</p><p>${t('storm.travelRules')}</p>`],
    ['menu.progressRules',`<p>${t('help.progress')}</p>`],
  ];
  modalPage=paginate(pages,page,1).page;
  showModal(`<p class="modal-kicker">${t('menu.guide')}</p><h2>${t(pages[modalPage][0])}</h2><div class="guide-copy">${pages[modalPage][1]}</div><div class="dialog-bottom">${pager('guide',{page:modalPage,pages:pages.length})}<button class="secondary-button" data-action="glossary">${t('menu.glossary')}</button></div>`,'guide');
}
function showGlossary(){
  showModal(`<button class="text-button dialog-back" data-action="guide">← ${t('menu.rules')}</button>${glossaryView(glossaryState)}`,'glossary');
  disposeCategoryPicker=bindCategoryPicker($('#glossary-picker'),group=>{
    glossaryState={group,page:0,term:null};showGlossary();$('#glossary-category').focus({preventScroll:true});
  });
}
function showInventory(page=0){
  const slice=paginate(session.run?.artifacts??[],page,4);modalPage=slice.page;
  showModal(`<p class="modal-kicker">${t('inventory.kicker')}</p><h2>${t('inventory.title')}</h2>${relicInventory(slice.items)}${pager('inventory',slice)}<button class="text-button glyph-open" data-action="glyphs">${t('glyph.title')} →</button>`,'inventory');
}
function showJournal(page=0){
  const entries=logEntries.slice(-30).reverse().map(eventText).filter(Boolean),slice=paginate(entries,page,5);modalPage=slice.page;
  showModal(`<p class="modal-kicker">${t('journal.kicker')}</p><h2>${t('journal.title')}</h2><ol class="journal-list">${slice.items.map(text=>`<li>${escape(text)}</li>`).join('')||`<li>${t('menu.logEmpty')}</li>`}</ol>${pager('journal',slice)}`,'journal');
}
$('#storm-help').onclick=()=>showHelp(3);
$('#help').onclick=()=>showHelp();
/** Route, catalog and menu commands update presentation state independently from the game session. */
document.addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.language){
    if(busy)return;
    settings={...settings,language:button.dataset.language};applyLanguage();savePreferences();render();showSettings();
    document.querySelector(`[data-language="${getLanguage()}"]`)?.focus();return;
  }
  if(button.dataset.speed){settings={...settings,speed:Number(button.dataset.speed)};savePreferences();showSettings();return;}
  if(button.dataset.page){
    const page=Number(button.dataset.pageValue),kind=button.dataset.page;
    if(kind==='workshop'){navigation=navigate(navigation,{type:'workshopPage',value:page});renderFocused('.catalog-choice');}
    else if(kind==='glossary'){glossaryState={...glossaryState,page,term:null};showGlossary();}
    else if(kind==='guide')showHelp(page);
    else if(kind==='inventory')showInventory(page);
    else if(kind==='journal')showJournal(page);
    return;
  }
  if(button.dataset.select==='term'){glossaryState={...glossaryState,term:button.dataset.value};showGlossary();document.getElementById(`choice-term-${button.dataset.value}`)?.focus({preventScroll:true});return;}
  if(button.dataset.action==='glossary'){showGlossary();return;}
  if(button.dataset.action==='guide'){showHelp();return;}
  if(button.dataset.action==='settings'){showSettings();return;}
  if(button.dataset.glyphLoadout){const id=button.dataset.glyphLoadout;showModal(glyphFrequencyView({glyphVersion:1,loadout:id,artifacts:[LOADOUTS[id].artifact]}),'glyphs');return;}
  if(button.dataset.action==='glyphs'){showModal(glyphFrequencyView(session.run),'glyphs');return;}
  if(button.dataset.action==='inventory'){showInventory();return;}
  if(button.dataset.action==='inventory-back'){showInventory(modalPage);return;}
  if(button.dataset.relic){const a=ARTIFACTS[button.dataset.relic],back=currentModal==='inventory'?`<button class="text-button dialog-back" data-action="inventory-back">← ${t('inventory.title')}</button>`:'';showModal(`${back}<span class="rune-large ${a.color}">${icon(a.icon)}</span><h2>${a.name}</h2><p>${a.text}</p>`);return;}
  if(button.dataset.info){const type=button.dataset.info;if(['steel','fire','ice','poison','heal'].includes(type))showModal(`<span class="rune-large ${type}">${icon(type)}</span><h2>${tileName(type)}</h2><p>${t(`tile.${type}.description`)}</p><p class="modal-warning">${t('tile.bonuses')}</p><button class="secondary-button" data-action="glyphs">${t('glyph.title')}</button>`);return;}
  if(button.dataset.resist){const [type,mult]=button.dataset.resist.split(':');showModal(`<h2>${Number(mult)<1?t('combat.resistance'):t('combat.weakness')}: ${tileName(type)}</h2><p>${t('combat.resistanceDescription',{mult:Number(mult)})}</p>`);return;}
  if(busy)return;
  if(button.dataset.screen){openScreen(button.dataset.screen);return;}
  if(button.dataset.workshopTab){navigation=navigate(navigation,{type:'workshopTab',value:button.dataset.workshopTab});renderFocused(`#tab-${navigation.workshopTab}`);return;}
  if(button.dataset.mapFloor!==undefined){navigation=navigate(navigation,{type:'mapFloor',value:Number(button.dataset.mapFloor)});renderFocused(`[data-map-floor="${navigation.mapFloor}"]`);return;}
  if(button.dataset.select){navigation=navigate(navigation,{type:button.dataset.select,value:button.dataset.select==='reward'?Number(button.dataset.value):button.dataset.value});renderFocused(`#${button.id}`);return;}
  if(button.dataset.target!==undefined){commit(battleAction(session,{type:'target',target:Number(button.dataset.target)}));render();return;}
  if(button.dataset.unlock){const previous=session;commit(buyUnlock(session,button.dataset.unlock));renderFocused('.catalog-choice[aria-pressed="true"]');if(previous!==session)toast(t('workshop.unlocked'));return;}
  if(button.dataset.node){commit(enterNode(session,button.dataset.node));selected=null;logEntries=[];render();focusView();return;}
  if(button.dataset.reward){commit(chooseReward(session,button.dataset.reward));render();focusView();return;}
  if(button.dataset.choice){commit(chooseEvent(session,button.dataset.choice));render();focusView();return;}
  switch(button.dataset.action){
    case 'prepare':if(isActive(session))showAbandon();else openScreen('loadout');break;
    case 'start': { const values=new Uint32Array(1);crypto.getRandomValues(values);const seed=new URLSearchParams(location.search).get('seed')?.slice(0,80)||(session.profile.stats.runs===0?'ISKRA-01':`ISKRA-${values[0].toString(36).toUpperCase()}`);commit(startRun(session,seed,navigation.loadout));openScreen('run');break; }
    case 'continue':openScreen('run');break;
    case 'home':openScreen('main');break;
    case 'report':showReport();break;
    case 'close':modal.close();break;
    case 'abandon':commit(abandonRun(session));modal.close();openScreen('loadout');break;
    case 'export-corrupt':download(loaded.raw,'sparkfall-recovery.json');break;
    case 'reset-corrupt':showModal(`<h2>${t('recovery.confirmTitle')}</h2><p>${t('recovery.confirmDescription')}</p><div class="modal-actions"><button class="secondary-button" data-action="close">${t('common.cancel')}</button><button class="primary-button" data-action="confirm-reset">${t('recovery.confirm')}</button></div>`);break;
    case 'confirm-reset':corrupt=false;commit(createSession());modal.close();openScreen('main');break;
  }
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!modal.open&&!busy&&navigation.screen!=='main'){event.preventDefault();openScreen('main');}
  if(event.target.getAttribute?.('role')==='tab'&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
    event.preventDefault();const tabs=[...event.target.parentElement.querySelectorAll('[role="tab"]')],index=tabs.indexOf(event.target);
    tabs[event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length].click();
  }
});
function savePreferences(){
  document.body.classList.toggle('reduced-motion',settings.reducedMotion);
  reducedMotion=settings.reducedMotion;if(scene){scene.reducedMotion=reducedMotion;if(scene.frame){scene.frame.settings=settings;scene.frame.duration=frameDuration(scene.frame,settings);}}
  const saved=persistSettings(storage,settings);if(!saved.ok)toast(t('settings.unsaved'));
}
/** Language lives in presentation settings; changing it never commits a game session. */
function applyLanguage(){
  setLanguage(settings.language);localizeDocument();
  $('#sound').setAttribute('aria-label',t(soundEnabled?'sound.disable':'sound.enable'));
  $('#save-status').textContent=t(saveStatus);
  if(lastSaveError)storageWarning(lastSaveError);
  if(sceneError)$('#graphics-error').textContent=t(sceneError.key,sceneError.parameters);
  $('#live-status').textContent=battleAnnouncement(navigation.screen==='run'?state:null);
  if($('#toast')){$('#toast').textContent='';$('#toast').classList.remove('visible');}
  message(t('shell.instructions'));
}
function showSettings(){
  showModal(`<p class="modal-kicker">${t('settings.kicker')}</p><h2>${t('settings.title')}</h2><fieldset id="language-options" class="language-options" ${busy?'disabled':''}><legend>${t('settings.language')}</legend><button type="button" class="secondary-button" data-language="ru" lang="ru" aria-pressed="${getLanguage()==='ru'}">Русский</button><button type="button" class="secondary-button" data-language="en" lang="en" aria-pressed="${getLanguage()==='en'}">English</button></fieldset><p id="language-busy-note" class="section-note" ${busy?'':'hidden'}>${t('settings.languageBusy')}</p><p>${t('settings.description')}</p><div class="speed-options">${[.5,1,2].map(speed=>`<button class="secondary-button" data-speed="${speed}" aria-pressed="${settings.speed===speed}">${number(speed)}×<small>${speed===.5?t('settings.slow'):speed===1?t('settings.normal'):t('settings.fast')}</small></button>`).join('')}</div><label class="motion-option"><input id="motion-setting" type="checkbox" ${settings.reducedMotion?'checked':''}>${t('settings.reducedMotion')}</label><p class="section-note">${t('settings.motionDescription')}</p><button class="secondary-button glossary-open" data-action="glossary">${t('glossary.open')}</button>`,'settings');
  $('#motion-setting').onchange=e=>{settings={...settings,reducedMotion:e.target.checked};savePreferences();};
}
$('#settings').onclick=showSettings;
$('#inventory-open').onclick=()=>showInventory();
$('#journal-open').onclick=()=>showJournal();
applyLanguage();
document.body.classList.toggle('reduced-motion',settings.reducedMotion);
render();
