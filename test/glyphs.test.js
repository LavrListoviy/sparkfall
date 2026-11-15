import test from 'node:test';
import assert from 'node:assert/strict';
import { glyphWeights, combineGlyphBonuses } from '../public/core/glyphs.js';
import { TYPES, createBoard, fillBoard, findMatches, legalMoves, swapBoard, strikeBoard, ageCraters, cleanCell, disableCorners, applyHazard, ensurePlayable } from '../public/core/board.js';
import { Random } from '../public/core/random.js';

const base={steel:100,fire:100,ice:100,poison:100,heal:100};
const stable=board=>{
  assert.equal(findMatches(board).length,0);
  assert.ok(legalMoves(board).length>0);
  assert.ok(board.tiles.every((tile,i)=>board.craters[i]||board.blocked[i]?tile===null:TYPES.includes(tile)));
};

test('G03: a pathological weighted cascade stops at 64 waves and repairs without bonus waves',()=>{
  const symbols={S:'steel',F:'fire',I:'ice',P:'poison',H:'heal'};
  const tiles=['FSFIP','IFSIH','SIHPS','HIPSI','PSIHF'].join('').split('').map(s=>symbols[s]);
  const board={width:5,height:5,tiles,craters:Array(25).fill(0),glyphWeights:{...base,fire:200}};
  let calls=0;const seeded=new Random('escape');
  const random={next:()=>++calls<400?.3:seeded.next(),int(max){return Math.floor(this.next()*max);}};
  const result=swapBoard(board,1,6,random);
  assert.equal(result.valid,true);assert.equal(result.waves.length,64);stable(result.board);
});

test('G01/G02: classes and unique artifacts add independent glyph bonuses',()=>{
  assert.deepEqual(glyphWeights('coil',[]),base);
  assert.deepEqual(glyphWeights('thermal',['thermal']),{...base,fire:125,ice:125});
  assert.deepEqual(glyphWeights('needle',['needle']),{...base,steel:125,poison:125});
  assert.deepEqual(glyphWeights('thermal',['emberResonator','emberResonator','frostResonator']),{...base,fire:175,ice:175});
  assert.deepEqual(glyphWeights('coil',['steelMagnet','sporeLure','still']),{...base,steel:150,poison:150,heal:150});
});

test('G01: additive weights saturate without excluding any glyph',()=>{
  assert.deepEqual(combineGlyphBonuses([{fire:50},{fire:500,heal:-200}]),{...base,fire:200});
  for(let mask=0;mask<32;mask++){
    const weights=combineGlyphBonuses([Object.fromEntries(TYPES.map((type,i)=>[type,mask&(1<<i)?1000:-1000]))]);
    const total=Object.values(weights).reduce((a,b)=>a+b,0);
    for(const weight of Object.values(weights))assert.ok(weight/total>=1/9&&weight/total<=1/3);
  }
});

test('G03: weighted generation favors fire at creation and free refill',()=>{
  const weights={...base,fire:200};
  let initialFire=0,neutralFire=0;
  for(let seed=0;seed<80;seed++){
    const board=createBoard(new Random(seed),7,7,weights);
    stable(board);initialFire+=board.tiles.filter(t=>t==='fire').length;
    neutralFire+=createBoard(new Random(seed)).tiles.filter(t=>t==='fire').length;
  }
  assert.ok(initialFire>neutralFire*1.25,`${initialFire} vs ${neutralFire}`);
  const board=createBoard(new Random(20),7,7,weights),random=new Random('refill');
  const counts=Object.fromEntries(TYPES.map(type=>[type,0]));
  for(let sample=0;sample<200;sample++){
    const filled=fillBoard({...board,tiles:Array(49).fill(null)},random);
    filled.tiles.forEach(type=>counts[type]++);
  }
  assert.ok(counts.fire>3000&&counts.fire<3500,JSON.stringify(counts));
  for(const type of TYPES.filter(t=>t!=='fire'))assert.ok(counts[type]>1400&&counts[type]<1900,JSON.stringify(counts));
});

test('G03: every repair and cascade retains the weighted profile and playable geometry',()=>{
  const weights={...base,fire:200,heal:200};
  for(let seed=0;seed<12;seed++){
    const random=new Random(seed);let board=createBoard(random,7,7,weights);
    for(const index of [9,17,25])board=strikeBoard(board,index,random);
    board=ageCraters(board,random);board=ageCraters(board,random);
    board=cleanCell(strikeBoard(board,24,random),24,random);
    board=disableCorners(board,random);
    board=ensurePlayable(applyHazard(board,'locks',[10,20,30]),random);
    const before=structuredClone(board),rng=random.state;
    assert.equal(swapBoard(board,-1,4,random).valid,false);assert.equal(random.state,rng);
    assert.deepEqual(board,before);
    const [a,b]=legalMoves(board)[0];board=swapBoard(board,a,b,random).board;
    assert.deepEqual(board.glyphWeights,weights);stable(board);
  }
});

test('G03: local crater and glove repairs draw by weight among permitted glyphs',()=>{
  const weights={...base,fire:200};
  const board=createBoard(new Random('local-weight'),7,7,weights);
  const index=board.tiles.findIndex((_,i)=>TYPES.every(type=>{
    const candidate=structuredClone(board);candidate.tiles[i]=type;
    return findMatches(candidate).length===0;
  }));
  assert.ok(index>=0);
  const damaged=structuredClone(board);damaged.tiles[index]=null;damaged.craters[index]=1;
  // The 18th percentile selects Fire with weight 200, but Blade with equal weights.
  for(const restore of [b=>ageCraters(b,{next:()=>.18}),b=>cleanCell(b,index,{next:()=>.18})]){
    const repaired=restore(damaged);
    assert.equal(repaired.tiles[index],'fire');stable(repaired);
    for(let i=0;i<49;i++)if(i!==index)assert.equal(repaired.tiles[i],board.tiles[i]);
  }
});
