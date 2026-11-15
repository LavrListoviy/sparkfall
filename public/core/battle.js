import { Random } from './random.js';
import { createBoard, swapBoard, ageCraters, strikeBoard, applyHazard, disableCorners, cleanCell, ensurePlayable } from './board.js';
import { actionLimit, healingBlock, inStorm, meteorDamage, stormTier } from './storm.js';
import { ENEMIES } from './content.js';
import { glyphWeights } from './glyphs.js';
import { LEGACY_ARTIFACTS } from './legacy-artifacts.js';
import { hasArtifact, artifactSource, applyArtifactRules } from './artifact-rules.js';

export const RULES_VERSION = '0.7.0';
const clone = state => structuredClone(state);
/** Capture the exact state at an effect boundary without involving presentation timing. */
function emit(state,event,composed=false) {
  const boardEffect=event.artifact==='glove';
  if(event.artifact && !composed)event={...event,artifact:artifactSource(state,event.artifact)};
  state.events.push(event);
  if (!state.presentation) return;
  const snapshot = {player:{...state.player},enemies:clone(state.enemies),target:state.target,storm:{...state.storm}};
  if (['locks','unstable','meteor','bossPhase'].includes(event.type) || boardEffect) snapshot.board = clone(state.board);
  state.presentation.push({kind:'effect',event:{...event},snapshot});
}
const has = (state,id) => hasArtifact(state.artifacts,id,state.artifactCatalog);
const emitComposed=(state,event)=>emit(state,event,true);
const definition = enemy => ENEMIES[enemy.id] ?? ENEMIES.furnace;
const targetOf = state => {
  if (!state.enemies[state.target] || state.enemies[state.target].hp <= 0) state.target = state.enemies.findIndex(e => e.hp > 0);
  return state.enemies[state.target];
};

/** All randomness is seeded; paired encounters scale each enemy independently. */
export function createBattle(seed = 'ISKRA-01', {stormGap = 4, enemyIds = ['furnace'], paired = false, artifacts = [], hp = 70, room = 1, ruleset = 1, encounterScale = 1, glyphVersion = 0, loadout = 'coil', artifactCatalog = LEGACY_ARTIFACTS} = {}) {
  if (!enemyIds.length || enemyIds.length > 3) throw new RangeError('An encounter requires 1 to 3 enemies');
  const random = new Random(seed);
  const board = createBoard(random,7,7,glyphVersion===1?glyphWeights(loadout,artifacts,artifactCatalog):undefined);
  const enemies = enemyIds.map(id => {
    const data = ENEMIES[id];
    const maxHp = Math.floor(data.hp * encounterScale * (enemyIds.length === 3 ? .48 : paired ? .65 : 1));
    return {id,hp:maxHp,maxHp,chill:0,poison:0,intent:0,stage:1,attackScale:encounterScale * (enemyIds.length === 3 ? .5 : paired ? .7 : 1),resists:{...data.resists}};
  });
  return {version:RULES_VERSION,artifactCatalog:clone(artifactCatalog),ruleFlags:{},ruleset,glyphVersion,loadout,seed,initialGap:stormGap,room,round:1,actions:actionLimit(artifacts,ruleset,artifactCatalog),phase:'player',player:{hp,maxHp:70,stormShield:0},enemies,target:0,artifacts:[...artifacts],board,storm:{gap:stormGap,target:random.int(board.tiles.length)},rng:random.state,events:[],history:[],waves:[],presentation:[],actionFlags:{}};
}
/** Use the same intent for the forecast and the enemy resolver. */
export function currentIntent(enemy) {
  const data = definition(enemy);
  const list = enemy.stage === 2 && data.second ? data.second : data.intents;
  return list[enemy.intent % list.length];
}
/** Chill modifies attacks only; non-attacking actions preserve its stacks. */
export function intentDamage(enemy) {
  const intent = currentIntent(enemy);
  return intent.kind === 'attack' ? Math.floor(Math.floor(intent.amount * (enemy.attackScale ?? 1)) * (1 - Math.min(2,enemy.chill) * .2)) : 0;
}
function outcome(state) {
  if (state.player.hp <= 0) state.phase = 'defeat';
  else if (state.enemies.every(e => e.hp <= 0)) state.phase = 'victory';
  return state.phase !== 'player';
}
function damage(state,index,base,element,artifact) {
  const enemy = state.enemies[index];
  if (!enemy || enemy.hp <= 0) return;
  const amount = Math.floor(base * (enemy.resists[element] ?? 1));
  enemy.hp = Math.max(0,enemy.hp - amount);
  emit(state,{type:'damage',element,amount,target:index,...(artifact ? {artifact} : {})});
}
function hurt(state,base,type,extra = {}) {
  let amount = Math.floor(base * (has(state,'glass') ? 1.2 : 1));
  if(type==='meteor'&&state.ruleset===2){const absorbed=Math.min(amount,state.player.stormShield??0);amount-=absorbed;state.player.stormShield=(state.player.stormShield??0)-absorbed;extra={...extra,absorbed};}
  state.player.hp = Math.max(0,state.player.hp - amount);
  emit(state,{type,amount,...extra});
}
function addPoison(state,amount,artifact) {
  const enemy = targetOf(state);
  if (!enemy) return;
  enemy.poison += amount;
  emit(state,{type:'poison',amount,target:state.target,...(artifact ? {artifact} : {})});
}

/** Long matches grant explicit, non-recursive bonuses after the ordinary group effect. */
function longGroupEffects(state,group) {
  if(state.ruleset!==2||state.player.hp<=0||group.indices.length<4)return;
  const flags=state.actionFlags;
  if(has(state,'grounding')&&(state.player.stormShield??0)<4){
    state.player.stormShield=4;emit(state,{type:'ward',amount:4,artifact:'grounding'});
  }
  if(!inStorm(state.storm.gap))return;
  if(has(state,'stormweave')&&!flags.stormweave){
    flags.stormweave=true;const amount=Math.min(4,state.player.maxHp-state.player.hp);
    state.player.hp+=amount;emit(state,{type:'heal',amount,artifact:'stormweave'});
  }
  if(has(state,'stormlens')&&!flags.stormlens){
    flags.stormlens=true;targetOf(state);
    damage(state,state.target,4*stormTier(state.storm.gap),'steel','stormlens');
  }
}

/** Resolve groups in board order. Per-action flags persist across cascades. */
export function applyGroups(state,groups) {
  const next = clone(state);
  next.actionFlags ??= {};
  const flags = next.actionFlags;
  for (const group of groups) {
    if (next.player.hp <= 0) break;
    const unstable = group.indices.filter(i => next.board.unstable?.[i]).length;
    if (unstable) {
      hurt(next,unstable * 2,'unstable');
      group.indices.forEach(i => { next.board.unstable[i] = false; });
      if (next.player.hp <= 0) break;
    }
    const ruleContext={group,...ruleTarget(next)};
    const afterGroup=()=>applyArtifactRules(next,'group',ruleContext,emitComposed,healingReason);
    const count = group.indices.length;
    const bonus = count >= 5 ? 1.5 : count === 4 ? 1.25 : 1;
    const elemental = ['fire','ice','poison'].includes(group.type);
    const glass = has(next,'glass') && elemental && count >= 4 ? 1.25 : 1;
    if (group.type === 'heal') {
      const blocked=healingBlock(next.storm.gap,next.artifacts,next.ruleset??1,next.artifactCatalog);
      if (blocked) emit(next,{type:'healBlocked',reason:blocked});
      else {
        const healing = Math.floor(count * 2 * bonus);
        const amount = Math.min(next.player.maxHp - next.player.hp,healing);
        next.player.hp += amount;
        emit(next,{type:'heal',amount});
        if (has(next,'ampoule') && !flags.ampoule && healing > amount) {
          flags.ampoule = true; targetOf(next);
          damage(next,next.target,Math.floor((healing - amount) / 2),'steel','ampoule');
        }
      }
      if (has(next,'green') && !flags.green) { flags.green = true; addPoison(next,2,'green'); }
      longGroupEffects(next,group);afterGroup();
      continue;
    }
    const enemy = targetOf(next);
    if (!enemy) { longGroupEffects(next,group); afterGroup(); continue; }
    if (group.type === 'poison') { addPoison(next,Math.floor(count * 2 * bonus * glass)); longGroupEffects(next,group); afterGroup(); continue; }
    let base = count * {steel:3,fire:4,ice:2}[group.type] * bonus * glass;
    if (group.type === 'fire' && has(next,'thermal') && !flags.thermal && enemy.chill) {
      flags.thermal = true; enemy.chill = 0; base *= 1.5;
      emit(next,{type:'artifact',artifact:'thermal'});
    }
    const target = next.target;
    damage(next,target,base,group.type);
    if (group.type === 'fire' && count >= 4 && has(next,'ash')) {
      const other = next.enemies.findIndex((e,i) => i !== target && e.hp > 0);
      damage(next,other,count * 4 * bonus * .5,'fire','ash');
    }
    if (group.type === 'ice') {
      const extra = has(next,'frost') && !flags.frost;
      if (enemy.hp > 0) { enemy.chill = Math.min(2,enemy.chill + 1 + Number(extra)); emit(next,{type:'chill',amount:enemy.chill,target}); }
      if (extra) { flags.frost = true; emit(next,{type:'artifact',artifact:'frost'}); }
    }
    if (group.type === 'steel' && count >= 4 && has(next,'needle') && enemy.hp > 0) addPoison(next,2,'needle');
    longGroupEffects(next,group);afterGroup();
  }
  return next;
}
function forecastTarget(state,random) {
  const craters = state.board.craters.flatMap((age,i) => age ? [i] : []);
  const candidates = craters.length >= 3 ? craters : state.board.tiles.flatMap((_,i) => state.board.blocked[i] ? [] : [i]);
  return candidates[random.int(candidates.length)];
}
function bossPhase(state,random) {
  const boss = state.enemies.find(e => e.id === 'heart' && e.stage === 1 && e.hp > 0 && e.hp <= e.maxHp / 2);
  if (!boss) return;
  boss.stage = 2; boss.intent = 0; boss.resists = {fire:1.5,ice:.5};
  state.board = disableCorners(state.board,random);
  if (state.board.blocked[state.storm.target]) state.storm.target = forecastTarget(state,random);
  emit(state,{type:'bossPhase'});
}
/** Poison resolves before each enemy action, then the global storm advances once. */
function enemyPhase(state,random) {
  emit(state,{type:'enemyPhase'});
  for (let i = 0; i < state.enemies.length; i++) {
    const enemy = state.enemies[i];
    if (enemy.hp <= 0) continue;
    if (enemy.poison > 0) {
      const amount = Math.floor(enemy.poison * (enemy.resists.poison ?? 1));
      enemy.hp = Math.max(0,enemy.hp - amount); enemy.poison--;
      emit(state,{type:'poisonTick',amount,target:i,killed:enemy.hp <= 0});
      if (enemy.hp <= 0 && has(state,'spore')) {
        const other = state.enemies.findIndex(e => e.hp > 0);
        if (other >= 0) {
          const spread = Math.floor(enemy.poison / 2);
          state.enemies[other].poison += spread;
          emit(state,{type:'poison',amount:spread,target:other,artifact:'spore'});
        }
      }
    }
    if (outcome(state)) return;
    if (enemy.hp <= 0) continue;
    bossPhase(state,random);
    const intent = currentIntent(enemy);
    if (intent.kind === 'attack') { const amount=intentDamage(enemy); enemy.chill = 0; hurt(state,amount,'attack',{source:i}); }
    else if (['locks','unstable'].includes(intent.kind)) {
      const options = state.board.tiles.flatMap((tile,index) => tile && !state.board[intent.kind][index] ? [index] : []);
      const indices = [];
      while (indices.length < intent.amount && options.length) indices.push(options.splice(random.int(options.length),1)[0]);
      state.board = ensurePlayable(applyHazard(state.board,intent.kind,indices),random);
      emit(state,{type:intent.kind,amount:indices.length,source:i});
    } else emit(state,{type:'charge',source:i});
    enemy.intent++;
    if (outcome(state)) return;
  }
  state.board = ageCraters(state.board,random);
  state.storm.gap = state.ruleset===2?state.storm.gap-1:Math.max(0,state.storm.gap-1);
  if (inStorm(state.storm.gap)) {
    state.board = strikeBoard(state.board,state.storm.target,random);
    hurt(state,meteorDamage(state.storm.gap,state.ruleset??1),'meteor',{target:state.storm.target});
    state.storm.target = forecastTarget(state,random);
  } else emit(state,{type:'storm',gap:state.storm.gap});
  if (outcome(state)) return;
  applyArtifactRules(state,'roundEnd',ruleTarget(state),emitComposed,healingReason);
  if(outcome(state))return;
  state.round++; state.actions = actionLimit(state.artifacts,state.ruleset??1,state.artifactCatalog);
}
function gloveCleanup(state,waves,random) {
  if (!has(state,'glove')) return;
  const candidates = new Set();
  for (const wave of waves) for (const group of wave.groups) if (group.indices.length >= 4) {
    for (const i of group.indices) for (const j of [i-7,i+7,...(i%7 ? [i-1] : []),...(i%7<6 ? [i+1] : [])]) {
      if (j >= 0 && j < 49 && !state.board.blocked[j] && (state.board.craters[j] || state.board.locks[j] || state.board.unstable[j])) candidates.add(j);
    }
  }
  if (candidates.size) {
    const target = Math.min(...candidates);
    state.board = cleanCell(state.board,target,random);
    emit(state,{type:'artifact',artifact:'glove',target});
  }
}
/** Commit a complete successful action; cascades consume no additional actions. */
export function playSwap(state,a,b) {
  if (state.phase !== 'player') return state;
  const random = new Random(state.rng);
  const result = swapBoard(state.board,a,b,random);
  if (!result.valid) return state;
  let next = clone(state);
  next.events = []; next.waves = []; next.presentation = []; next.actionFlags = {};
  next.history.push({type:'swap',a,b});
  next.presentation.push({kind:'swap',a,b,board:clone(result.waves[0].before)});
  for (const [index,wave] of result.waves.entries()) {
    next.board = wave.before;
    next.presentation.push({kind:'match',wave:index,indices:wave.groups.flatMap(g=>g.indices),board:clone(wave.before)});
    if (index === 1 && has(next,'coil')) { targetOf(next); damage(next,next.target,3,'steel','coil'); }
    if(index>0)applyArtifactRules(next,'cascade',ruleTarget(next),emitComposed,healingReason);
    next = applyGroups(next,wave.groups);
    next.waves.push(wave);
    next.presentation.push({kind:'fall',board:clone(wave.after)});
    if (next.player.hp <= 0) break;
  }
  next.board = result.board;
  next.actions--;
  if (next.player.hp > 0) { gloveCleanup(next,next.waves,random); bossPhase(next,random); }
  if (!outcome(next) && next.actions === 0) enemyPhase(next,random);
  next.rng = random.state;
  return next;
}
/** Unused actions may be forfeited, but the entire enemy/storm round still happens. */
export function endRound(state) {
  if (state.phase !== 'player') return state;
  const next = clone(state); const random = new Random(next.rng);
  next.events = []; next.waves = []; next.presentation = []; next.actionFlags = {};
  next.history.push({type:'endRound'});
  if (!outcome(next)) enemyPhase(next,random);
  next.rng = random.state;
  return next;
}
/** Standalone encounter helper retained for deterministic combat regression tests. */
export function nextRoom(state) {
  if (state.phase !== 'victory') return state;
  const next = createBattle(state.rng,{stormGap:Math.min(6,state.storm.gap+3),hp:state.player.hp,room:state.room+1,artifacts:state.artifacts,glyphVersion:state.glyphVersion,loadout:state.loadout,artifactCatalog:state.artifactCatalog});
  next.history = [...state.history,{type:'nextRoom'}];
  return next;
}
/** Target changes are free and recorded, but dead enemies cannot be selected. */
export function selectTarget(state,target) {
  if (state.phase !== 'player' || !state.enemies[target] || state.enemies[target].hp <= 0 || state.target === target) return state;
  const next = clone(state); next.target = target;
  next.history.push({type:'target',target}); next.events = []; next.waves = []; next.presentation = [];
  return next;
}

function healingReason(state){return healingBlock(state.storm.gap,state.artifacts,state.ruleset??1,state.artifactCatalog);}
/** Reading a hook context must not retarget legacy encounters with no composed rules. */
function ruleTarget(state){
  const target=state.enemies[state.target]?.hp>0?state.target:state.enemies.findIndex(enemy=>enemy.hp>0);
  return {target,chill:state.enemies[target]?.chill??0,poison:state.enemies[target]?.poison??0};
}
