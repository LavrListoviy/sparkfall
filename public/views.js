import { t, getLanguage, number, tileName } from './i18n/index.js';
import { glyphWeights } from './core/glyphs.js';
import { TYPES } from './core/board.js';
import { RULES_VERSION } from './core/battle.js';
import { ARTIFACTS, ENEMIES, LOADOUTS, ACHIEVEMENTS, EVENTS } from './i18n/content.js';
import { isActive, choiceBlocked } from './core/run.js';
import { inStorm, stormDepth, travelForecast } from './core/storm.js';
import { errorText } from './i18n/errors.js';
import { glossaryGroups, glossaryTerms } from './i18n/glossary-data.js';
import { createNavigation, paginate, routeSelection } from './presentation/navigation.js';
import { icon } from './icons.js';

export const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const portrait=(index,label)=>`<span class="pixel-portrait" role="img" aria-label="${label}" style="--sprite-x:${index%2*100}%;--sprite-y:${Math.floor(index/2)*100/3}%"></span>`;
const rune=id=>`<span class="relic-rune ${ARTIFACTS[id].color}">${icon(ARTIFACTS[id].icon)}</span>`;
const owned=(profile,kind,id,item)=>item.cost===0||profile.unlocked.includes(`${kind}:${id}`);
export const weatherLabel=gap=>inStorm(gap)?t('weather.depth',{depth:stormDepth(gap)}):t('weather.lead',{gap});

/** Show nominal generation probabilities and their sources, never a quota for the visible board. */
export function glyphFrequencyView(run){
  const weighted=run?.glyphVersion===1,loadout=weighted?run.loadout:'coil',artifacts=weighted?run.artifacts:[];
  const weights=glyphWeights(loadout,artifacts),total=Object.values(weights).reduce((a,b)=>a+b,0);
  return `<p class="modal-kicker">${t('glyph.kicker')}</p><h2>${t('glyph.title')}</h2><p class="glyph-explanation">${t(weighted?'glyph.explanation':'glyph.legacy')}</p><dl class="glyph-frequencies">${TYPES.map(type=>{
    const sources=[...(LOADOUTS[loadout]?.glyphBonus?.[type]?[LOADOUTS[loadout].name]:[]),...artifacts.filter(id=>ARTIFACTS[id]?.glyphBonus?.[type]).map(id=>ARTIFACTS[id].name)];
    return `<div><dt><span class="${type}">${icon(type)}</span><span>${tileName(type)}<small>${sources.join(' · ')||t('glyph.base')}</small></span></dt><dd>${number(Math.round(weights[type]/total*1000)/10)}%</dd></div>`;
  }).join('')}</dl><p class="glyph-note">${t('glyph.constraint')}</p>`;
}
const back=()=>`<button class="text-button screen-back" data-action="home">← ${t('menu.backMain')}</button>`;
const heading=(title,description='',aside='')=>`<header class="screen-heading"><div>${back()}<h1 tabindex="-1">${title}</h1>${description?`<p>${description}</p>`:''}</div>${aside}</header>`;
const bank=profile=>`<div class="menu-bank">${icon('spark')}<strong>${profile.currency}</strong><span>${t('currency.unit',{count:profile.currency})}</span></div>`;
const selection=(kind,id,name,subtitle,selected)=>`<button class="catalog-choice" data-select="${kind}" data-value="${id}" aria-pressed="${selected}" id="choice-${kind}-${id}"><span>${name}</span>${subtitle?`<small>${subtitle}</small>`:''}</button>`;

/** Page controls keep both directions explicit and reachable by keyboard. */
export function pager(kind,{page,pages}){
  return `<nav class="page-controls" aria-label="${t('menu.page',{page:page+1,pages})}"><button class="secondary-button" data-page="${kind}" data-page-value="${page-1}" aria-label="${t('menu.previous')}" ${page===0?'disabled':''}>←</button><span>${t('menu.page',{page:page+1,pages})}</span><button class="secondary-button" data-page="${kind}" data-page-value="${page+1}" aria-label="${t('menu.next')}" ${page+1===pages?'disabled':''}>→</button></nav>`;
}

/** Main-menu navigation does not render purchasing or loadout controls. */
export function homeView(session){
  const active=isActive(session);
  return `<section class="main-menu"><div class="menu-scenery" aria-hidden="true">${portrait(0,'')}</div><div class="main-menu-content"><p class="menu-emblem" aria-hidden="true">✦</p><h1 tabindex="-1">${t('shell.brand')}</h1><nav class="main-menu-actions" aria-label="${t('menu.main')}">${active?`<button class="primary-button" data-action="continue">${t('home.continue')} ${icon('arrow')}</button>`:''}<button class="${active?'menu-button':'primary-button'}" data-action="prepare">${t('menu.new')}</button>${session.run&&!active?`<button class="menu-button" data-screen="run">${t('menu.lastResult')}</button>`:''}<button class="menu-button" data-screen="workshop">${t('menu.workshop')}</button><button class="menu-button" data-action="settings">${t('shell.settings')}</button><button class="menu-button" data-action="guide">${t('menu.guide')}</button></nav>${active?`<p class="menu-save">${t('home.savedRun',{node:Math.min(8,session.run.floor+1),hp:session.run.hp})}</p>`:''}</div><span class="menu-version">${RULES_VERSION}</span></section>`;
}

/** One loadout is inspected at a time; buying it never starts a run implicitly. */
export function loadoutView(session,selected='coil'){
  const id=LOADOUTS[selected]?selected:'coil',item=LOADOUTS[id],artifact=ARTIFACTS[item.artifact];
  const unlocked=owned(session.profile,'loadout',id,item),active=isActive(session);
  return `<section class="game-screen">${heading(t('menu.chooseLoadout'),'',bank(session.profile))}<div class="catalog loadout-catalog"><nav class="catalog-list" aria-label="${t('menu.prepare')}">${Object.entries(LOADOUTS).map(([key,value])=>selection('loadout',key,value.name,value.subtitle,key===id)).join('')}</nav><article class="detail-card loadout-detail"><div class="detail-hero" aria-hidden="true">${portrait(0,'')}</div><div class="detail-copy"><p class="eyebrow">${item.subtitle}</p><h2>${item.name}</h2><p class="detail-facts">${t('home.loadoutDescription')}</p><div class="artifact-description">${rune(item.artifact)}<div><small>${t('menu.startingArtifact')}</small><h3>${artifact.name}</h3></div></div><p>${artifact.text}</p><div class="glyph-affinity"><p>${t(`glyph.affinity.${id}`)}</p><button class="text-button" data-glyph-loadout="${id}">${t('glyph.title')} →</button></div><div class="detail-action">${unlocked?`<button class="primary-button" data-action="start" ${active?'disabled':''}>${t('menu.start')} ${icon('arrow')}</button>`:purchaseControl(session,'loadout',id,item)}</div></div></article></div></section>`;
}
function purchaseControl(session,kind,id,item){
  if(owned(session.profile,kind,id,item))return `<p class="owned-label">✓ ${t('workshop.owned')}</p>`;
  const blocked=isActive(session),missing=Math.max(0,item.cost-session.profile.currency);
  return `<button class="primary-button" data-unlock="${kind}:${id}" ${blocked||missing?'disabled':''}>${t('menu.buy',{cost:item.cost})}</button>${blocked?`<p class="purchase-note">${t('workshop.betweenRuns')}</p>`:missing?`<p class="purchase-note">${t('menu.needSparks',{count:missing})}</p>`:''}`;
}

/** Purchases re-render this view against the same navigation selection and page. */
export function workshopView(session,navigation=createNavigation()){
  const blueprints=navigation.workshopTab!=='achievements',table=blueprints?ARTIFACTS:ACHIEVEMENTS;
  const entries=Object.keys(table).filter(id=>!blueprints||ARTIFACTS[id].cost);
  const page=paginate(entries,navigation.workshopPage,4),kind=blueprints?'blueprint':'achievement';
  const selected=page.items.includes(navigation[kind])?navigation[kind]:page.items[0],item=table[selected];
  const unlocked=blueprints?owned(session.profile,'artifact',selected,item):session.profile.achievements.includes(selected);
  const count=blueprints?entries.filter(id=>session.profile.unlocked.includes(`artifact:${id}`)).length:session.profile.achievements.length;
  return `<section class="game-screen">${heading(t('menu.workshop'),'',bank(session.profile))}<div class="screen-tabs" role="tablist" aria-label="${t('menu.workshop')}">${['blueprints','achievements'].map(tab=>`<button role="tab" data-workshop-tab="${tab}" id="tab-${tab}" aria-selected="${(tab==='blueprints')===blueprints}" aria-controls="workshop-panel">${t(`menu.${tab}`)}</button>`).join('')}</div><div class="catalog" role="tabpanel" id="workshop-panel" aria-labelledby="tab-${blueprints?'blueprints':'achievements'}"><div class="catalog-sidebar"><nav class="catalog-list" aria-label="${t(`menu.${blueprints?'blueprints':'achievements'}`)}">${page.items.map(id=>selection(kind,id,table[id].name,blueprints?(session.profile.unlocked.includes(`artifact:${id}`)?t('workshop.owned'):`${table[id].cost} ✦`):(session.profile.achievements.includes(id)?t('menu.earned'):t('menu.notEarned')),id===selected)).join('')}</nav>${pager('workshop',page)}</div><article class="detail-card"><div class="detail-copy"><p class="eyebrow">${t(blueprints?'menu.progress':'menu.achievementProgress',{owned:count,total:entries.length})}</p><div class="detail-symbol">${blueprints?rune(selected):'<span class="achievement-star">✦</span>'}</div><h2>${item.name}</h2><p>${item.text}</p>${blueprints?`<p class="detail-secondary">${t('menu.blueprintBenefit')}</p><div class="detail-action">${purchaseControl(session,'artifact',selected,item)}</div>`:`<p class="achievement-state ${unlocked?'earned':''}">${unlocked?'✓':'◇'} ${t(unlocked?'menu.earned':'menu.notEarned')}</p><p class="detail-secondary">${t('menu.achievementReward')}</p>`}</div></article></div></section>`;
}

/** The route inspector exposes one layer without changing the graph's entry restrictions. */
export function mapView(run,navigation={}){
  const {floor,node,canEnter}=routeSelection(run,navigation.mapFloor,navigation.mapNode),current=floor===run.floor;
  const forecast=travelForecast(run,node),rare=current&&node.kind==='elite'&&inStorm(forecast);
  const eventId=current&&inStorm(forecast)&&node.stormEvent?node.stormEvent:node.event;
  const title=n=>n.enemyIds?n.enemyIds.map(id=>ENEMIES[id].name).join(' · '):!current&&n.stormEvent?t('node.weatherEncounter'):EVENTS[current&&inStorm(travelForecast(run,n))&&n.stormEvent?n.stormEvent:n.event].name;
  const kind=n=>t(`node.${n.kind==='rest'?'rest':n.kind==='event'?'event':n.kind==='boss'?'boss':n.kind==='elite'?'elite':'battle'}`);
  const imageIndex={furnace:1,sentinel:2,collector:3,guardian:4,jailer:5,alchemist:6,heart:7}[node.enemyIds?.[0]]??0;
  return `<section class="game-screen route-screen">${heading(t('menu.map'),t('menu.stage',{floor:floor+1}),`<div class="run-resources"><span>${t('menu.health',{hp:run.hp})}</span><span>${weatherLabel(run.gap)}</span><button class="text-button" data-action="inventory">${t('menu.viewInventory',{count:run.artifacts.length})}</button></div>`)}<nav class="route-stages" aria-label="${t('menu.map')}">${run.route.map((_,i)=>`<button data-map-floor="${i}" aria-pressed="${i===floor}" aria-label="${t('menu.stageLabel',{floor:i+1})}" ${i===run.floor?'aria-current="step"':''}><span>${run.chosen.some(id=>id.startsWith(`${i}-`))?'✓':i+1}</span>${i===run.floor?'<b>◆</b>':''}</button>`).join('')}</nav><div class="catalog"><nav class="catalog-list" aria-label="${t('menu.stage',{floor:floor+1})}">${run.route[floor].map(n=>selection('mapNode',n.id,title(n),`${kind(n)}${run.routeVersion>=3?` · ${t('menu.lane',{lane:n.lane+1})}`:''}`,n.id===node.id)).join('')}</nav><article class="detail-card route-detail"><div class="route-figure" aria-hidden="true">${portrait(imageIndex,'')}</div><div class="detail-copy"><p class="eyebrow">${t(current?'menu.currentStage':'menu.previewStage')}</p><h2>${title(node)}</h2><p>${node.enemyIds?ENEMIES[node.enemyIds[0]].flavor:EVENTS[eventId].text}</p><div class="travel-summary"><strong>${current?t('menu.forecast',{weather:weatherLabel(forecast)}):t('menu.baseTravel',{gain:node.travel??3})}</strong><p>${node.kind==='elite'?t(rare?'node.rareLoot':'node.rareCondition'):node.kind==='battle'?t('node.artifactLoot'):node.kind==='boss'?t('node.finale'):t('node.choices')}</p></div>${node.next?`<p class="detail-secondary">${t('menu.connections',{lanes:node.next.map(id=>Number(id.split('-')[1])+1).join(' · ')})}</p>`:''}<div class="detail-action"><button class="primary-button" data-node="${node.id}" ${canEnter?'':'disabled'}>${t('menu.travel')} ${icon('arrow')}</button><p class="purchase-note">${t(!current?'menu.previewHint':canEnter?'menu.currentStageHint':'menu.noConnection')}</p></div></div></article></div></section>`;
}

export function rewardView(run,index=0){
  const id=run.reward[index]??run.reward[0],item=ARTIFACTS[id],rare=run.rewardRarity==='rare';
  return `<section class="game-screen">${heading(t('menu.reward'),t(rare?'reward.rareDescription':'reward.description'),`<button class="secondary-button" data-action="inventory">${t('menu.viewInventory',{count:run.artifacts.length})}</button>`)}<div class="catalog"><nav class="catalog-list" aria-label="${t('menu.reward')}">${run.reward.map((key,i)=>selection('reward',i,ARTIFACTS[key].name,t(rare?'reward.rare':'reward.artifact'),key===id)).join('')}</nav><article class="detail-card ${rare?'rare-detail':''}"><div class="detail-copy"><div class="detail-symbol">${rune(id)}</div><p class="eyebrow">${t(rare?'reward.rareKicker':'reward.kicker')}</p><h2>${item.name}</h2><p>${item.text}</p><div class="detail-action"><button class="primary-button" data-reward="${id}">${t('reward.take')} ${icon('arrow')}</button><p class="purchase-note">${t('reward.saved',{hp:run.hp,pendingEmbers:run.pendingEmbers})}</p></div></div></article></div></section>`;
}
export function eventView(run){
  const event=EVENTS[run.event];
  return `<section class="game-screen event-screen">${heading(event.name,t(run.phase==='rest'?'event.restKicker':'event.kicker'),`<div class="run-resources"><span>${t('menu.health',{hp:run.hp})}</span><span>${weatherLabel(run.gap)}</span></div>`)}<article class="event-content"><div class="event-story"><span class="story-icon">${icon(event.icon)}</span><p>${event.text}</p></div><div class="event-decisions">${event.choices.map(c=>`<button class="event-choice" data-choice="${c.id}" ${choiceBlocked(run,c)?'disabled':''}><span><strong>${c.name}</strong><small>${errorText(choiceBlocked(run,c))||c.text}</small></span>${icon('arrow')}</button>`).join('')}<p class="purchase-note">${t('event.finalChoice')}</p></div></article></section>`;
}
export function resultView(session){
  const r=session.run,won=r.phase==='won';
  return `<section class="game-screen result-screen"><div class="result-scenery" aria-hidden="true">${portrait(won?7:0,'')}</div><div class="result-content"><p class="eyebrow">${t(won?'result.wonKicker':'result.lostKicker')}</p><h1 tabindex="-1">${t(won?'result.wonTitle':'result.lostTitle')}</h1><p>${t(won?'result.wonStory':'result.lostStory')}</p><div class="result-stats"><span>${t('result.victoriesLabel')}<b>${r.stats.combats}</b></span><span>${t('result.swapsLabel')}<b>${r.stats.swaps}</b></span><span>${t('result.wavesLabel')}<b>${r.stats.maxCascade}</b></span></div><p class="result-currency">✦ ${t('result.sparks',{count:r.pendingEmbers})}</p>${r.stats.earned.length?`<p class="purchase-note">${t('result.achievements',{names:r.stats.earned.map(id=>ACHIEVEMENTS[id].name).join(' · ')})}</p>`:''}<div class="result-actions"><button class="primary-button" data-action="home">${t('menu.backMain')}</button><button class="secondary-button" data-action="report">${t('result.report')}</button></div></div></section>`;
}

/** Compact inventory entries open full descriptions without expanding the list. */
export function relicInventory(ids){
  return `<div class="relic-inventory">${ids.map(id=>`<button data-relic="${id}" aria-label="${ARTIFACTS[id].name}: ${ARTIFACTS[id].text}">${rune(id)}<span>${ARTIFACTS[id].name}</span></button>`).join('')}</div>`;
}

/** Category pages and a single definition replace the growing disclosure document. */
export function glossaryView({group='board',page=0,term=null}={}){
  const other=getLanguage()==='ru'?'en':'ru',items=glossaryTerms.filter(item=>item.group===group),pagination=paginate(items,page,4);
  const item=pagination.items.find(item=>item.id===term)??pagination.items[0];
  return `<h2>${t('glossary.title')}</h2><div class="glossary-category"><span id="glossary-category-label">${t('menu.category')}</span><div class="category-picker" id="glossary-picker" data-open="false"><button type="button" id="glossary-category" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="glossary-categories" aria-labelledby="glossary-category-label glossary-category-value"><span id="glossary-category-value">${t(`glossary.group.${group}`)}</span><span class="category-chevron" aria-hidden="true"></span></button><div class="category-options" id="glossary-categories" role="listbox" aria-labelledby="glossary-category-label" aria-hidden="true" inert>${glossaryGroups.map(item=>`<div class="category-option" id="category-${item.id}" role="option" aria-selected="${item.id===group}" data-category="${item.id}"><span>${t(`glossary.group.${item.id}`)}</span><span class="category-selected-mark" aria-hidden="true">◆</span></div>`).join('')}</div></div></div><div class="catalog glossary-catalog"><div class="catalog-sidebar"><nav class="catalog-list" aria-label="${t('menu.chooseTerm')}">${pagination.items.map(value=>selection('term',value.id,t(`term.${value.id}.name`),`<span lang="${other}">${value.name[other]}</span>`,value.id===item.id)).join('')}</nav>${pager('glossary',pagination)}</div><article class="term-definition"><h3>${t(`term.${item.id}.name`)}</h3><p class="term-translation" lang="${other}">${item.name[other]}</p><p>${t(`term.${item.id}.description`)}</p></article></div>`;
}
