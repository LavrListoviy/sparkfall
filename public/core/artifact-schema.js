import { LEGACY_ARTIFACTS } from './legacy-artifacts.js';

export const TILE_IDS=['steel','fire','ice','poison','heal'];
export const ICON_IDS=[...TILE_IDS,'storm','compass','heart','spark'];
export const BASE_IDS=Object.keys(LEGACY_ARTIFACTS).filter(id=>LEGACY_ARTIFACTS[id].base);
export const REQUIRED_IDS=['coil','thermal','needle','overclock'];
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const keys=(value,allowed)=>Object.keys(value).every(key=>allowed.includes(key));
const itemFields=['name','text','en','icon','color','cost','rarity','introduced','enabled','base','glyphBonus','rules'];
const ruleFields=['trigger','tile','min','weather','status','limit','effect','amount','element','target','ignoreStorm'];

/** Validate untrusted authoring data and snapshots without executing source code. */
export function catalogErrors(catalog,previous,{draft=false}={}){
  const errors=[];
  const number=(value,min,max)=>integer(value,min,max)||draft&&(value===null||typeof value==='number'&&Number.isFinite(value));
  const label=(value,max)=>text(value,max)||draft&&typeof value==='string'&&value.length<=max;
  if(!object(catalog)||catalog.schema!==1||!keys(catalog,['schema','items'])||!object(catalog.items))return ['Неверный формат каталога (schema: 1, items).'];
  const items=catalog.items;
  if(Object.keys(items).length<1||Object.keys(items).length>256)errors.push('Каталог должен содержать от 1 до 256 предметов.');
  for(const id of Object.keys(previous?.items??LEGACY_ARTIFACTS))if(!Object.hasOwn(items,id))errors.push(`${id}: сохранённый ID нельзя удалить; отключите предмет.`);
  for(const [id,item] of Object.entries(items)){
    const fail=message=>errors.push(`${id}: ${message}`);
    if(!/^[a-z][a-zA-Z0-9]{0,47}$/.test(id)||Object.hasOwn(Object.prototype,id))fail('недопустимый ID.');
    if(!object(item)||!keys(item,itemFields)){fail('неизвестные поля предмета.');continue;}
    if(!label(item.name,100)||!label(item.text,1200)||!object(item.en)||!keys(item.en,['name','text'])||!label(item.en.name,100)||!label(item.en.text,1200))fail('нужны названия и описания RU/EN (100 / 1200 знаков).');
    if(!ICON_IDS.includes(item.icon)||!TILE_IDS.includes(item.color))fail('неизвестная иконка или цвет.');
    if(!number(item.cost,0,100)||!['normal','rare'].includes(item.rarity)||item.rarity==='rare'&&item.cost!==0)fail('цена 0–100; редкий предмет должен иметь цену 0.');
    if(!integer(item.introduced,0,5)||typeof item.enabled!=='boolean')fail('неверная версия или доступность.');
    if(previous?.items[id]&&item.introduced!==previous.items[id].introduced||previous&&!previous.items[id]&&item.introduced!==5)fail('поколение предмета неизменно; новый предмет имеет introduced: 5.');
    if(REQUIRED_IDS.includes(id)&&!item.enabled)fail('предмет используется стартовым набором или событием; отключение запрещено.');
    if(item.base!==null&&!BASE_IDS.includes(item.base))fail('неизвестный базовый блок.');
    if(!object(item.glyphBonus)||!keys(item.glyphBonus,TILE_IDS)||!Object.values(item.glyphBonus).every(v=>number(v,0,100)))fail('бонусы частот должны быть целыми числами 0–100.');
    if(!Array.isArray(item.rules)||item.rules.length>16){fail('допускается до 16 правил.');continue;}
    for(const [index,rule] of item.rules.entries()){
      const bad=()=>fail(`правило ${index+1}: неверное событие, условие, эффект или значение.`);
      if(!object(rule)||!keys(rule,ruleFields)){bad();continue;}
      const cap=rule.effect==='chill'?2:rule.effect==='shield'?4:100;
      if(!['group','cascade','roundEnd'].includes(rule.trigger)||!['any',...TILE_IDS].includes(rule.tile)||!number(rule.min,3,49)||rule.trigger!=='group'&&(rule.tile!=='any'||rule.min!==3)||!['any','inside','outside'].includes(rule.weather)||!['any','chill','poison'].includes(rule.status)||!['event','action','round','battle'].includes(rule.limit)||!['damage','poison','chill','heal','shield'].includes(rule.effect)||!number(rule.amount,1,cap)||!['steel','fire','ice','poison'].includes(rule.element)||!['current','other','all'].includes(rule.target)||typeof rule.ignoreStorm!=='boolean')bad();
    }
  }
  return errors;
}

/** Preserve order: it is part of seeded reward generation and effect resolution. */
export function serializeCatalog(catalog){
  const errors=catalogErrors(catalog);if(errors.length)throw new Error(errors.join('\n'));
  return `export const ARTIFACT_CATALOG = ${JSON.stringify(catalog,null,2)};\n`;
}
/** Parse only the generated JSON wrapper; never import or evaluate user-supplied source. */
export function parseCatalog(source){
  const prefix='export const ARTIFACT_CATALOG = ';
  if(!source.startsWith(prefix)||!source.trimEnd().endsWith(';'))throw new Error('Неверный модуль каталога.');
  const value=JSON.parse(source.slice(prefix.length).trimEnd().slice(0,-1));
  const errors=catalogErrors(value);if(errors.length)throw new Error(errors.join('\n'));
  return value;
}
