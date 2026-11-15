import { t, tileName } from '../i18n/index.js';
import { ARTIFACTS } from '../i18n/content.js';
import { weatherLabel } from '../views.js';

/** Rebuild live announcements from facts when the language changes, without touching the battle. */
export function battleAnnouncement(battle){
  return battle?t('combat.announcement',{hp:battle.player.hp,weather:weatherLabel(battle.storm.gap)}):'';
}

/** Events keep their numeric facts; historical entries can be translated again without replaying combat. */
export function eventText(e) {
  let text;
  switch(e.type){
    case 'damage':text=e.element==='steel'?t('log.damage.physical',e):t('log.damage',{damageType:tileName(e.element),amount:e.amount});break;
    case 'poisonTick':text=t(e.killed?'log.poisonKilled':'log.poisonHit',e);break;
    case 'heal':text=t(e.amount?'log.heal':'log.fullHealth',e);break;
    case 'healBlocked':text=t(e.reason==='heart'?'log.heartBlock':'log.stormBlock');break;
    case 'meteor':text=t('log.meteorHit',{amount:e.amount,absorbed:e.absorbed??0});break;
    case 'storm':text=t('log.storm',{weather:weatherLabel(e.gap)});break;
    case 'unstable':text=t(e.source!==undefined?'log.unstableSpread':'log.unstableDamage',e);break;
    case 'chill':case 'poison':case 'attack':case 'ward':case 'locks':case 'charge':case 'bossPhase':case 'artifact':case 'enemyPhase':text=t(`log.${e.type}`,e);break;
    default:return '';
  }
  return (e.artifact?`${ARTIFACTS[e.artifact].name}: `:'')+text;
}
