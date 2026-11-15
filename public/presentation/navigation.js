import { ARTIFACTS, ACHIEVEMENTS, LOADOUTS } from '../core/content.js';
import { reachableNodes } from '../core/routes.js';

/** Navigation is transient presentation state and is never part of a saved expedition. */
export const createNavigation=()=>({screen:'main',workshopTab:'blueprints',blueprint:'spore',achievement:'first_blood',workshopPage:0,workshopPages:{blueprints:0,achievements:0},loadout:'coil',mapFloor:null,mapNode:null,reward:0});

/** Keep unrelated selections when a screen, tab or highlighted item changes. */
export function navigate(state,{type,value}){
  if(type==='screen'&&!['main','workshop','loadout','run'].includes(value))return state;
  if(type==='workshopTab')return ['blueprints','achievements'].includes(value)?{...state,workshopTab:value,workshopPage:state.workshopPages?.[value]??0}:state;
  if(type==='blueprint'&&!ARTIFACTS[value]?.cost)return state;
  if(type==='achievement'&&!ACHIEVEMENTS[value])return state;
  if(type==='loadout'&&!LOADOUTS[value])return state;
  if(['workshopPage','reward'].includes(type)&&(!Number.isInteger(value)||value<0))return state;
  if(type==='workshopPage')return {...state,workshopPage:value,workshopPages:{...state.workshopPages,[state.workshopTab]:value}};
  if(type==='mapFloor')return Number.isInteger(value)&&value>=0&&value<8?{...state,mapFloor:value,mapNode:null}:state;
  if(!['screen','blueprint','achievement','loadout','workshopPage','mapNode','reward'].includes(type))return state;
  return {...state,[type]:value};
}

/** Stable pages make every entry reachable without depending on a scroll position. */
export function paginate(items,page=0,size=4){
  size=Math.max(1,Math.floor(size)||1);
  const pages=Math.max(1,Math.ceil(items.length/size));
  page=Math.min(pages-1,Math.max(0,Math.floor(page)||0));
  return {items:items.slice(page*size,(page+1)*size),page,pages};
}

/** Previewing a route layer cannot authorize entry; the current graph remains authoritative. */
export function routeSelection(run,floor=run.floor,id){
  floor=Number.isInteger(floor)?Math.max(0,Math.min(run.route.length-1,floor)):run.floor;
  const layer=run.route[floor],reachable=reachableNodes(run);
  const node=layer.find(node=>node.id===id)??(floor===run.floor?reachable[0]:null)??layer[0];
  return {floor,node,canEnter:floor===run.floor&&reachable.some(candidate=>candidate.id===node.id)};
}
