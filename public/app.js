import { BattleScene } from './presentation/scene.js';
import { buildTimeline, frameDuration } from './presentation/timeline.js';
import { loadSettings, persistSettings } from './presentation/settings.js';
import { intentDamage, currentIntent } from './core/battle.js';
import { legalMoves } from './core/board.js';
import { swipeTarget, chooseCell } from './core/input.js';
import { createSession, startRun, enterNode, battleAction, chooseReward, chooseEvent, abandonRun, buyUnlock, isActive } from './core/run.js';
import { loadSession, saveSession } from './core/save.js';
import { ARTIFACTS, ENEMIES, LOADOUTS, ACHIEVEMENTS } from './core/content.js';
import { homeView, mapView, rewardView, eventView, resultView, relicInventory, escape } from './views.js';
import { icon } from './icons.js';
import { inStorm, stormDepth, nextMeteorDamage, healingBlock } from './core/storm.js';
import { weatherLabel } from './views.js';
import { runReport } from './report.js';
import { feedbackDialog } from './feedback-dialog.js';

const $ = selector => document.querySelector(selector);
const boardElement = $('#board'); const modal = $('#modal');
const names = {steel:'Клинок',fire:'Огонь',ice:'Холод',poison:'Яд',heal:'Лечение'};
let storage;
try { storage = window.localStorage; } catch { storage = null; }
const loaded = storage ? loadSession(storage) : {ok:false,error:'Хранилище браузера недоступно',raw:null};
let session = loaded.ok ? loaded.session : createSession();
let corrupt = !loaded.ok && loaded.raw !== null;
let state = session.run?.battle;
let showHome = !session.run;
let loadout = session.run?.loadout ?? 'coil';
let settings=loadSettings(storage,{reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
let selected=null,busy=false,gesture=null,soundEnabled=settings.sound,audioContext;
let reducedMotion=settings.reducedMotion;
let scene,sceneError=null;
try {
  scene=new BattleScene($('#combat-stage'),applyLayout,graphicsFailure);
  scene.load().then(()=>{if(state)render();}).catch(error=>graphicsFailure(`Не удалось загрузить графику: ${error.message}`));
} catch(error) { graphicsFailure('Для сцены нужен WebGL 2. Включи аппаратное ускорение браузера и обнови страницу.'); }
let logEntries = state?.events ?? [];
const message = text => { $('#move-message').textContent = text; };
const banner = (text,visible=true) => { $('#board-banner').textContent=text; $('#board-banner').classList.toggle('visible',visible); };

document.querySelectorAll('[data-icon]').forEach(e=>{e.innerHTML=icon(e.dataset.icon);});
$('#storm-icon').innerHTML=icon('storm'); $('#sound').innerHTML=icon(soundEnabled?'sound':'mute');
$('#sound').setAttribute('aria-pressed',String(soundEnabled));
$('#sound').setAttribute('aria-label',soundEnabled?'Выключить звук':'Включить звук');
if (!loaded.ok) storageWarning(loaded.error);

function storageWarning(error) {
  $('#save-warning').hidden = false;
  $('#save-warning').textContent = `Сохранение недоступно: ${error}. Прогресс остаётся в памяти вкладки — выгрузи отчёт перед закрытием.`;
  $('#save-status').textContent = 'НЕ СОХРАНЕНО';
}
/** Persist the complete result before starting any animation or changing views. */
function commit(next) {
  if (next === session || corrupt) return;
  session = next;
  const result = storage ? saveSession(storage,session) : {ok:false,error:'Хранилище браузера недоступно'};
  if (result.ok) { $('#save-warning').hidden=true; $('#save-status').textContent='СОХРАНЕНО НА УСТРОЙСТВЕ'; }
  else storageWarning(result.error);
}
function render() {
  if (corrupt) {
    if(scene)scene.active=false;
    $('#combat-view').hidden=true; $('#view').hidden=false;
    $('#view').innerHTML=`<section class="event-view"><p class="eyebrow">ВОССТАНОВЛЕНИЕ ПРОФИЛЯ</p><h1>Сохранение требует внимания.</h1><p>${escape(loaded.error)}</p><p>Исходные данные сохранены. Выгрузи их перед сбросом — автоматически ничего не перезаписывается.</p><div class="modal-actions"><button class="secondary-button" data-action="export-corrupt">Выгрузить исходный файл</button><button class="primary-button" data-action="reset-corrupt">Сбросить профиль</button></div></section>`;
    return;
  }
  const run=session.run;
  const combat=!showHome && run?.phase==='battle';
  $('#combat-view').hidden=!combat; $('#view').hidden=combat;
  document.body.classList.toggle('in-combat',combat);
  if(scene){scene.active=combat;scene.reducedMotion=settings.reducedMotion;}
  document.body.classList.toggle('storm-active',Boolean(combat && inStorm(run.gap)));
  document.body.classList.toggle('busy',busy);
  $('#seed-label').textContent=run?.seed ?? 'НИЖНИЙ ГОРОД';
  $('#report').disabled=!run || busy; $('#restart').disabled=busy; $('#feedback-open').disabled=busy;
  $('#restart').textContent=isActive(session) && showHome ? 'Завершить экспедицию' : 'В мастерскую ↗';
  if (combat) { state=run.battle; renderBattle(); return; }
  if (showHome || !run) $('#view').innerHTML=homeView(session,loadout);
  else if (run.phase==='map') $('#view').innerHTML=mapView(run);
  else if (run.phase==='reward') $('#view').innerHTML=rewardView(run);
  else if (['event','rest'].includes(run.phase)) $('#view').innerHTML=eventView(run);
  else $('#view').innerHTML=resultView(session);
}
function renderBoard(board=state.board,matching=[]) {
  const focused=document.activeElement?.dataset.index; const hits=new Set(matching);
  boardElement.innerHTML=board.tiles.map((type,index)=>{
    const crater=board.craters[index], blocked=board.blocked[index], locked=board.locks[index], unstable=board.unstable[index];
    const marked=state.storm.target===index && !blocked;
    const blockedHeal=type==='heal' && Boolean(healingBlock(state.storm.gap,state.artifacts,state.ruleset));
    const label=`Ряд ${Math.floor(index/7)+1}, столбец ${index%7+1}: ${blocked?'разрушенная клетка':crater?`кратер, ${crater} раунда`:names[type]}${locked?', цепь: нельзя менять, можно собрать':''}${unstable?', нестабильность: 2 урона при сборе':''}${marked?', цель метеорита':''}${blockedHeal?', лечение заблокировано':''}`;
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
function graphicsFailure(text){sceneError=text;$('#graphics-error').hidden=false;$('#graphics-error').textContent=text;$('#end-turn').disabled=true;$('#hint').disabled=true;}
/** HUD state advances at impact boundaries, independently of the committed save. */
function renderHUD() {
  $('#hero-hp').textContent=`${state.player.hp} / ${state.player.maxHp}`;
  $('#hero-health').style.width=`${state.player.hp/state.player.maxHp*100}%`;
  $('#hero-hud').classList.toggle('critical',state.player.hp<=20);
  const storm=inStorm(state.storm.gap),block=healingBlock(state.storm.gap,state.artifacts,state.ruleset);
  $('#healing-status').textContent=block==='heart'?'Лечение: только в шторме':block?(state.artifacts.includes('stormweave')?'Лечение: только 4+':'Лечение заблокировано'):'Лечение доступно';
  $('#healing-status').classList.toggle('blocked',Boolean(block));
  $('#hero-shield').textContent=state.player.stormShield?`Щит от метеорита: ${state.player.stormShield}`:'';
  $('#storm-count').textContent=storm?`ГЛУБИНА ${stormDepth(state.storm.gap)}`:state.storm.gap;
  $('#storm-caption').textContent=storm?`след. удар ${nextMeteorDamage(state)}`:'раундов до фронта';
  document.body.classList.toggle('storm-active',storm);
  $('#storm-help').classList.toggle('caught',storm);
  $('#enemy-huds').innerHTML=state.enemies.map((enemy,i)=>{
    const data=ENEMIES[enemy.id],intent=currentIntent(enemy),amount=Math.floor(intentDamage(enemy)*(state.artifacts.includes('glass')?1.2:1));
    return `<div class="actor-hud enemy-hud ${i===state.target?'chosen':''} ${enemy.hp<=0?'dead':''}"><button class="enemy-name" data-target="${i}" ${busy||enemy.hp<=0?'disabled':''} aria-pressed="${i===state.target}">${data.name}${enemy.id==='heart'?` <small>ФАЗА ${enemy.stage}</small>`:''}</button><div class="health-bar enemy-health"><span style="width:${enemy.hp/enemy.maxHp*100}%"></span></div><div class="enemy-vitals"><b>${enemy.hp}/${enemy.maxHp}</b><span class="ice">${enemy.chill?`❄${enemy.chill}`:''}</span><span class="poison">${enemy.poison?`☠${enemy.poison}`:''}</span></div><div class="hud-intent" title="${intent.name}">${enemy.hp<=0?'Повержен':intent.kind==='attack'?`${icon('steel')} ${amount}`:intent.kind==='locks'?`⛓ ${intent.amount}`:intent.kind==='unstable'?`! ${intent.amount}`:'Зарядка'}</div><div class="hud-resists">${Object.entries(enemy.resists).map(([type,mult])=>`<button data-resist="${type}:${mult}" class="${type}" aria-label="${data.name}: ${names[type]} ×${mult}">${icon(type)}<span>×${String(mult).replace('.',',')}</span></button>`).join('')}</div></div><button class="actor-target" data-target="${i}" ${busy||enemy.hp<=0?'disabled':''} aria-label="Выбрать цель: ${data.name}. ${enemy.hp} здоровья. ${intent.name}${intent.kind==='attack'?` ${amount}`:''}"></button>`;
  }).join('');
  $('#round-label').textContent=`РАУНД ${state.round}`;
  $('#actions-label').textContent=busy?'ДЕЙСТВИЕ…':`${state.actions} ${state.actions===1?'ДЕЙСТВИЕ':'ДЕЙСТВИЯ'}`;
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
function eventText(e) {
  const source=e.artifact?`${ARTIFACTS[e.artifact]?.name}: `:'';
  const texts={chill:`Озноб: ${e.amount} зарядов. Следующая атака слабее.`,damage:`${names[e.element]}: ${e.amount} урона.`,poison:`Яд: +${e.amount} зарядов.`,poisonTick:`Яд сработал: ${e.amount} урона${e.killed?' · противник повержен':''}.`,heal:e.amount?`Восстановлено ${e.amount} здоровья.`:'Здоровье полностью восстановлено.',healBlocked:e.reason==='heart'?'Сердце бури блокирует лечение вне шторма.':'Шторм заблокировал обычное лечение.',attack:`Противник атакует: −${e.amount} здоровья.`,meteor:`Метеорит: −${e.amount} здоровья. Кратер на 2 раунда.${e.absorbed?` Щит поглотил ${e.absorbed}.`:''}`,storm:`Шторм ближе. ${weatherLabel(e.gap)}.`,ward:`Щит от метеорита: ${e.amount}.`,locks:'Тюремщик сковал клетки. Собери их косвенно.',unstable:`Нестабильный эфир${e.source!==undefined?' заражает клетки':`: −${e.amount} здоровья`}.`,charge:'Противник заряжает орудие.',bossPhase:'ВТОРАЯ ФАЗА: углы разрушены. Теперь босс уязвим к огню.',artifact:'Артефакт сработал.'};
  return texts[e.type]?source+texts[e.type]:'';
}
/** Animation reads snapshots; the resulting session has already been safely committed. */
async function runAction(action) {
  if(busy||sceneError||!scene?.ready||session.run?.phase!=='battle')return;
  const before=state,next=battleAction(session,action);
  if(next===session){selected=null;updateSelection();message('Нужна линия из 3 фишек. Действие не потрачено.');tone(150);return;}
  const previousAchievements=session.profile.achievements.length,result=next.run.battle;
  busy=true;selected=null;$('#report').disabled=true;$('#restart').disabled=true;$('#feedback-open').disabled=true;scene?.select(null);renderBattle();commit(next);
  try{
    for(const frame of buildTimeline(before,result)){
      if(frame.kind==='match'){banner(frame.wave?`КАСКАД ×${frame.wave+1}`:'СОВПАДЕНИЕ');tone(430+frame.wave*90,.12,'triangle');}
      if(frame.event){const text=eventText(frame.event);if(text)message(text);if(frame.event.type==='enemyPhase')banner('ОТВЕТ ПРОТИВНИКОВ');if(frame.event.type==='meteor')banner('УДАР ШТОРМА');if(frame.event.type==='bossPhase')banner('РАЗРЫВ КОНТУРА · ФАЗА II');}
      await scene.play(frame,settings,()=>{
        if(frame.snapshot){state={...state,...structuredClone(frame.snapshot)};scene.state=state;if(frame.snapshot.board)scene.setBoard(frame.snapshot.board);renderHUD();}
        if(frame.event?.amount)tone(frame.event.type==='attack'?150:frame.event.type==='heal'?720:480,.08);
      });
      if(frame.board){state={...state,board:frame.board};renderBoard(frame.board);}
    }
    logEntries=[...logEntries,...result.events].slice(-30);
    message(result.actions===1?'Ещё одно действие — затем ответят противники.':'Твой ход. Намерения врагов видны сверху.');
    $('#live-status').textContent=`Здоровье ${result.player.hp}. ${weatherLabel(result.storm.gap)}.`;
  }catch(error){console.error('Combat presentation failed',error);message('Показ прерван. Результат хода сохранён.');}
  finally{busy=false;banner('',false);render();}
  if(session.profile.achievements.length>previousAchievements)toast(`Открытие: ${session.profile.achievements.slice(previousAchievements).map(id=>ACHIEVEMENTS[id].name).join(' · ')} · +${session.profile.achievements.length-previousAchievements} ✦`);
  if(session.run.phase!=='battle')focusView();
}

function tap(index) {
  if (busy || session.run?.phase!=='battle') return;
  const choice=chooseCell(state.board,selected,index); selected=choice.selected; updateSelection();
  if (choice.swap) runAction({type:'swap',a:choice.swap[0],b:choice.swap[1]});
  else if (selected!==null) { message(`${names[state.board.tiles[index]]}: выбери соседнюю клетку.`); tone(650,.035); }
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
  else { const target=swipeTarget(state.board,current.index,dx,dy,current.size); if (target!==null) runAction({type:'swap',a:current.index,b:target}); else message('Свайпни к соседней клетке по горизонтали или вертикали.'); }
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
  message('Подсвечен допустимый обмен. Время и действия не потрачены.');
  setTimeout(()=>boardElement.querySelectorAll('.hinted').forEach(e=>e.classList.remove('hinted')),3000);
};
function focusView(){window.scrollTo({top:0,behavior:'instant'});const next=$('#view .current button:not(:disabled)');if(next)next.focus();else $('#view h1')?.focus({preventScroll:true});}
function showModal(html){$('#modal-body').innerHTML=html;if(!modal.open)modal.showModal();const title=$('#modal-body h2');if(title){title.id='modal-title';modal.setAttribute('aria-labelledby',title.id);}}
$('.close-modal').onclick=()=>modal.close();
modal.addEventListener('click',e=>{if(e.target===modal){const b=modal.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)modal.close();}});
function toast(text){let el=$('#toast');if(!el){el=document.createElement('div');el.id='toast';el.setAttribute('role','status');document.body.append(el);}el.textContent=text;el.classList.add('visible');setTimeout(()=>el.classList.remove('visible'),4500);}
function download(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function showReport(){
  if(busy||!session.run)return;
  const report=JSON.stringify(runReport(session.run),null,2);
  showModal('<p class="modal-kicker">ОБРАТНАЯ СВЯЗЬ</p><h2>Запись экспедиции</h2><p>Приложи этот отчёт к отзыву: где было интересно, где непонятно, чего не хватало. Решения и seed позволяют повторить забег. Ничего не отправляется автоматически.</p><textarea id="report-text" readonly aria-label="Отчёт о забеге"></textarea><div class="modal-actions"><button id="copy-report" class="primary-button">Скопировать</button><button id="download-report" class="secondary-button">Скачать JSON</button></div>');
  $('#report-text').value=report;
  $('#download-report').onclick=()=>download(report,`sparkfall-${r.seed.replace(/[^a-z0-9-]/gi,'_')}.json`);
  $('#copy-report').onclick=async()=>{try{await navigator.clipboard.writeText(report);$('#copy-report').textContent='Скопировано';}catch{$('#report-text').select();$('#copy-report').textContent='Выделено — скопируй вручную';}};
}
function showAbandon(){showModal('<p class="modal-kicker">ВОЗВРАЩЕНИЕ</p><h2>Закончить экспедицию?</h2><p>Заработанные искры сохранятся. Текущая матрица и артефакты останутся в городе.</p><div class="modal-actions"><button class="secondary-button" data-action="close">Продолжить</button><button class="primary-button" data-action="abandon">Вернуться с находками</button></div>');}
$('.brand').onclick=e=>{e.preventDefault();if(!busy){showHome=true;render();focusView();}};
$('#restart').onclick=()=>{if(busy)return;if(isActive(session)&&showHome)showAbandon();else{showHome=true;render();focusView();}};
$('#report').onclick=showReport;
const showFeedback=feedbackDialog({showModal,getRun:()=>corrupt?null:session.run});
$('#feedback-open').onclick=()=>{if(!busy)showFeedback();};
$('#sound').onclick=()=>{soundEnabled=!soundEnabled;$('#sound').innerHTML=icon(soundEnabled?'sound':'mute');$('#sound').setAttribute('aria-pressed',String(soundEnabled));$('#sound').setAttribute('aria-label',soundEnabled?'Выключить звук':'Включить звук');tone();settings={...settings,sound:soundEnabled};persistSettings(storage,settings);};

const descriptions={steel:'3 физического урона за фишку.',fire:'4 огненного урона за фишку. Проверяй сопротивления выбранной цели.',ice:'2 урона за фишку и 1 озноб за группу. Озноб уменьшает следующую атаку на 20% за заряд, максимум на 40%. После атаки снимается.',poison:'2 яда за фишку. Перед ходом враг получает урон по числу зарядов с учётом защиты от яда; затем зарядов становится на один меньше.',heal:'2 здоровья за фишку. Внутри шторма обычное лечение заблокировано, но редкие артефакты меняют это правило. Совпадения и эффекты артефактов продолжают работать.'};
$('#storm-help').onclick=()=>showModal(`<p class="modal-kicker">ПОГОНЯ</p><h2>Шторм считает ходы.</h2><p>После всех действий героя и ответа противников фронт приближается на один шаг. Обычно действий два; форсированный привод даёт третье. Раздумья и анимации бесплатны.</p><p>${state?.ruleset===1?'В этом старом забеге метеорит наносит 4 урона, переход даёт +3 отрыва.':'Глубина 1–3: метеорит 4; 4–6: 6; 7 и глубже: 8. Глубина растёт без предела. Стеклянный усилитель увеличивает входящий урон; заземлитель поглощает до 4 урона метеорита.'} Кратеры живут 2 раунда, максимум три.</p><p>В шторме обычное лечение заблокировано. Грозовая перевязь лечит за первое совпадение 4+ за действие; сердце бури разрешает лечение внутри шторма и запрещает снаружи.</p><p class="modal-warning">Отрыв перехода указан на карте. Редкая награда за элиту: начать и закончить бой внутри шторма. Убийство последнего врага завершает бой до лишнего метеорита.</p>`);
$('#help').onclick=()=>{
  showModal('<p class="modal-kicker">ПОЛЕВАЯ ИНСТРУКЦИЯ</p><h2>Собери. Ударь. Уходи.</h2><p>Меняй соседние фишки, собирая 3 в ряд. Обычно два успешных обмена — затем отвечают враги. Форсированный привод даёт третье действие. Любое число каскадов стоит одно действие. Ошибочный обмен бесплатный.</p><ul><li>Телефон: два нажатия или свайп.</li><li>Мышь: два клика или перетаскивание.</li><li>Клавиатура: стрелки, Enter или пробел.</li><li>Нажми на противника, чтобы выбрать цель. Намерения всех противников видны.</li><li>Цепь нельзя двигать, но можно собрать косвенно. Нестабильная клетка наносит 2 урона перед эффектом своей группы.</li><li>При половине здоровья босс разрушит углы и поменяет слабости.</li></ul><p>4 фишки дают ×1,25 эффекта, 5+ — ×1,5. Нажимай на символы и артефакты для подробностей.</p><label><input type="checkbox" id="motion-setting"> Уменьшить анимации</label><p class="modal-warning">Искры открывают новые артефакты и стартовые наборы в мастерской. Постоянных прибавок к силе нет. Каждый результат хода сохраняется до анимации.</p>');
  $('#motion-setting').checked=reducedMotion;
  $('#motion-setting').onchange=e=>{reducedMotion=e.target.checked;settings={...settings,reducedMotion};if(scene)scene.reducedMotion=reducedMotion;persistSettings(storage,settings);};
};
/** One delegated handler covers dynamically rendered map, workshop and reward controls. */
document.addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.relic){const a=ARTIFACTS[button.dataset.relic];showModal(`<span class="rune-large ${a.color}">${icon(a.icon)}</span><h2>${a.name}</h2><p>${a.text}</p>`);return;}
  if(button.dataset.info){const type=button.dataset.info;if(descriptions[type])showModal(`<span class="rune-large ${type}">${icon(type)}</span><h2>${names[type]}</h2><p>${descriptions[type]}</p><p class="modal-warning">4 фишки: ×1,25. 5 и больше: ×1,5. Весь каскад — одно действие.</p>`);return;}
  if(button.dataset.resist){const [type,mult]=button.dataset.resist.split(':');showModal(`<h2>${Number(mult)<1?'Сопротивление':'Слабость'}: ${names[type]}</h2><p>Урон этого типа умножается на ${mult}, затем округляется вниз. Сопротивление яду влияет на тики, а не на число зарядов.</p>`);return;}
  if(button.dataset.speed){settings={...settings,speed:Number(button.dataset.speed)};savePreferences();showSettings();return;}
  if(busy)return;
  if(button.dataset.target!==undefined){commit(battleAction(session,{type:'target',target:Number(button.dataset.target)}));render();return;}
  if(button.dataset.loadout){loadout=button.dataset.loadout;render();return;}
  if(button.dataset.unlock){commit(buyUnlock(session,button.dataset.unlock));render();toast('Чертёж открыт. Новая возможность доступна в следующей экспедиции.');return;}
  if(button.dataset.node){commit(enterNode(session,button.dataset.node));selected=null;logEntries=[];render();focusView();return;}
  if(button.dataset.reward){commit(chooseReward(session,button.dataset.reward));render();focusView();return;}
  if(button.dataset.choice){commit(chooseEvent(session,button.dataset.choice));render();focusView();return;}
  switch(button.dataset.action){
    case 'start': { const values=new Uint32Array(1);crypto.getRandomValues(values);const seed=new URLSearchParams(location.search).get('seed')?.slice(0,80)||(session.profile.stats.runs===0?'ISKRA-01':`ISKRA-${values[0].toString(36).toUpperCase()}`);commit(startRun(session,seed,loadout));showHome=false;render();focusView();break; }
    case 'continue':showHome=false;render();focusView();break;
    case 'home':showHome=true;render();focusView();break;
    case 'report':showReport();break;
    case 'close':modal.close();break;
    case 'abandon':commit(abandonRun(session));showHome=false;modal.close();render();focusView();break;
    case 'export-corrupt':download(loaded.raw,'sparkfall-recovery.json');break;
    case 'reset-corrupt':showModal('<h2>Удалить повреждённый профиль?</h2><p>Это удалит его сохранённый прогресс. Сначала выгрузи исходный файл, если он нужен.</p><div class="modal-actions"><button class="secondary-button" data-action="close">Отмена</button><button class="primary-button" data-action="confirm-reset">Сбросить и начать заново</button></div>');break;
    case 'confirm-reset':corrupt=false;commit(createSession());showHome=true;modal.close();render();break;
  }
});
function savePreferences(){
  reducedMotion=settings.reducedMotion;if(scene){scene.reducedMotion=reducedMotion;if(scene.frame){scene.frame.settings=settings;scene.frame.duration=frameDuration(scene.frame,settings);}}
  const saved=persistSettings(storage,settings);if(!saved.ok)toast('Не удалось сохранить настройки. Они действуют до закрытия вкладки.');
}
function showSettings(){
  showModal(`<p class="modal-kicker">ТЕМП ИГРЫ</p><h2>У каждого хода — свой ритм.</h2><p>Скорость влияет только на анимации. Правила, случайность и шаги шторма остаются прежними.</p><div class="speed-options">${[.5,1,2].map(speed=>`<button class="secondary-button" data-speed="${speed}" aria-pressed="${settings.speed===speed}">${speed===.5?'0,5':speed}×<small>${speed===.5?'Медленно':speed===1?'Спокойно':'Быстро'}</small></button>`).join('')}</div><label class="motion-option"><input id="motion-setting" type="checkbox" ${settings.reducedMotion?'checked':''}> Уменьшить движение</label><p class="section-note">Без рывков и тряски. Паузы и числа сохраняются, чтобы бой оставался читаемым.</p>`);
  $('#motion-setting').onchange=e=>{settings={...settings,reducedMotion:e.target.checked};savePreferences();};
}
$('#settings').onclick=showSettings;
$('#inventory-open').onclick=()=>showModal(`<p class="modal-kicker">ТВОЯ СБОРКА</p><h2>Артефакты экспедиции</h2>${relicInventory(state.artifacts)}`);
$('#journal-open').onclick=()=>showModal(`<p class="modal-kicker">ПОСЛЕДНИЕ СОБЫТИЯ</p><h2>Журнал боя</h2><ol class="journal-list">${logEntries.slice(-30).reverse().map(eventText).filter(Boolean).map(t=>`<li>${escape(t)}</li>`).join('')||'<li>Твой ход.</li>'}</ol>`);
render();
