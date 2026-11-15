import { BattleScene } from '../presentation/scene.js';
import { t } from '../i18n/index.js';
import { buildTimeline } from '../presentation/timeline.js';
import { replayReport } from '../core/replay.js';
import { battleAction } from '../core/run.js';
import { ENEMIES, ARTIFACTS } from '../core/content.js';
import { stormDepth, nextMeteorDamage, healingBlock } from '../core/storm.js';

// The recorder copies the actual animated canvas; only the readable HUD is composited for video.
const canvas=document.querySelector('#output'),context=canvas.getContext('2d');
const status=document.querySelector('#status'),button=document.querySelector('#record');
const report=await (await fetch('./demo-report.json')).json(),start=55;
let session=replayReport({...report,decisions:report.decisions.slice(0,start)}),view=session.run.battle,caption='Сборка для жизни внутри шторма',recording=false;
const scene=new BattleScene(document.querySelector('#stage'),()=>{},key=>{status.textContent=t(key);});
scene.setState(view);await scene.load();scene.active=true;button.disabled=false;status.textContent='Готово. Около 32 секунд, обычная скорость анимаций.';
const colors={steel:'#eee3cf',fire:'#ffb455',ice:'#86ecf2',poison:'#c1e775',heal:'#f7a6c1'};
const names={steel:'Клинок',fire:'Огонь',ice:'Холод',poison:'Яд',heal:'Зелье'};
function text(value,x,y,size=14,color='#eee0cf'){context.font=`bold ${size}px Consolas,monospace`;context.fillStyle=color;context.fillText(value,x,y);}
function panel(x,y,w,h){context.fillStyle='#191625ed';context.fillRect(x,y,w,h);context.strokeStyle='#a183a0';context.strokeRect(x+.5,y+.5,w,h);}
function draw(){
  context.imageSmoothingEnabled=false;context.fillStyle='#181725';context.fillRect(0,0,960,780);
  context.drawImage(scene.renderer.domElement,0,56,960,scene.layout.height);
  text('✦ ИСКРОПАД',24,33,24,'#edc485');text('ШТОРМОВАЯ СБОРКА · 0.5',305,30,12,'#bdb0ca');
  text(`ГЛУБИНА ${stormDepth(view.storm.gap)} · СЛЕД. УДАР ${nextMeteorDamage(view)}`,660,31,12,'#e5b4f3');
  const hero=scene.layout.actors[0];panel(hero.x-88,65,176,76);text('ИНЖЕНЕР-АЛХИМИК',hero.x-79,82,11);text(`${view.player.hp} / 70`,hero.x-79,105,20,'#b8cf9a');context.fillStyle='#302536';context.fillRect(hero.x-79,112,158,5);context.fillStyle='#b8cf9a';context.fillRect(hero.x-79,112,158*view.player.hp/70,5);text(healingBlock(view.storm.gap,view.artifacts,view.ruleset)?'ЛЕЧЕНИЕ ЗАКРЫТО':'ЛЕЧЕНИЕ В ШТОРМЕ',hero.x-79,133,10,'#b8cf9a');
  view.enemies.forEach((enemy,i)=>{const a=scene.layout.actors[i+1];panel(a.x-100,65,200,78);text(`${ENEMIES[enemy.id].name}`,a.x-92,83,12);text(`${enemy.hp} / ${enemy.maxHp}  · ФАЗА ${enemy.stage}`,a.x-92,104,13,'#e0b6d1');context.fillStyle='#352538';context.fillRect(a.x-92,112,184,5);context.fillStyle='#bf89ae';context.fillRect(a.x-92,112,184*enemy.hp/enemy.maxHp,5);text(`ЯД ${enemy.poison}   ОЗНОБ ${enemy.chill}`,a.x-92,133,11,'#c1e775');});
  const board=scene.layout.board;panel(board.x,board.y+32,board.size,23);text(`РАУНД ${view.round}`,board.x+8,board.y+48,11);text(`${view.actions} ДЕЙСТВИЯ`,board.x+board.size-110,board.y+48,11,'#edc485');
  text(caption,24,732,14,'#edc485');
  view.artifacts.forEach((id,i)=>{text(ARTIFACTS[id].name,24+i*155,764,10,colors[ARTIFACTS[id].color]??'#d8b9ee');});
  requestAnimationFrame(draw);
}
draw();
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
button.onclick=async()=>{
  if(recording)return;recording=true;button.disabled=true;
  const chunks=[],stream=canvas.captureStream(30),mimeType=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
  const recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:4500000});
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  recorder.onstop=()=>{stream.getTracks().forEach(track=>track.stop());const link=document.querySelector('#download');link.href=URL.createObjectURL(new Blob(chunks,{type:mimeType}));link.hidden=false;status.textContent='Запись готова: реальный бой, реальные результаты.';};
  recorder.start();status.textContent='Идёт запись…';await pause(1000);
  for(const decision of report.decisions.slice(start)){
    const before=session.run.battle;session=battleAction(session,decision.action);const after=session.run.battle;
    for(const frame of buildTimeline(before,after)){
      const e=frame.event;
      if(frame.kind==='match')caption=frame.wave?`КАСКАД ×${frame.wave+1}`:'СОВПАДЕНИЕ';
      if(e){const source=e.artifact?`${ARTIFACTS[e.artifact].name}: `:'';caption=source+({damage:`${names[e.element]} · ${e.amount} урона`,heal:`+${e.amount} здоровья`,meteor:`Метеорит · ${e.amount} урона`,attack:`Ответ врага · ${e.amount} урона`,bossPhase:'ВТОРАЯ ФАЗА · УГЛЫ МАТРИЦЫ РАЗРУШЕНЫ',poison:`Яд +${e.amount}`,poisonTick:`Яд · ${e.amount} урона`}[e.type]??'Контур реагирует');}
      await scene.play(frame,{speed:1,reducedMotion:false},()=>{if(frame.snapshot){view={...view,...structuredClone(frame.snapshot)};scene.state=view;if(frame.snapshot.board)scene.setBoard(frame.snapshot.board);}});
      if(frame.board){view={...view,board:frame.board};scene.setBoard(frame.board);}
    }
    view=after;scene.setState(view);
  }
  caption=`ПОБЕДА · ГЛУБИНА ${stormDepth(view.storm.gap)} · ${view.player.hp} HP`;await pause(2000);recorder.stop();
};
