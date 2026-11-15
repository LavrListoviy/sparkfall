import { t } from '../i18n/index.js';
import * as THREE from '../vendor/three/three.module.js';
import { combatLayout } from './layout.js';
import { frameDuration, advanceElapsed } from './timeline.js';
import { tileTexture, effectTexture } from './pixel-textures.js';
import { actorPose } from './motion.js';
import { stormTier, healingBlock } from '../core/storm.js';

const ATLAS={hero:0,furnace:1,sentinel:2,collector:3,guardian:4,jailer:5,alchemist:6,heart:7};
const COLORS={fire:'#ffb455',ice:'#86ecf2',poison:'#c1e775',poisonTick:'#c1e775',steel:'#eeeee2',heal:'#f7a6c1',meteor:'#dba7ff',attack:'#ff9a87',unstable:'#d898ee',ward:'#a9d9ff'};

/** WebGL-only view. It owns meshes and time, never game decisions, RNG or storage. */
export class BattleScene {
  constructor(host,onLayout,onFailure){
    this.host=host;this.onLayout=onLayout;this.onFailure=onFailure;
    this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.domElement.setAttribute('aria-hidden','true');host.prepend(this.renderer.domElement);
    this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(0,1,1,0,.1,1000);this.camera.position.z=100;
    this.cache=new Map();this.tiles=[];this.actors=[];this.targets=[];this.effects=[];
    this.selected=null;this.active=false;this.last=0;this.elapsed=0;this.reducedMotion=false;
    this.observer=new ResizeObserver(()=>{if(this.state)this.resize();});this.observer.observe(host);
    this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.failed=true;this.finishAnimation?.();onFailure('graphics.contextLost');});
    this.loop=this.loop.bind(this);this.raf=requestAnimationFrame(this.loop);
  }
  async load(){
    const loader=new THREE.TextureLoader();
    const [atlas,background]=await Promise.all([loader.loadAsync(new URL('../assets/pixel/characters.png',import.meta.url).href),loader.loadAsync(new URL('../assets/pixel/arena.png',import.meta.url).href)]);
    for(const t of [atlas,background]){t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;t.colorSpace=THREE.SRGBColorSpace;}
    this.atlas=atlas;
    this.background=this.sprite(background,-20);this.background.material.color.set('#a4a0b3');
    this.motes=Array.from({length:24},()=>this.sprite(this.cached('mote',()=>effectTexture('#d9acff','', 'spark')),1));
    this.ready=true;if(this.state)this.setState(this.state);
  }
  sprite(texture,z=1){const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));sprite.position.z=z;sprite.renderOrder=z;this.scene.add(sprite);return sprite;}
  place(sprite,x,y,width,height=width){sprite.position.x=x;sprite.position.y=this.layout.height-y;sprite.scale.set(width,height,1);}
  cached(key,create){if(!this.cache.has(key))this.cache.set(key,create());return this.cache.get(key);}
  clearActors(){for(const sprite of [...this.actors,...this.targets]){this.scene.remove(sprite);sprite.material.map?.dispose();sprite.material.dispose();}this.actors=[];this.targets=[];}
  /** Layout is also applied to the DOM input layer, so hit areas match the rendered board. */
  resize(){
    const width=this.host.clientWidth;if(!width)return;
    this.layout=combatLayout(width,innerHeight,this.state?.enemies.length??1);
    this.host.style.height=`${this.layout.height}px`;
    this.renderer.setSize(width,this.layout.height);
    this.camera.right=width;this.camera.top=this.layout.height;this.camera.updateProjectionMatrix();
    if(this.background){
      // A wide crop retains the wall and floor without stretching the original arena.
      this.place(this.background,width/2,this.layout.height/2,Math.max(width,this.layout.height*1.5),Math.max(this.layout.height,width/1.5));
    }
    this.onLayout(this.layout);this.positionObjects();
  }
  setState(state){
    const roomKey=`${state.seed}:${state.room}`;
    if(roomKey!==this.roomKey){this.roomKey=roomKey;this.arrival=0;}
    this.state=state;this.board=state.board;this.resize();if(!this.ready)return;
    const ids=['hero',...state.enemies.map(e=>e.id)];
    if(ids.join()!==this.actorKey){
      this.clearActors();this.actorKey=ids.join();
      for(const id of ids){
        const index=ATLAS[id],texture=this.atlas.clone();texture.repeat.set(.5,.25);texture.offset.set((index%2)*.5,.75-Math.floor(index/2)*.25);texture.needsUpdate=true;
        this.actors.push(this.sprite(texture,3));
        const canvas=document.createElement('canvas');canvas.width=64;canvas.height=12;const c=canvas.getContext('2d');c.fillStyle='#e7be7a';c.fillRect(8,4,48,2);c.fillRect(4,2,4,6);c.fillRect(56,2,4,6);
        const textureMark=new THREE.CanvasTexture(canvas);textureMark.magFilter=THREE.NearestFilter;this.targets.push(this.sprite(textureMark,2));
      }
    }
    this.setBoard(state.board);this.positionObjects();
  }
  setBoard(board,matching=[]){
    this.board=board;this.matching=new Set(matching);if(!this.ready||!this.layout)return;
    while(this.tiles.length<49)this.tiles.push(this.sprite(null,5));
    board.tiles.forEach((type,i)=>{
      const options={selected:this.selected===i||this.hints?.includes(i),locked:board.locks[i],unstable:board.unstable[i],marked:this.state.storm.target===i&&!board.blocked[i],age:board.craters[i],blockedHeal:type==='heal'&&Boolean(healingBlock(this.state.storm.gap,this.state.artifacts,this.state.ruleset))};
      const kind=board.blocked[i]?'void':board.craters[i]?'crater':type;
      const key=JSON.stringify([kind,options]);this.tiles[i].material.map=this.cached(key,()=>tileTexture(kind,options));this.tiles[i].material.needsUpdate=true;
    });this.positionObjects();
  }
  select(index){this.selected=index;this.setBoard(this.board);}
  hint(indices){this.hints=indices;this.setBoard(this.board);clearTimeout(this.hintTimer);this.hintTimer=setTimeout(()=>{this.hints=[];if(this.board)this.setBoard(this.board);},2500);}
  positionObjects(){
    if(!this.layout)return;
    const {board,actors}=this.layout;
    this.tiles.forEach((tile,i)=>{this.place(tile,board.x+board.padding+(i%7)*(board.cell+board.gap)+board.cell/2,board.y+board.padding+Math.floor(i/7)*(board.cell+board.gap)+board.cell/2,board.cell);});
    this.actors.forEach((sprite,i)=>{
      const a=actors[i];if(!a)return;
      this.place(sprite,a.x,a.y-a.size/2,a.size);
      const alive=i===0?this.state.player.hp>0:this.state.enemies[i-1].hp>0;
      sprite.material.opacity=alive?1:.18;sprite.material.color.set('#ffffff');sprite.material.rotation=alive?0:(this.reducedMotion?0:.28);
      const target=this.targets[i];this.place(target,a.x,a.y+4,a.size*.8,10);target.visible=i===0||i-1===this.state.target;target.material.opacity=i===0?.5:1;
    });
  }
  /** Each frame resolves only after impact and a readable recovery interval. */
  async play(frame,settings,onImpact){
    if(this.failed){onImpact();return;}
    if(frame.kind==='match')this.setBoard(frame.board,frame.indices);
    if(frame.kind==='fall')this.setBoard(frame.board);
    this.frame={...frame,duration:frameDuration(frame,settings),settings,onImpact,impacted:false};this.elapsed=0;
    if(frame.kind==='effect')this.makeEffects(frame.event);
    await new Promise(resolve=>{this.finishAnimation=resolve;});
    if(frame.kind==='swap')this.setBoard(frame.board);
    this.clearEffects();this.matching=new Set();this.frame=null;this.positionObjects();
  }
  makeEffects(event){
    this.clearEffects();const color=COLORS[event.element??event.type]??'#d5b6ff';
    const damaging=['damage','poison','attack','meteor','poisonTick','heal','unstable','ward'].includes(event.type);
    if(!damaging || (event.type==='unstable'&&event.source!==undefined))return;
    const kind=event.element??event.type;
    const projectile=this.sprite(this.cached(`fx:${color}:${kind}`,()=>effectTexture(color,'',kind)),10);
    const label=event.type==='ward'?t('effect.shield',{amount:event.amount}):event.type==='heal'?`+${event.amount}`:event.type==='poison'?t('effect.poison',{amount:event.amount}):`−${event.amount??0}`;
    const numberTexture=effectTexture(color,label);const number=this.sprite(numberTexture,11);number.userData.ownedTexture=true;
    this.effects=[projectile,number];
    for(let i=0;i<8;i++)this.effects.push(this.sprite(this.cached(`spark:${color}`,()=>effectTexture(color,'','spark')),9));
    if(event.artifact){const flare=this.sprite(this.cached('relicFlare',()=>effectTexture('#ebc8ff','✦')),11);flare.userData.artifact=true;this.effects.push(flare);}
  }
  clearEffects(){for(const s of this.effects){this.scene.remove(s);if(s.userData.ownedTexture)s.material.map.dispose();s.material.dispose();}this.effects=[];}
  animate(progress){
    this.positionObjects();const f=this.frame;if(!f)return;
    const motion=!f.settings.reducedMotion;
    if(f.kind==='swap'&&motion){
      const {a,b}=f;const pa=this.tiles[a].position.clone(),pb=this.tiles[b].position.clone();this.tiles[a].position.lerpVectors(pa,pb,progress);this.tiles[b].position.lerpVectors(pb,pa,progress);
    }
    if(f.kind==='match')for(const i of f.indices){this.tiles[i].material.color.set(progress<.6?'#ffffff':'#ffe4a2');if(motion)this.tiles[i].scale.multiplyScalar(1+.08*Math.sin(progress*Math.PI));}
    else this.tiles.forEach(t=>t.material.color.set('#ffffff'));
    if(f.kind==='fall'&&motion)this.tiles.forEach(t=>{t.position.y+=(1-progress)*14;});
    if(f.kind!=='effect')return;
    const e=f.event;
    const incoming=['attack','meteor','heal','healBlocked','unstable','ward'].includes(e.type)&&!(e.type==='unstable'&&e.source!==undefined);
    const target=incoming?0:Math.max(1,(e.target??this.state.target)+1);
    const source=e.type==='attack'?(e.source+1):e.type==='poisonTick'?target:0;
    const from=this.layout.actors[source]??this.layout.actors[0],to=this.layout.actors[target]??this.layout.actors[0];
    this.actors.forEach((actor,i)=>{
      const dying=i===target&&(i===0?f.snapshot?.player.hp===0:f.snapshot?.enemies[i-1]?.hp===0);
      const pose=actorPose(progress,{attacking:i===source&&['attack','damage','poison'].includes(e.type),hit:i===target&&['attack','damage','meteor','poisonTick','unstable'].includes(e.type),dying,reducedMotion:!motion});
      actor.position.x+=(to.x-from.x)*pose.advance+pose.recoil*(i===0?-1:1);actor.position.y-=pose.drop;
      actor.scale.x*=pose.scaleX;actor.scale.y*=pose.scaleY;actor.material.rotation=pose.rotation;
      if(dying)actor.material.opacity=pose.opacity;
    });
    if(this.effects.length&&progress>.52&&progress<.72&&this.actors[target])this.actors[target].material.color.set(e.type==='heal'?'#ffbfc9':'#fff0a1');
    if(this.effects.length){
      const [projectile,number]=this.effects;
      const p=Math.max(0,Math.min(1,(progress-.12)/.45));
      const b=this.layout.board;
      const impactX=e.type==='meteor'?b.x+b.padding+(e.target%7)*(b.cell+b.gap)+b.cell/2:to.x;
      const impactY=e.type==='meteor'?b.y+b.padding+Math.floor(e.target/7)*(b.cell+b.gap)+b.cell/2:to.y-to.size*.5;
      const x=e.type==='meteor'?impactX:from.x+(to.x-from.x)*p;
      const y=e.type==='meteor'?15+(impactY-15)*p:from.y-from.size*.5+(to.y-to.size*.5-(from.y-from.size*.5))*p-(motion?Math.sin(p*Math.PI)*25:0);
      this.place(projectile,motion?x:impactX,motion?y:impactY,e.type==='meteor'?40:22);projectile.visible=progress>.12&&progress<.65;
      this.place(number,to.x,to.y-to.size*.75-(motion?Math.max(0,progress-.5)*35:0),['poison','ward'].includes(e.type)?110:70,28);number.visible=progress>=.5;number.material.opacity=1-Math.max(0,progress-.85)*6;
      if(motion)projectile.material.rotation=(e.type==='meteor'?0:e.element==='ice'?-.6:e.element==='steel'?-progress*2:progress*4);
      const burst=Math.max(0,(progress-.52)/.48);
      this.effects.slice(2).forEach((particle,i)=>{
        particle.visible=motion&&progress>=.52;
        if(particle.userData.artifact){const hero=this.layout.actors[0];this.place(particle,hero.x+hero.size*.25,hero.y-hero.size*.65,40,30);particle.visible=progress>=.25;particle.material.opacity=Math.sin(progress*Math.PI);return;}
        const angle=i*Math.PI/4;this.place(particle,impactX+Math.cos(angle)*burst*46,impactY+Math.sin(angle)*burst*34+burst*burst*20,5-burst*3);particle.material.opacity=1-burst;
      });
    }
  }
  loop(now){
    const delta=this.last?now-this.last:0;this.last=now;
    if(this.active&&!document.hidden&&this.ready&&!this.failed){
      this.arrival=Math.min(700,(this.arrival??700)+Math.min(delta,100));
      if(this.frame){
        this.elapsed=advanceElapsed(this.elapsed,delta);const progress=Math.min(1,this.elapsed/this.frame.duration);
        this.animate(progress);
        if(progress>=.55&&!this.frame.impacted){this.frame.impacted=true;this.frame.onImpact();}
        if(progress===1){const done=this.finishAnimation;this.finishAnimation=null;done?.();}
      }else{
        this.positionObjects();if(!this.reducedMotion)this.actors.forEach((actor,i)=>{if(actor.material.opacity===1){actor.position.y+=Math.round(Math.sin(now/450+i)*1.5);actor.scale.y*=1+Math.sin(now/550+i)*.012;actor.position.x+=(i===0?-1:1)*(1-this.arrival/700)**2*45;}});
      }
      const tier=stormTier(this.state.storm.gap);this.background.material.color.set(tier?['','#9684ad','#8c71a6','#80629c'][tier]:'#a4a0b3');
      this.motes?.forEach((mote,i)=>{mote.visible=!this.reducedMotion&&i<(tier?8+tier*5:6);if(!mote.visible)return;const w=this.layout.width,h=this.layout.board.y-20;this.place(mote,(i*83+now*(tier?.04:.008))%w,(i*43+now*(tier?.028:-.006)%h+h)%h,tier?3:2);mote.material.opacity=.18+Math.sin(now/600+i)**2*.3;});
      this.renderer.render(this.scene,this.camera);
    }
    this.raf=requestAnimationFrame(this.loop);
  }
  dispose(){cancelAnimationFrame(this.raf);this.observer.disconnect();clearTimeout(this.hintTimer);this.clearActors();this.clearEffects();for(const mote of this.motes??[]){this.scene.remove(mote);mote.material.dispose();}for(const t of this.cache.values())t.dispose();this.renderer.dispose();}
}
