import { uiMessages } from './messages.js';
import { menuMessages } from './menu-messages.js';
import { contentMessages } from './content-messages.js';
import { glossaryGroups, glossaryTerms } from './glossary-data.js';
const glossaryMessages=Object.fromEntries([
  ...glossaryGroups.map(({id,ru,en})=>[`glossary.group.${id}`,{ru,en}]),
  ...glossaryTerms.flatMap(term=>[[`term.${term.id}.name`,term.name],[`term.${term.id}.description`,term.description]]),
]);
export const messages = {...contentMessages,...glossaryMessages,...uiMessages,...menuMessages};
let language='ru';
export const getLanguage=()=>language;
export function setLanguage(value){language=value==='en'?'en':'ru';}
const numbers={ru:new Intl.NumberFormat('ru',{useGrouping:false,maximumFractionDigits:2}),en:new Intl.NumberFormat('en',{useGrouping:false,maximumFractionDigits:2})};
const plurals={ru:new Intl.PluralRules('ru'),en:new Intl.PluralRules('en')};
export function number(value) {return numbers[language].format(value);}
/** Translate complete messages; callers escape text at HTML boundaries, never in the catalog. */
export function t(key,parameters={}) {
  const record=messages[key];
  if(!record)throw new Error(`Missing translation: ${key}`);
  const locale=record[language]===undefined?'ru':language;
  let value=record[locale];
  if(typeof value==='object')value=value[plurals[locale].select(parameters.count)]??value.other;
  if(typeof value!=='string')throw new Error(`Invalid translation: ${key}`);
  return value.replace(/\{(\w+)\}/g,(_,name)=>{
    if(!Object.hasOwn(parameters,name))throw new Error(`Missing parameter ${name} in ${key}`);
    return typeof parameters[name]==='number'?number(parameters[name]):String(parameters[name]);
  });
}
export const tileName=type=>t(`tile.${type}`);
