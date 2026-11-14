/** Order is owned by the combat resolver; presentation never infers targets from the final board. */
export function buildTimeline(before,after) {
  if(before===after)return [];
  return [...(after.presentation??[]),{kind:'settle',snapshot:{player:after.player,enemies:after.enemies,target:after.target,storm:after.storm,board:after.board,round:after.round,actions:after.actions,phase:after.phase}}];
}
/** Reduced motion removes movement, not the readable delay between consequences. */
export function frameDuration(frame,{speed=1,reducedMotion=false}={}) {
  const scale=[.5,1,2].includes(speed)?speed:1;
  const times={swap:180,match:280,fall:200,settle:180};
  const effects={damage:650,chill:300,poison:600,heal:600,healBlocked:450,attack:750,poisonTick:650,meteor:900,bossPhase:1100,locks:700,unstable:650,charge:650,artifact:350,enemyPhase:450,storm:300};
  const base=times[frame.kind]??effects[frame.event?.type]??350;
  return Math.max(reducedMotion?250:80,base/scale);
}
/** Hidden-tab time is discarded, preventing a burst of skipped effects when returning. */
export function advanceElapsed(elapsed,delta,{hidden=false}={}) {
  return hidden?elapsed:elapsed+Math.max(0,Math.min(100,delta));
}
