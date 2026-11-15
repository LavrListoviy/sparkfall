import { simulate } from './simulate.mjs';
import { writeFileSync } from 'node:fs';

const count=Number(process.argv[2]||10),rows=[];
const boosts=['steelMagnet','emberResonator','frostResonator','sporeLure','still'];
const builds={coil:['still','green','ampoule'],thermal:['emberResonator','frostResonator','thermal'],needle:['steelMagnet','sporeLure','needle']};
/** Compare ordinary play with legacy rules and deliberate synergy choices, using public reducers. */
for(const variant of ['legacy','current','focused'])for(const loadout of Object.keys(builds))for(let i=0;i<count;i++){
  const options={glyphVersion:variant==='legacy'?0:1};
  if(variant==='focused')Object.assign(options,{rewardPriority:builds[loadout],unlocks:['loadout:thermal','loadout:needle','artifact:ampoule']});
  const {session,...result}=simulate(`PLAY-${i}`,loadout,i%3,options);
  rows.push({variant,...result,artifacts:session.run.artifacts,maxWaves:session.run.stats.maxCascade});
}
const summary=[];
for(const variant of ['legacy','current','focused'])for(const loadout of Object.keys(builds)){
  const group=rows.filter(r=>r.variant===variant&&r.loadout===loadout);
  summary.push({variant,loadout,runs:group.length,wins:group.filter(r=>r.phase==='won').length,bossReached:group.filter(r=>r.floor>=7).length,meanSwaps:group.reduce((sum,r)=>sum+r.swaps,0)/group.length,maxSwaps:Math.max(...group.map(r=>r.swaps)),maxWaves:Math.max(...group.map(r=>r.maxWaves)),boostOwned:group.filter(r=>boosts.some(id=>r.artifacts.includes(id))).length,completeBuild:group.filter(r=>builds[loadout].every(id=>r.artifacts.includes(id))).length});
}
writeFileSync(new URL('../docs/glyph-runs.json',import.meta.url),JSON.stringify({summary,rows},null,2)+'\n');
console.log(JSON.stringify(summary));
