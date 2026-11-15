import { hasArtifact } from './artifact-rules.js';
/** Positive distance is ahead of the front; zero is the first depth inside it. */
export const inStorm = gap => gap <= 0;
export const stormDepth = gap => inStorm(gap) ? 1-gap : 0;
export const stormTier = gap => Math.min(3,Math.ceil(stormDepth(gap)/3));

/** Legacy battles keep their flat meteor damage; new depth never exceeds tier three. */
export function meteorDamage(gap,ruleset=2) {
  if(!inStorm(gap))return 0;
  return ruleset===1?4:2+stormTier(gap)*2;
}
/** Forecast the next boundary, including its depth increase and already charged shield. */
export function nextMeteorDamage(battle) {
  const base=meteorDamage(battle.storm.gap-1,battle.ruleset);
  const incoming=Math.floor(base*(hasArtifact(battle.artifacts,'glass',battle.artifactCatalog)?1.2:1));
  return Math.max(0,incoming-(battle.ruleset===2?battle.player.stormShield??0:0));
}
/** Every consumer uses this limit, including the first round and post-enemy reset. */
export const actionLimit = (artifacts=[],ruleset=2,catalog) => 2+Number(ruleset===2&&hasArtifact(artifacts,'overclock',catalog));

/** A reason code keeps disabled event choices, board markings and combat healing aligned. */
export function healingBlock(gap,artifacts=[],ruleset=2,catalog) {
  if(ruleset===2&&hasArtifact(artifacts,'tempestHeart',catalog))return inStorm(gap)?null:'heart';
  return inStorm(gap)?'storm':null;
}
/** Forecast and actual travel share the same cost, including deliberately negative travel. */
export function travelGain(run,node) {
  if(run.floor===0)return 0;
  if(run.routeVersion<3)return 3;
  return (node.travel??3)-Number(hasArtifact(run.artifacts,'overclock',run.artifactCatalog))+2*Number(inStorm(run.gap)&&hasArtifact(run.artifacts,'stormcompass',run.artifactCatalog));
}
export function travelForecast(run,node) {return Math.min(6,run.gap+travelGain(run,node));}
