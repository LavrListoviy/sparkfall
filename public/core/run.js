import { Random } from './random.js';
import { createBattle, playSwap, endRound, selectTarget, RULES_VERSION } from './battle.js';
import { createRoute, reachableNodes } from './routes.js';
import { healingBlock, inStorm, travelForecast } from './storm.js';
import { ARTIFACTS, LOADOUTS, EVENTS, ACHIEVEMENTS } from './content.js';

export const isActive = session => Boolean(session.run && !session.run.settled);
const copy = session => structuredClone(session);
const available = (profile,kind,id) => (kind === 'artifact' ? ARTIFACTS : LOADOUTS)[id]?.cost === 0 || profile.unlocked.includes(`${kind}:${id}`);

/** Create a versioned, offline profile. Unlocks expand choices without changing stats. */
export function createSession() {
  return {schema:1,version:RULES_VERSION,profile:{currency:0,unlocked:[],achievements:[],stats:{runs:0,wins:0,bestDepth:0}},run:null};
}
/** Starting cannot overwrite an active expedition or use a locked loadout. */
export function startRun(session,seed,loadout = 'coil',{routeVersion = 3} = {}) {
  if (isActive(session) || !LOADOUTS[loadout] || !available(session.profile,'loadout',loadout)) return session;
  const next = copy(session); const random = new Random(String(seed).slice(0,80));
  const route = createRoute(random,routeVersion);
  next.profile.stats.runs++;
  next.run = {seed:String(seed).slice(0,80),loadout,routeVersion,initialUnlocks:[...next.profile.unlocked],rng:random.state,route,floor:0,phase:'map',hp:70,gap:4,artifacts:[LOADOUTS[loadout].artifact],pendingEmbers:0,reward:[],rewardRarity:'normal',rewardExhausted:null,event:null,battle:null,currentNode:null,chosen:[],history:[],settled:false,stats:{combats:0,swaps:0,maxCascade:0,earned:[]}};
  return next;
}
/** Enter exactly one offered node; travel grants distance only after the first floor. */
export function enterNode(session,id) {
  const run = session.run;
  if (!run || run.phase !== 'map') return session;
  const node = reachableNodes(run).find(n => n.id === id);
  if (!node) return session;
  const next = copy(session); const r = next.run;
  r.gap = travelForecast(r,node); r.rewardExhausted=null;
  r.currentNode = node.id; r.chosen.push(node.id); r.history.push({type:'enter',id});
  if (node.enemyIds) {
    r.phase = 'battle';
    r.battle = createBattle(`${r.seed}:${node.id}`,{enemyIds:node.enemyIds,paired:node.enemyIds.length > 1,stormGap:r.gap,hp:r.hp,artifacts:r.artifacts,room:r.floor+1,ruleset:r.routeVersion>=3?2:1,encounterScale:node.encounterScale??1});
  } else { r.phase = node.kind; r.event = inStorm(r.gap)&&node.stormEvent?node.stormEvent:node.event; }
  return next;
}
function achievement(session,id) {
  if (!ACHIEVEMENTS[id] || session.profile.achievements.includes(id)) return;
  session.profile.achievements.push(id); session.profile.currency++;
  session.run.stats.earned.push(id);
}
function settle(session,phase) {
  const run = session.run;
  if (run.settled) return;
  run.phase = phase; run.settled = true;
  session.profile.currency += run.pendingEmbers;
  if (phase === 'won') session.profile.stats.wins++;
}
function reward(run,profile,rarity='normal') {
  const random = new Random(run.rng);
  const pool = Object.keys(ARTIFACTS).filter(id => {
    const item=ARTIFACTS[id];
    return !run.artifacts.includes(id) && (run.routeVersion<3 ? !item.introduced&&available(profile,'artifact',id) : rarity==='rare' ? item.rarity==='rare' : item.rarity!=='rare'&&available(profile,'artifact',id));
  });
  run.rewardRarity=rarity;run.rewardExhausted=null;
  run.reward = [];
  while (run.reward.length < 3 && pool.length) run.reward.push(pool.splice(random.int(pool.length),1)[0]);
  run.rng = random.state;
  if (run.reward.length) run.phase = 'reward';
  else { run.pendingEmbers += rarity==='rare'?4:2; run.rewardExhausted=rarity; run.phase = 'map'; }
}
/** Resolve one atomic combat decision and bank terminal rewards at most once. */
export function battleAction(session,action) {
  if (session.run?.phase !== 'battle') return session;
  const battle = session.run.battle;
  const result = action.type === 'swap' ? playSwap(battle,action.a,action.b) : action.type === 'endRound' ? endRound(battle) : action.type === 'target' ? selectTarget(battle,action.target) : battle;
  if (result === battle) return session;
  const next = copy(session); const run = next.run;
  run.battle = result; run.hp = result.player.hp; run.gap = result.storm.gap;
  run.history.push({type:'battle',action:{...action}});
  if (action.type === 'swap') run.stats.swaps++;
  run.stats.maxCascade = Math.max(run.stats.maxCascade,result.waves.length);
  if (result.waves.length >= 3) achievement(next,'chain_reaction');
  if (new Set(result.waves.flatMap(w=>w.groups.map(g=>g.type))).size >= 4) achievement(next,'spectrum');
  if (result.events.some(e=>e.type === 'poisonTick' && e.killed)) achievement(next,'venom');
  if (result.phase === 'defeat') settle(next,'lost');
  else if (result.phase === 'victory') {
    const kind = run.route[run.floor].find(n=>n.id === run.currentNode).kind;
    run.pendingEmbers += kind === 'boss' ? 5 : kind === 'elite' ? 3 : 1;
    run.stats.combats++; achievement(next,'first_blood');
    if (kind === 'elite') achievement(next,'elite');
    const floor = run.floor++;
    next.profile.stats.bestDepth = Math.max(next.profile.stats.bestDepth,run.floor);
    if (kind === 'boss') { achievement(next,'boss'); settle(next,'won'); }
    else if (run.routeVersion>=3 || [0,1,3,4].includes(floor)) reward(run,next.profile,run.routeVersion>=3&&kind==='elite'&&inStorm(result.initialGap)&&inStorm(result.storm.gap)?'rare':'normal');
    else run.phase = 'map';
  }
  return next;
}
/** An offered artifact can be claimed once; the generated offer is never rerolled. */
export function chooseReward(session,id) {
  if (session.run?.phase !== 'reward' || !session.run.reward.includes(id)) return session;
  const next = copy(session); next.run.artifacts.push(id); next.run.reward = [];
  next.run.phase = 'map'; next.run.history.push({type:'reward',id});
  return next;
}
/** Explain disabled choices using the same predicate as event resolution. */
export function choiceBlocked(run,choice) {
  const blocked=healingBlock(run.gap,run.artifacts,run.routeVersion>=3?2:1);
  if (choice.heal && blocked) return blocked==='heart'?'Сердце бури запрещает лечение вне шторма':'Шторм блокирует лечение';
  if (choice.artifact && run.artifacts.includes(choice.artifact)) return 'Этот артефакт уже есть';
  if (choice.hp && run.hp + choice.hp <= 0) return 'Недостаточно здоровья';
  return '';
}
/** Healing uses the pre-choice storm state; time outside combat never spawns a meteor. */
export function chooseEvent(session,id) {
  const run = session.run;
  if (!run || !['event','rest'].includes(run.phase)) return session;
  const choice = EVENTS[run.event]?.choices.find(c=>c.id === id);
  if (!choice || choiceBlocked(run,choice)) return session;
  const next = copy(session); const r = next.run;
  r.hp = Math.min(70,r.hp + (choice.hp ?? 0) + (choice.heal ?? 0));
  r.gap = Math.min(6,r.gap + (choice.gap ?? 0) - (choice.time ?? 0));
  if(r.routeVersion<3)r.gap=Math.max(0,r.gap);
  if(choice.artifact)r.artifacts.push(choice.artifact);
  r.pendingEmbers += choice.embers ?? 0; r.floor++; r.phase = 'map';
  r.history.push({type:'event',id});
  next.profile.stats.bestDepth = Math.max(next.profile.stats.bestDepth,r.floor);
  return next;
}
/** Abandoning preserves earned sparks, but grants no reward for starting a run. */
export function abandonRun(session) {
  if (!isActive(session)) return session;
  const next = copy(session); next.run.history.push({type:'abandon'});
  settle(next,'lost'); return next;
}
/** Unlock purchases are horizontal progression and are unavailable during an expedition. */
export function buyUnlock(session,key) {
  if (isActive(session) || session.profile.unlocked.includes(key)) return session;
  const [kind,id] = key.split(':');
  const item = kind === 'artifact' ? ARTIFACTS[id] : kind === 'loadout' ? LOADOUTS[id] : null;
  if (!item?.cost || item.cost > session.profile.currency) return session;
  const next = copy(session); next.profile.currency -= item.cost; next.profile.unlocked.push(key);
  return next;
}
