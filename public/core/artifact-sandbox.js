import { createBattle,applyGroups,endRound,playSwap } from './battle.js';
import { legalMoves } from './board.js';
import { catalogErrors,TILE_IDS } from './artifact-schema.js';

/** Run a disposable authoring scenario through production reducers, never browser storage. */
export function simulateArtifact(catalog,id,{trigger='group',tile='steel',count=3,repeats=1,gap=4,hp=40,chill=0,poison=0}={}){
  if(catalogErrors({schema:1,items:catalog}).length||!Object.hasOwn(catalog,id))throw new Error('Сначала исправьте ошибки каталога.');
  if(!['group','cascade','roundEnd'].includes(trigger)||!TILE_IDS.includes(tile)||![count,repeats,gap,hp,chill,poison].every(Number.isSafeInteger)||count<3||count>49||repeats<1||repeats>8||gap>6||gap< -20||hp<1||hp>70||chill<0||chill>2||poison<0||poison>100)throw new Error('Неверные параметры стенда.');
  const create=seed=>{
    const state=createBattle(seed,{artifacts:[id],artifactCatalog:catalog,ruleset:2,glyphVersion:1,hp,stormGap:gap});
    state.enemies[0].chill=chill;state.enemies[0].poison=poison;return state;
  };
  let state=create('editor-sandbox');
  if(trigger==='group')return applyGroups(state,Array.from({length:repeats},()=>({type:tile,indices:Array.from({length:count},(_,i)=>i)})));
  if(trigger==='cascade'){
    for(let n=0;n<60;n++){
      const candidate=create(`editor-cascade-${n}`);
      for(const move of legalMoves(candidate.board)){
        const result=playSwap(candidate,...move);
        if(result.waves.length>1)return result;
      }
    }
    throw new Error('Не найден каскад для этого профиля частот.');
  }
  const events=[];
  for(let i=0;i<repeats&&state.phase==='player';i++){state=endRound(state);events.push(...state.events);}
  return {...state,events};
}
