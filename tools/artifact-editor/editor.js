import { icon } from './game/icons.js';
import { catalogErrors,TILE_IDS,ICON_IDS,BASE_IDS,REQUIRED_IDS } from './game/core/artifact-schema.js';
import { LEGACY_ARTIFACTS } from './game/core/legacy-artifacts.js';
import { simulateArtifact } from './game/core/artifact-sandbox.js';

const $=selector=>document.querySelector(selector),clone=value=>structuredClone(value);
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORAGE='sparkfall.artifact-editor.draft.v1';
const tiles={any:'Любой тип',steel:'Клинки',fire:'Огонь',ice:'Холод',poison:'Яд',heal:'Зелья'};
const triggers={group:'После группы',cascade:'Перед дополнительной волной',roundEnd:'После раунда и шторма'};
const effects={damage:'Нанести урон',poison:'Наложить яд',chill:'Наложить озноб',heal:'Восстановить здоровье',shield:'Зарядить метеоритный щит'};
const limits={event:'Каждое событие',action:'Один раз за действие',round:'Один раз за раунд',battle:'Один раз за бой'};
const weather={any:'Всегда',inside:'Внутри шторма',outside:'Вне шторма'};
const statuses={any:'Не важно',chill:'У цели есть озноб',poison:'У цели есть яд'};
const targets={current:'Текущая цель',other:'Первый другой враг',all:'Все живые враги'};
let remote,catalog,revision,token,selected,tab='details',language='ru',dirty=false,busy=false,copyFrom=null;
const current=()=>catalog?.items[selected];
const defaultRule=()=>({trigger:'group',tile:'steel',min:3,weather:'any',status:'any',limit:'action',effect:'damage',amount:6,element:'fire',target:'current',ignoreStorm:false});
const defaultItem=()=>({name:'Новый артефакт',text:'Первая группа клинков за действие дополнительно наносит цели 6 огненного урона, если она выжила.',en:{name:'New artifact',text:'The first Blade match each action deals 6 additional Fire damage if the target survives.'},icon:'fire',color:'fire',cost:0,rarity:'normal',introduced:5,enabled:true,base:null,glyphBonus:{},rules:[defaultRule()]});
const status=(message,error=false)=>{$('#notice').textContent=message;$('#notice').classList.toggle('error',error);};
const options=(values,value)=>Object.entries(values).map(([id,label])=>`<option value="${escape(id)}" ${id===String(value)?'selected':''}>${escape(label)}</option>`).join('');
const select=(label,field,values,value,extra='')=>`<label>${label}<select data-field="${field}" ${extra}>${options(values,value)}</select></label>`;
const input=(label,field,value,type='text',extra='')=>`<label>${label}<input type="${type}" data-field="${field}" value="${escape(value)}" ${extra}></label>`;
const textarea=(label,field,value)=>`<label>${label}<textarea data-field="${field}" maxlength="1200">${escape(value)}</textarea></label>`;
const ruleSelect=(index,label,field,values,value)=>`<label>${label}<select data-rule="${index}" data-key="${field}">${options(values,value)}</select></label>`;

/** Persist only the local draft; the explicit Save action owns project writes. */
function changed(){
  dirty=JSON.stringify(catalog)!==JSON.stringify(remote);
  try{if(dirty)localStorage.setItem(STORAGE,JSON.stringify({catalog,revision,selected}));else localStorage.removeItem(STORAGE);}catch{status('Черновик не удалось сохранить в браузере. Используйте экспорт JSON.',true);}
  renderMeta();renderLibrary();renderPreview();validate();
}
function validate(){
  const errors=catalogErrors(catalog,{schema:1,items:remote.items});
  $('#validation').innerHTML=errors.slice(0,8).map(e=>`<p class="validation-error">${escape(e)}</p>`).join('');
  $('#save').disabled=busy||!dirty||errors.length>0;
  $('#save').textContent=busy?'Сохранение…':dirty?'Сохранить изменения':'Сохранено в проекте';
  return errors;
}
function renderMeta(){
  const item=current();if(!item)return;
  $('#item-title').textContent=item.name;$('#item-id').textContent=`${selected}  /  ${item.enabled?'включён':'отключён'}${dirty?'  ·  есть изменения':''}`;
}
function renderLibrary(){
  const scrollTop=$('#catalog').scrollTop,scrollLeft=$('#catalog').scrollLeft;
  const search=$('#search').value.toLocaleLowerCase('ru');
  const entries=Object.entries(catalog.items).filter(([id,item])=>`${id} ${item.name} ${item.en.name}`.toLocaleLowerCase('ru').includes(search));
  $('#count').textContent=Object.keys(catalog.items).length;
  $('#catalog').innerHTML=entries.map(([id,item])=>`<button class="catalog-entry ${item.enabled?'':'off'}" data-item="${id}" aria-current="${id===selected}"><span class="${item.color}">${icon(item.icon)}</span><span><strong>${escape(item.name)}</strong><small>${id}${item.rarity==='rare'?' · редкий':''}${item.enabled?'':' · отключён'}</small></span></button>`).join('')||'<p class="empty">Ничего не найдено.</p>';
  $('#catalog').scrollTop=scrollTop;$('#catalog').scrollLeft=scrollLeft;
}
function renderPreview(){
  const item=current();if(!item)return;const text=language==='en'?item.en:item;
  $('#language').textContent=language==='ru'?'RU → EN':'EN → RU';
  $('#preview').innerHTML=`<article class="preview-card" lang="${language}"><div class="preview-icon ${item.color}">${icon(item.icon)}</div><span class="badge">${language==='ru'?(item.rarity==='rare'?'РЕДКИЙ АРТЕФАКТ':'АРТЕФАКТ'):(item.rarity==='rare'?'RARE ARTIFACT':'ARTIFACT')}</span><h3>${escape(text.name)}</h3><p>${escape(text.text)}</p><span class="badge">${item.cost?`${item.cost} ✦`:(language==='ru'?'БЕЗ ЧЕРТЕЖА':'NO BLUEPRINT')}</span></article>`;
}
function describeRule(rule){
  return `${triggers[rule.trigger]}${rule.trigger==='group'?` · ${tiles[rule.tile]}, ${rule.min}+`:''} · ${weather[rule.weather]}${rule.status==='any'?'':` · ${statuses[rule.status]}`} → ${effects[rule.effect]}: ${rule.amount}${rule.effect==='damage'?` (${tiles[rule.element]})`:''} · ${limits[rule.limit].toLowerCase()}.`;
}
function renderDetails(){
  const item=current();
  return `<section class="panel"><div class="panel-title"><h2>Название и описание</h2><small>RU / EN</small></div><div class="fields">${input('Название · RU','name',item.name,'text','maxlength="100"')}${input('Name · EN','en.name',item.en.name,'text','maxlength="100"')}${textarea('Описание · RU','text',item.text)}${textarea('Description · EN','en.text',item.en.text)}</div><p class="help">Описание — текст карточки. Фактическое поведение задаётся во вкладке «Эффекты».</p></section><section class="panel"><div class="panel-title"><h2>Внешний вид и доступность</h2></div><div class="fields">${select('Иконка','icon',Object.fromEntries(ICON_IDS.map(id=>[id,tiles[id]??({storm:'Шторм',compass:'Компас',heart:'Сердце',spark:'Искра'}[id])])),item.icon)}${select('Цвет','color',Object.fromEntries(TILE_IDS.map(id=>[id,tiles[id]])),item.color)}${select('Редкость','rarity',{normal:'Обычный',rare:'Редкий · штормовая элита'},item.rarity)}${input('Цена чертежа · 0 = сразу доступен','cost',item.cost,'number',`min="0" max="100" step="1" ${item.rarity==='rare'?'disabled':''}`)}<label class="check span-all"><input type="checkbox" data-field="enabled" ${item.enabled?'checked':''} ${REQUIRED_IDS.includes(selected)?'disabled':''}>Участвует в новых наградах${REQUIRED_IDS.includes(selected)?' · нужен стартовому набору или событию':''}</label></div></section><section class="panel"><div class="panel-title"><h2>Частота глифов</h2><small>Бонус к весу</small></div><div class="glyph-fields">${TILE_IDS.map(type=>input(tiles[type],`glyphBonus.${type}`,item.glyphBonus[type]??0,'number','min="0" max="100" step="1"')).join('')}</div><p class="help">Базовый вес — 100. Общий предел с классом и артефактами — 200. Бонус +50 даёт около 27,3% вместо 20% при равных остальных весах.</p></section>`;
}
function renderRules(){
  const item=current();
  return `<section class="panel"><div class="panel-title"><h2>Базовая механика</h2><small>Необязательно</small></div>${select('Унаследовать специальный блок','base',{'':'Без специального блока',...Object.fromEntries(BASE_IDS.map(id=>[id,LEGACY_ARTIFACTS[id].name]))},item.base??'')}${item.base?`<p class="help">${escape(LEGACY_ARTIFACTS[item.base].text)}</p><p class="danger-note">Внутренние числа блока фиксированы. Несколько копий одного блока действуют как одна.</p>`:'<p class="help">Готовые механики старых артефактов. Дополнительные правила ниже работают независимо.</p>'}</section><div class="panel-title"><h2>Дополнительные правила <span class="muted">${item.rules.length} / 16</span></h2></div>${item.rules.map((rule,index)=>`<section class="panel rule"><div class="rule-title"><h3>Правило ${String(index+1).padStart(2,'0')}</h3><button data-move="${index}" data-direction="-1" aria-label="Поднять правило ${index+1}" ${index===0?'disabled':''}>↑</button><button data-move="${index}" data-direction="1" aria-label="Опустить правило ${index+1}" ${index===item.rules.length-1?'disabled':''}>↓</button><button data-remove="${index}" aria-label="Удалить правило ${index+1}">×</button></div><div class="fields">${ruleSelect(index,'Когда', 'trigger',triggers,rule.trigger)}${ruleSelect(index,'Шторм','weather',weather,rule.weather)}${ruleSelect(index,'Лимит','limit',limits,rule.limit)}${rule.trigger==='group'?`${ruleSelect(index,'Тип группы','tile',tiles,rule.tile)}<label>Минимальный размер<input type="number" min="3" max="49" step="1" data-rule="${index}" data-key="min" value="${rule.min}"></label>`:''}${ruleSelect(index,'Условие на исходной цели','status',statuses,rule.status)}${ruleSelect(index,'Эффект','effect',effects,rule.effect)}<label>Величина<input type="number" min="1" max="${rule.effect==='chill'?2:rule.effect==='shield'?4:100}" step="1" data-rule="${index}" data-key="amount" value="${rule.amount}"></label>${rule.effect==='damage'?ruleSelect(index,'Стихия урона','element',Object.fromEntries(['steel','fire','ice','poison'].map(id=>[id,tiles[id]])),rule.element):''}${['damage','poison','chill'].includes(rule.effect)?ruleSelect(index,'Цель','target',targets,rule.target):''}${rule.effect==='heal'?`<label class="check span-all"><input type="checkbox" data-rule="${index}" data-key="ignoreStorm" ${rule.ignoreStorm?'checked':''}>Разрешить лечение внутри шторма</label>`:''}</div><p class="rule-summary" data-summary="${index}">${escape(describeRule(rule))}</p></section>`).join('')}${item.rules.length===0?'<p class="empty">Пока нет дополнительных правил.<br>Добавьте эффект или оставьте только базовую механику и частоты.</p>':''}<button class="add-rule" id="add-rule" ${item.rules.length>=16?'disabled':''}>＋ Добавить правило</button><p class="help">Правила выполняются сверху вниз, после базовой механики. Урон и статусы текущей цели пропадают, если её уже убил основной эффект. Производные эффекты не запускают новые правила.</p>`;
}
function renderTest(){
  return `<section class="panel"><div class="panel-title"><h2>Проверка в бою</h2><small>Изолированное состояние</small></div><p class="help">Печной автомат: 110 HP, сопротивление огню ×0,5, уязвимость к холоду ×1,5. В бою только выбранный артефакт.</p><div class="fields" style="margin-top:20px"><label>Сценарий<select id="test-trigger">${options(triggers,'group')}</select></label><label>Глиф<select id="test-tile">${options(Object.fromEntries(TILE_IDS.map(id=>[id,tiles[id]])),'steel')}</select></label><label>Размер группы<input id="test-count" type="number" value="3" min="3" max="49"></label><label>Групп в одном действии / раундов<input id="test-repeats" type="number" value="2" min="1" max="8"></label><label>Отрыв · 0 и ниже = шторм<input id="test-gap" type="number" value="4" min="-20" max="6"></label><label>Здоровье героя<input id="test-hp" type="number" value="40" min="1" max="70"></label><label>Озноб на цели<input id="test-chill" type="number" value="0" min="0" max="2"></label><label>Яд на цели<input id="test-poison" type="number" value="0" min="0" max="100"></label></div><p class="help">Для каскада подбирается настоящий допустимый обмен с дополнительной волной; тип, размер и число групп определяются полем. Для конца раунда враг атакует, затем приходит шторм.</p><button id="simulate" class="primary" style="margin-top:22px">Проверить эффект</button><div id="test-result" aria-live="polite"></div></section>`;
}
function renderEditor(){
  if(!current())return;
  document.querySelectorAll('[data-tab]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.tab===tab));
  $('#editor').innerHTML=tab==='details'?renderDetails():tab==='rules'?renderRules():renderTest();
}
function render(){renderMeta();renderLibrary();renderEditor();renderPreview();validate();}
/** An in-page dialog keeps focus and cancellation consistent across browsers. */
function confirmDraft(message){
  const dialog=$('#confirm-dialog');$('#confirm-message').textContent=message;dialog.returnValue='cancel';
  return new Promise(resolve=>{dialog.addEventListener('close',()=>resolve(dialog.returnValue==='accept'),{once:true});dialog.showModal();});
}
async function load(restore=true){
  try{
    const response=await fetch('./api/catalog');if(!response.ok)throw new Error('Не удалось загрузить каталог.');
    const data=await response.json();remote=clone(data.catalog);catalog=clone(data.catalog);revision=data.revision;token=data.token;dirty=false;
    let draft;try{draft=restore?JSON.parse(localStorage.getItem(STORAGE)):null;}catch{}
    if(draft?.catalog&&catalogErrors(draft.catalog,remote,{draft:true}).length===0){catalog=draft.catalog;revision=draft.revision;selected=draft.selected;dirty=true;status(revision!==data.revision?'Черновик восстановлен, но каталог на диске изменился. Экспортируйте черновик перед загрузкой актуальной версии.':'Черновик восстановлен. Изменения ещё не записаны в проект.',revision!==data.revision);}
    else status('Каталог загружен. Изменения появятся в игре после сохранения и обновления страницы.');
    if(!catalog.items[selected])selected=Object.keys(catalog.items)[0];render();
  }catch(error){status(error.message,true);}
}
$('#search').addEventListener('input',()=>catalog&&renderLibrary());
$('#catalog').addEventListener('click',event=>{const button=event.target.closest('[data-item]');if(!button)return;selected=button.dataset.item;render();});
document.querySelector('.tabs').addEventListener('click',event=>{const button=event.target.closest('[data-tab]');if(!button)return;tab=button.dataset.tab;renderEditor();});
$('#language').addEventListener('click',()=>{language=language==='ru'?'en':'ru';renderPreview();});
$('#editor').addEventListener('input',event=>{
  const control=event.target;if(!control.matches('[data-field],[data-rule]'))return;
  let value=control.type==='checkbox'?control.checked:control.type==='number'?Number(control.value):control.value;
  if(control.type==='number'&&control.value==='')value=null;
  if(control.dataset.rule!==undefined){current().rules[Number(control.dataset.rule)][control.dataset.key]=value;}
  else{
    const [key,child]=control.dataset.field.split('.');
    if(child)current()[key][child]=value;else current()[key]=key==='base'?(value||null):value;
    if(key==='rarity'&&value==='rare')current().cost=0;
  }
  changed();
  document.querySelectorAll('[data-summary]').forEach(node=>{node.textContent=describeRule(current().rules[Number(node.dataset.summary)]);});
});
$('#editor').addEventListener('change',event=>{
  const control=event.target;
  if(control.dataset.rule!==undefined&&['trigger','effect'].includes(control.dataset.key)){
    const rule=current().rules[Number(control.dataset.rule)];
    if(rule.trigger!=='group'){rule.tile='any';rule.min=3;}
    if(rule.effect==='chill')rule.amount=Math.min(rule.amount,2);if(rule.effect==='shield')rule.amount=Math.min(rule.amount,4);
    changed();renderEditor();$(`[data-rule="${control.dataset.rule}"][data-key="${control.dataset.key}"]`)?.focus();
  }else if(['rarity','base'].includes(control.dataset.field)){renderEditor();$(`[data-field="${control.dataset.field}"]`)?.focus();}
});
$('#editor').addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.id==='add-rule'){current().rules.push(defaultRule());changed();renderEditor();$(`[data-rule="${current().rules.length-1}"][data-key="trigger"]`)?.focus();}
  if(button.dataset.remove!==undefined){current().rules.splice(Number(button.dataset.remove),1);changed();renderEditor();$('#add-rule')?.focus();}
  if(button.dataset.move!==undefined){const from=Number(button.dataset.move),to=from+Number(button.dataset.direction);[current().rules[from],current().rules[to]]=[current().rules[to],current().rules[from]];changed();renderEditor();$(`[data-rule="${to}"][data-key="trigger"]`)?.focus();}
  if(button.id==='simulate'){
    try{
      const config=Object.fromEntries(['trigger','tile','count','repeats','gap','hp','chill','poison'].map(key=>[key,['trigger','tile'].includes(key)?$(`#test-${key}`).value:Number($(`#test-${key}`).value)]));
      const result=simulateArtifact(catalog.items,selected,config),enemy=result.enemies[0];
      $('#test-result').innerHTML=`<div class="result-grid"><div><strong>${result.player.hp}</strong><span>HP ГЕРОЯ</span></div><div><strong>${enemy.hp}</strong><span>HP ПРОТИВНИКА</span></div><div><strong>${enemy.poison} / ${enemy.chill}</strong><span>ЯД / ОЗНОБ</span></div><div><strong>${result.player.stormShield}</strong><span>ЩИТ</span></div></div><p class="help">Эффектов выбранного предмета: ${result.events.filter(e=>e.artifact===selected).length}${result.waves?.length?` · волн: ${result.waves.length}`:''}. Результат рассчитан игровым ядром.</p><ol class="event-log">${result.events.map(e=>`<li>${escape(e.artifact?`${catalog.items[e.artifact]?.name??e.artifact}: `:'')}${escape(({damage:'Урон',heal:'Лечение',healBlocked:'Лечение запрещено',poison:'Яд',chill:'Озноб',ward:'Щит',attack:'Атака врага',meteor:'Метеорит',storm:'Приближение шторма',poisonTick:'Урон ядом',artifact:'Специальная механика',enemyPhase:'Ответ противника'})[e.type]??e.type)}${e.amount!==undefined?` · ${e.amount}`:''}${e.element?` · ${tiles[e.element]}`:''}</li>`).join('')}</ol>`;
    }catch(error){$('#test-result').innerHTML=`<p class="validation-error">${escape(error.message)}</p>`;}
  }
});
function openCreate(source){
  if(!catalog)return;copyFrom=source;let n=1;while(catalog.items[`${source??'artifact'}${n}`])n++;
  $('#create-title').textContent=source?'Создать копию':'Создать артефакт';$('#create-id').value=`${source??'artifact'}${n}`;$('#create-error').textContent='';$('#create-dialog').showModal();$('#create-id').select();
}
$('#new').addEventListener('click',()=>openCreate(null));$('#duplicate').addEventListener('click',()=>openCreate(selected));
$('#cancel-create').addEventListener('click',()=>$('#create-dialog').close());
$('#create-form').addEventListener('submit',event=>{
  event.preventDefault();const id=$('#create-id').value;
  if(Object.hasOwn(catalog.items,id)||Object.hasOwn(Object.prototype,id)){$('#create-error').textContent='Этот ID уже занят.';return;}
  const item=copyFrom?clone(catalog.items[copyFrom]):defaultItem();item.introduced=5;item.enabled=true;
  if(copyFrom){item.name=`${item.name} · копия`;item.en.name=`${item.en.name} · copy`;}
  catalog.items[id]=item;selected=id;tab='details';$('#create-dialog').close();changed();render();status('Предмет создан в черновике. Настройте эффекты и сохраните в проект.');
});
$('#save').addEventListener('click',async()=>{
  if(validate().length||busy)return;busy=true;validate();
  const submitted=clone(catalog);
  try{
    const response=await fetch('./api/catalog',{method:'PUT',headers:{'Content-Type':'application/json','X-Editor-Token':token},body:JSON.stringify({catalog:submitted,revision})});
    const result=await response.json();if(!response.ok)throw new Error(result.error);
    remote=clone(result.catalog);revision=result.revision;
    if(JSON.stringify(catalog)===JSON.stringify(submitted))catalog=clone(result.catalog);
    changed();status('Сохранено в public/core/artifact-catalog.js. Обновите страницу игры и начните новую экспедицию. Затем выполните npm run glossary.');
  }catch(error){status(error.message,true);}finally{busy=false;validate();}
});
$('#export').addEventListener('click',()=>{
  if(!catalog)return;const url=URL.createObjectURL(new Blob([JSON.stringify(catalog,null,2)+'\n'],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='sparkfall-artifacts.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('#import').addEventListener('click',()=>catalog&&$('#import-file').click());
$('#import-file').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{
    if(file.size>1_000_000)throw new Error('JSON больше 1 МБ.');
    const imported=JSON.parse(await file.text()),errors=catalogErrors(imported,remote);
    if(errors.length)throw new Error(errors.join('\n'));
    if(dirty&&!await confirmDraft('Заменить текущий черновик импортированным каталогом?'))return;
    catalog=imported;if(!catalog.items[selected])selected=Object.keys(catalog.items)[0];changed();render();status('Каталог импортирован в черновик. Для записи в проект нажмите «Сохранить».');
  }catch(error){status(error.message,true);}finally{event.target.value='';}
});
$('#reset').addEventListener('click',async()=>{if(dirty&&!await confirmDraft('Отменить несохранённые изменения и загрузить каталог с диска?'))return;try{localStorage.removeItem(STORAGE);}catch{}await load(false);});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
await load();
