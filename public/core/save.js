import { LEGACY_ARTIFACTS } from './legacy-artifacts.js';
import { catalogErrors } from './artifact-schema.js';
import { createSession } from './run.js';
import { RULES_VERSION } from './battle.js';
import { ARTIFACTS, LOADOUTS, ACHIEVEMENTS, ENEMIES, EVENTS } from './content.js';
import { actionLimit } from './storm.js';
import { TYPES, findMatches, legalMoves } from './board.js';
import { glyphWeights } from './glyphs.js';

export const SAVE_KEY = 'sparkfall.save.v1';
const integer = (value,max=1e9) => Number.isInteger(value) && value >= 0 && value <= max;
const list = (value,predicate,max=10000) => Array.isArray(value) && value.length <= max && value.every(predicate);
const known = (table,key) => Object.hasOwn(table,key);
const strings = value => typeof value === 'string' && value.length <= 200;
const distance = (value,ruleset) => Number.isSafeInteger(value) && value<=6 && (ruleset===2 || value>=0);
const achievementCount = Object.keys(ACHIEVEMENTS).length;
const unique = values => new Set(values).size === values.length;
function check(condition) { if (!condition) throw new Error('Повреждённая структура сохранения'); }

/** Save only stable gameplay state, excluding transient animation boards. */
export function encodeSession(session) {
  return JSON.stringify(session,(key,value) => ['waves','presentation'].includes(key) ? [] : value);
}
function validateBattle(battle,catalog) {
  const artifactCount=Object.keys(catalog).length;
  check(JSON.stringify(battle.artifactCatalog??LEGACY_ARTIFACTS)===JSON.stringify(catalog));
  for(const flags of [battle.actionFlags,battle.ruleFlags??{}])check(flags&&typeof flags==='object'&&!Array.isArray(flags)&&Object.entries(flags).length<=4096&&Object.entries(flags).every(([k,v])=>k.length<120&&(typeof v==='boolean'||integer(v))));
  check(battle && battle.version === RULES_VERSION && strings(battle.seed) && [1,2].includes(battle.ruleset));
  check([0,1].includes(battle.glyphVersion) && known(LOADOUTS,battle.loadout));
  check(distance(battle.initialGap,battle.ruleset) && integer(battle.player?.stormShield,4));
  check(integer(battle.rng,0xffffffff) && integer(battle.round) && integer(battle.actions,actionLimit(battle.artifacts,battle.ruleset,catalog)));
  check(['player','victory','defeat'].includes(battle.phase));
  check(battle.player?.maxHp === 70 && integer(battle.player.hp,70));
  check(distance(battle.storm?.gap,battle.ruleset) && integer(battle.storm.target,48));
  check(list(battle.artifacts,id=>known(catalog,id),artifactCount));
  check(list(battle.enemies,e=>e && known(ENEMIES,e.id) && integer(e.hp,1000) && integer(e.maxHp,1000) && e.hp <= e.maxHp && integer(e.poison) && integer(e.chill,2) && integer(e.intent) && [1,2].includes(e.stage) && [1,.7,.5,.8].includes(e.attackScale) && e.resists && Object.entries(e.resists).every(([k,v])=>TYPES.includes(k) && [.5,1,1.5].includes(v)),3) && battle.enemies.length > 0);
  check(Number.isInteger(battle.target) && battle.target >= -1 && battle.target < battle.enemies.length);
  check(battle.phase !== 'player' || (battle.player.hp > 0 && battle.enemies.some(e=>e.hp > 0)));
  const board = battle.board;
  if (battle.glyphVersion===1) {
    const expected=glyphWeights(battle.loadout,battle.artifacts,catalog);
    check(board?.glyphWeights && Object.keys(board.glyphWeights).length===TYPES.length && TYPES.every(type=>board.glyphWeights[type]===expected[type]));
  } else check(board?.glyphWeights===undefined);
  check(board?.width === 7 && board.height === 7);
  check(list(board.tiles,t=>t === null || TYPES.includes(t),49) && board.tiles.length === 49);
  check(list(board.craters,a=>integer(a,2),49) && board.craters.length === 49);
  for (const key of ['blocked','locks','unstable']) check(list(board[key],v=>typeof v === 'boolean',49) && board[key].length === 49);
  check(board.tiles.every((t,i)=>(board.craters[i] || board.blocked[i]) ? t === null : TYPES.includes(t)));
  check(findMatches(board).length === 0 && legalMoves(board).length > 0);
  check(list(battle.history,v=>v && strings(v.type)) && list(battle.events,v=>v && strings(v.type),1024) && Array.isArray(battle.waves));
}
/** Reject incompatible or malformed saves without silently replacing their original bytes. */
export function parseSave(raw) {
  try {
    check(typeof raw === 'string' && raw.length < 2_000_000);
    const session = JSON.parse(raw);
    if(session?.version===RULES_VERSION&&session.run)check(session.run.artifactCatalog&&(!session.run.battle||session.run.battle.artifactCatalog));
    if (session?.schema === 1 && ['0.3.0','0.4.0','0.5.0','0.6.0'].includes(session.version)) {
      const previous=session.version;session.version=RULES_VERSION;
      if(session.run){
        if(previous!=='0.6.0')session.run.glyphVersion=0;
        if(['0.3.0','0.4.0'].includes(previous)){
          session.run.routeVersion=previous==='0.3.0'?1:(session.run.routeVersion??2);
          session.run.rewardRarity='normal';session.run.rewardExhausted=null;
        }
        if(session.run.battle){
          const battle=session.run.battle;
          battle.version=RULES_VERSION;if(previous!=='0.6.0')battle.glyphVersion=0;battle.loadout=session.run.loadout;
          if(['0.3.0','0.4.0'].includes(previous)){battle.ruleset=1;battle.player.stormShield=0;}
        }
      }
    }
    if (session?.schema !== 1 || session.version !== RULES_VERSION) throw new Error('Сохранение другой версии. Можно выгрузить его и начать новый профиль.');
    if(session.run){
      session.run.artifactCatalog??=structuredClone(LEGACY_ARTIFACTS);
      if(session.run.battle){session.run.battle.artifactCatalog??=structuredClone(session.run.artifactCatalog);session.run.battle.ruleFlags??={};}
    }
    const catalog=session.run?.artifactCatalog??LEGACY_ARTIFACTS;
    check(catalogErrors({schema:1,items:catalog}).length===0);
    const artifactCount=Object.keys(catalog).length,unlockCount=256+Object.keys(LOADOUTS).length;
    const profile = session.profile;
    check(profile && integer(profile.currency));
    check(list(profile.unlocked,key=>strings(key) && /^(artifact|loadout):/.test(key) && known(key.startsWith('artifact:') ? {...ARTIFACTS,...catalog} : LOADOUTS,key.split(':')[1]),unlockCount) && unique(profile.unlocked));
    check(list(profile.achievements,id=>known(ACHIEVEMENTS,id),achievementCount) && unique(profile.achievements));
    check(profile.stats && ['runs','wins','bestDepth'].every(key=>integer(profile.stats[key])));
    const run = session.run;
    if (run !== null) {
      check([1,2,3].includes(run.routeVersion));
      check([0,1].includes(run.glyphVersion));
      check(run && strings(run.seed) && known(LOADOUTS,run.loadout) && integer(run.rng,0xffffffff));
      check(['map','battle','reward','event','rest','won','lost'].includes(run.phase));
      check(integer(run.floor,8) && integer(run.hp,70) && distance(run.gap,run.routeVersion>=3?2:1) && integer(run.pendingEmbers));
      check(typeof run.settled === 'boolean' && run.settled === ['won','lost'].includes(run.phase));
      check(run.phase !== 'map' || run.floor < 8);
      check(list(run.initialUnlocks,strings,unlockCount) && list(run.artifacts,id=>known(catalog,id),artifactCount) && unique(run.artifacts));
      check(list(run.reward,id=>known(catalog,id),3) && unique(run.reward));
      check(['normal','rare'].includes(run.rewardRarity) && [null,'normal','rare'].includes(run.rewardExhausted));
      check(run.phase !== 'reward' || (run.reward.length > 0 && (run.rewardRarity!=='rare'||run.reward.every(id=>catalog[id].rarity==='rare'))));
      check(run.event === null || known(EVENTS,run.event));
      check(!['event','rest'].includes(run.phase) || known(EVENTS,run.event));
      check(list(run.route,layer=>list(layer,n=>n && strings(n.id) && ['battle','elite','boss','event','rest'].includes(n.kind) && (n.enemyIds ? list(n.enemyIds,id=>known(ENEMIES,id),3) && n.enemyIds.length > 0 : known(EVENTS,n.event)),run.routeVersion>=3?3:2) && layer.length > 0,8) && run.route.length === 8);
      check(list(run.chosen,strings,8) && list(run.history,v=>v && strings(v.type)));
      if(run.routeVersion>=3)for(const [floor,layer] of run.route.entries())for(const node of layer){
        check(integer(node.lane,2)&&integer(node.travel,4));
        check(node.encounterScale===undefined||[1,.8].includes(node.encounterScale));
        check(node.stormEvent===undefined||known(EVENTS,node.stormEvent));
        if(floor<7)check(list(node.next,id=>run.route[floor+1].some(n=>n.id===id),3)&&node.next.length>0&&unique(node.next));
      }
      const nodes=run.route.flat();
      check(unique(nodes.map(n=>n.id)) && run.chosen.every(id=>nodes.some(n=>n.id===id)));
      check(run.currentNode === null || nodes.some(n=>n.id===run.currentNode));
      if(['battle','event','rest'].includes(run.phase)) check(run.route[run.floor]?.some(n=>n.id===run.currentNode));
      check(run.stats && integer(run.stats.combats,8) && integer(run.stats.swaps) && integer(run.stats.maxCascade,64) && list(run.stats.earned,id=>known(ACHIEVEMENTS,id),achievementCount));
      if (run.battle) {
        validateBattle(run.battle,catalog);
        check(run.battle.glyphVersion===run.glyphVersion && run.battle.loadout===run.loadout);
      }
      check(run.phase !== 'battle' || run.battle?.phase === 'player');
    }
    return {ok:true,session};
  } catch (error) { return {ok:false,error:error.message,raw}; }
}
/** Storage can be injected for tests; one snapshot contains both run and profile. */
export function loadSession(storage) {
  try { const raw = storage.getItem(SAVE_KEY); return raw === null ? {ok:true,session:createSession()} : parseSave(raw); }
  catch (error) { return {ok:false,error:error.message,raw:null}; }
}
/** Failure is explicit so the UI can keep playing in memory with a persistent warning. */
export function saveSession(storage,session) {
  try { storage.setItem(SAVE_KEY,encodeSession(session)); return {ok:true}; }
  catch (error) { return {ok:false,error:error.message}; }
}
