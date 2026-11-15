import * as content from '../core/content.js';
import { englishContent } from './content-english.js';

export const contentTables={artifact:content.ARTIFACTS,enemy:content.ENEMIES,loadout:content.LOADOUTS,event:content.EVENTS,achievement:content.ACHIEVEMENTS};
export const textFields=['name','tag','text','subtitle','flavor'];
export const contentMessages={};

/** Russian content remains beside its balance data; English uses the same stable identifiers. */
function collect(item,english,prefix){
  for(const field of textFields)if(typeof item[field]==='string')contentMessages[`${prefix}.${field}`]={ru:item[field],en:english?.[field]};
  for(const list of ['intents','second','choices'])for(const [i,child] of (item[list]??[]).entries()){
    const translated=child.id?english?.[list]?.find(value=>value.id===child.id):english?.[list]?.[i];
    collect(child,translated,`${prefix}.${list}.${child.id??i}`);
  }
}
for(const [kind,table] of Object.entries(contentTables))for(const [id,item] of Object.entries(table))collect(item,englishContent[kind]?.[id],`${kind}.${id}`);
