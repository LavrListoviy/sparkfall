import { contentTables, textFields } from './content-messages.js';
import { t, getLanguage } from './index.js';

/** Read-only presentation copies resolve labels at render time, so a locale switch never touches rules. */
function localized(item,prefix){
  const result={...item};
  for(const field of textFields)if(typeof item[field]==='string')Object.defineProperty(result,field,{enumerable:true,get:()=>prefix.startsWith('artifact.')?(getLanguage()==='en'?item.en?.[field]??item[field]:item[field]):t(`${prefix}.${field}`)});
  for(const list of ['intents','second','choices'])if(item[list])result[list]=item[list].map((child,i)=>localized(child,`${prefix}.${list}.${child.id??i}`));
  return result;
}
const table=kind=>Object.fromEntries(Object.entries(contentTables[kind]).map(([id,item])=>[id,localized(item,`${kind}.${id}`)]));
export const ARTIFACTS=table('artifact');
/** Historical descriptions follow the expedition snapshot, including its translations. */
export function artifactTable(catalog){
  if(!catalog)return ARTIFACTS;
  return Object.fromEntries(Object.entries(catalog).map(([id,item])=>[id,{...item,...(getLanguage()==='en'?item.en:{})}]));
}
export const ENEMIES=table('enemy');
export const LOADOUTS=table('loadout');
export const EVENTS=table('event');
export const ACHIEVEMENTS=table('achievement');
/** Resolve the current phase and intent index without changing the enemy's saved state. */
export function intentName(enemy){
  const data=ENEMIES[enemy.id],list=enemy.stage===2&&data.second?data.second:data.intents;
  return list[enemy.intent%list.length].name;
}
