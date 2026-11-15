import { LEGACY_ARTIFACTS } from './legacy-artifacts.js';

/** A special legacy block is enabled once, even when several items inherit it. */
export function hasArtifact(artifacts=[],base,catalog=LEGACY_ARTIFACTS) {
  return artifacts.some(id=>catalog[id]?.base===base);
}
/** Attribute a shared special block to its first owner in acquisition order. */
export function artifactSource(state,base) {
  return state.artifacts.find(id=>(state.artifactCatalog??LEGACY_ARTIFACTS)[id]?.base===base)??base;
}

/** Resolve one explicit hook, without recursive events or random choices. */
export function applyArtifactRules(state,trigger,context,emit,isHealingBlocked) {
  if(state.player.hp<=0)return;
  const catalog=state.artifactCatalog??LEGACY_ARTIFACTS;
  state.ruleFlags??={};state.actionFlags??={};
  for(const id of new Set(state.artifacts))for(const [index,rule] of (catalog[id]?.rules??[]).entries()){
    if(rule.trigger!==trigger)continue;
    const {group,target}=context,inside=state.storm.gap<=0;
    if(rule.weather==='inside'&&!inside||rule.weather==='outside'&&inside)continue;
    if(trigger==='group'&&(rule.tile!=='any'&&rule.tile!==group.type||group.indices.length<rule.min))continue;
    if(rule.status!=='any'&&!context[rule.status])continue;
    const key=`rule:${id}:${index}`,flags=rule.limit==='action'?state.actionFlags:state.ruleFlags;
    const stamp=rule.limit==='round'?state.round:1;
    if(rule.limit!=='event'&&flags[key]===stamp)continue;
    if(rule.limit!=='event')flags[key]=stamp;
    if(rule.effect==='heal'){
      const blocked=isHealingBlocked(state);
      if(blocked&&!(blocked==='storm'&&rule.ignoreStorm))continue;
      const amount=Math.min(rule.amount,state.player.maxHp-state.player.hp);
      state.player.hp+=amount;emit(state,{type:'heal',amount,artifact:id});continue;
    }
    if(rule.effect==='shield'){
      state.player.stormShield=Math.max(state.player.stormShield??0,rule.amount);
      emit(state,{type:'ward',amount:state.player.stormShield,artifact:id});continue;
    }
    const targets=rule.target==='all'?state.enemies.flatMap((e,i)=>e.hp>0?[i]:[]):rule.target==='other'?[state.enemies.findIndex((e,i)=>i!==target&&e.hp>0)]:[target];
    for(const targetIndex of targets){
      const victim=state.enemies[targetIndex];if(!victim||victim.hp<=0)continue;
      let amount=rule.amount,type=rule.effect;
      if(type==='damage'){
        amount=Math.floor(amount*(victim.resists[rule.element]??1));victim.hp=Math.max(0,victim.hp-amount);
      }else if(type==='poison')victim.poison+=amount;
      else if(type==='chill'){victim.chill=Math.min(2,victim.chill+amount);amount=victim.chill;}
      emit(state,{type,amount,target:targetIndex,artifact:id,...(type==='damage'?{element:rule.element}:{})});
    }
  }
}
