import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { Random } from '../public/core/random.js';
import { glyphWeights } from '../public/core/glyphs.js';
import { TYPES, createBoard, findMatches, legalMoves, swapBoard, strikeBoard, disableCorners, applyHazard, ensurePlayable } from '../public/core/board.js';

const seeds=Number(process.argv[2]||10),actions=Number(process.argv[3]||20);
const ids=['steelMagnet','emberResonator','frostResonator','sporeLure','still'];
const profiles=[{name:'uniform',weights:undefined}];
for(const loadout of ['coil','thermal','needle'])for(let mask=0;mask<32;mask++){
  const artifacts=ids.filter((_,i)=>mask&(1<<i));
  profiles.push({name:`${loadout}:${mask}`,weights:glyphWeights(loadout,artifacts)});
}
for(let mask=0;mask<32;mask++)profiles.push({name:`limit:${mask}`,weights:Object.fromEntries(TYPES.map((type,i)=>[type,mask&(1<<i)?200:100]))});
const mean=values=>values.reduce((a,b)=>a+b,0)/values.length;
const percentile=(sorted,p)=>sorted[Math.ceil(sorted.length*p)-1];
const rows=[];
/** Exercise public board operations; move choice uses an independent RNG and never inspects future draws. */
for(const profile of profiles){
  const waves=[],moves=[],counts=Object.fromEntries(TYPES.map(type=>[type,0]));let caps=0;
  for(let seed=0;seed<seeds*(profile.name==='uniform'?10:1);seed++){
    const random=new Random(`GLYPHS-${seed}`),decisions=new Random(`MOVES-${seed}`);
    let board=createBoard(random,7,7,profile.weights);
    if(seed%4===1)for(const i of [9,17,25])board=strikeBoard(board,i,random);
    if(seed%4===2)board=ensurePlayable(applyHazard(board,'locks',[10,20,30]),random);
    if(seed%4===3)board=disableCorners(board,random);
    for(let step=0;step<actions;step++){
      assert.equal(findMatches(board).length,0,profile.name);
      assert.ok(board.tiles.every((tile,i)=>board.blocked[i]||board.craters[i]?tile===null:TYPES.includes(tile)),profile.name);
      const available=legalMoves(board);assert.ok(available.length,profile.name);moves.push(available.length);
      const [a,b]=available[decisions.int(available.length)],result=swapBoard(board,a,b,random);
      waves.push(result.waves.length);
      if(result.waves.length===64&&findMatches(result.waves.at(-1).after).length)caps++;
      for(const wave of result.waves){
        for(const type of TYPES){
          const before=wave.before.tiles.filter(tile=>tile===type).length;
          const after=wave.after.tiles.filter(tile=>tile===type).length;
          const matched=wave.groups.filter(group=>group.type===type).reduce((sum,group)=>sum+group.indices.length,0);
          counts[type]+=after-before+matched;
        }
      }
      board=result.board;
    }
    assert.equal(findMatches(board).length,0);assert.ok(legalMoves(board).length);
  }
  const sorted=[...waves].sort((a,b)=>a-b),total=Object.values(counts).reduce((a,b)=>a+b,0);
  rows.push({name:profile.name,actions:waves.length,meanWaves:mean(waves),p95:percentile(sorted,.95),p99:percentile(sorted,.99),max:sorted.at(-1),caps,meanMoves:mean(moves),minMoves:Math.min(...moves),newGlyphs:total,frequencies:Object.fromEntries(TYPES.map(type=>[type,counts[type]/total])),weights:profile.weights});
}
const report={seeds,actionsPerSeed:actions,profiles:rows.length,totalActions:rows.reduce((sum,row)=>sum+row.actions,0),rows};
writeFileSync(new URL('../docs/glyph-simulation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({totalActions:report.totalActions,profiles:rows.length,baseline:rows[0],weightedMeanWaves:mean(rows.slice(1,97).map(row=>row.meanWaves)),worstMean:rows.toSorted((a,b)=>b.meanWaves-a.meanWaves)[0],maxWaves:Math.max(...rows.map(row=>row.max)),caps:rows.reduce((sum,row)=>sum+row.caps,0)}));
