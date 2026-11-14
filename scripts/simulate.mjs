import { createSession, startRun, enterNode, battleAction, chooseReward, chooseEvent, choiceBlocked } from '../public/core/run.js';
import { findMatches, legalMoves } from '../public/core/board.js';
import { EVENTS } from '../public/core/content.js';
import { encodeSession, parseSave } from '../public/core/save.js';
import { healingBlock, inStorm, stormTier } from '../public/core/storm.js';

/** A deliberately limited bot scores only visible first matches, never future RNG. */
export function bestMove(battle) {
  let best, score=-Infinity;
  for (const [target,enemy] of battle.enemies.entries()) {
    if (!enemy.hp) continue;
    for (const [a,b] of legalMoves(battle.board)) {
      const board=structuredClone(battle.board); [board.tiles[a],board.tiles[b]]=[board.tiles[b],board.tiles[a]];
      let value=0;
      for (const group of findMatches(board)) {
        const count=group.indices.length, bonus=count>=5?1.5:count===4?1.25:1;
        const type=group.type;
        const amount=count*({steel:3,fire:4,ice:2,poison:2,heal:2}[type])*bonus;
        if(type==='heal')value+=!healingBlock(battle.storm.gap,battle.artifacts,battle.ruleset)?Math.min(amount,70-battle.player.hp)*(battle.player.hp<30?2.5:1.35):0;
        else if(type==='poison')value+=Math.min(enemy.hp,amount*(enemy.resists.poison??1)*Math.min(2.8,enemy.hp/35));
        else value+=Math.min(enemy.hp,amount*(enemy.resists[type]??1)*(type==='fire'&&enemy.chill&&battle.artifacts.includes('thermal')?1.5:1))+(type==='ice'&&enemy.chill<2?4:0);
        value-=group.indices.filter(i=>board.unstable[i]).length*4;
        if(count>=4)value+=4;
        if(count>=4&&battle.ruleset===2){
          if(inStorm(battle.storm.gap)&&battle.artifacts.includes('stormweave'))value+=Math.min(4,70-battle.player.hp)*2;
          if(inStorm(battle.storm.gap)&&battle.artifacts.includes('stormlens'))value+=4*stormTier(battle.storm.gap);
          if(battle.artifacts.includes('grounding')&&!battle.player.stormShield)value+=3;
        }
      }
      if(value>score){score=value;best={a,b,target};}
    }
  }
  return best;
}
/** Play a whole route through public reducers, validating every persisted snapshot. */
export function simulate(seed,loadout='coil',branch=0,{unlocks=['loadout:thermal','loadout:needle']}={}) {
  const profile=createSession(); profile.profile.unlocked=unlocks;
  let session=startRun(profile,seed,loadout),steps=0,bossPhase=false;
  while(!session.run.settled && steps++<300) {
    const r=session.run;
    if(r.phase==='map'){
      const layer=r.route[r.floor];
      const node=layer[Math.min(branch,layer.length-1)];
      session=enterNode(session,node.id);
    } else if(r.phase==='reward'){
      const order=branch===2?['tempestHeart','stormweave','stormlens','grounding','stormcompass','overclock','frost','thermal','green','needle','coil','ash']:['frost','thermal','green','needle','coil','ash','stormweave','grounding','stormcompass','stormlens','tempestHeart','overclock'];
      const rank=id=>order.includes(id)?order.indexOf(id):99;
      session=chooseReward(session,[...r.reward].sort((a,b)=>rank(a)-rank(b))[0]);
    } else if(['event','rest'].includes(r.phase)){
      const choices=EVENTS[r.event].choices.filter(c=>!choiceBlocked(r,c));
      const choice=choices.find(c=>c.heal && r.hp<54)||(branch===2?choices.find(c=>c.artifact||c.time):choices.find(c=>c.gap))||choices.find(c=>!c.hp)||choices[0];
      session=chooseEvent(session,choice.id);
    } else {
      const move=bestMove(r.battle); if(!move)throw new Error(`No legal move: ${seed}`);
      session=battleAction(session,{type:'target',target:move.target});
      session=battleAction(session,{type:'swap',a:move.a,b:move.b});
      bossPhase ||= session.run.battle.enemies.some(e=>e.id==='heart'&&e.stage===2);
    }
    const saved=parseSave(encodeSession(session));
    if(!saved.ok)throw new Error(`Invalid save at ${seed}/${r.floor}/${r.phase}: ${saved.error}`);
  }
  if(!session.run.settled)throw new Error(`Run did not terminate: ${seed}`);
  return {seed,loadout,branch,phase:session.run.phase,floor:session.run.floor,hp:session.run.hp,swaps:session.run.stats.swaps,bossPhase,session};
}
if(process.argv[1]?.endsWith('simulate.mjs')){
  const count=Number(process.argv[2]||10);
  const rows=[];
  for(const loadout of ['coil','thermal','needle'])for(let i=0;i<count;i++){
    const {session,...result}=simulate(`PLAY-${i}`,loadout,i%3);rows.push({...result,gap:session.run.gap,artifacts:session.run.artifacts});
  }
  for(const loadout of ['coil','thermal','needle']){
    const group=rows.filter(r=>r.loadout===loadout);
    console.log(JSON.stringify({loadout,runs:group.length,wins:group.filter(r=>r.phase==='won').length,bossReached:group.filter(r=>r.floor>=7).length,averageSwaps:Math.round(group.reduce((s,r)=>s+r.swaps,0)/group.length)}));
  }
  console.log(JSON.stringify(rows.filter(r=>r.phase==='won').slice(0,6)));
}
