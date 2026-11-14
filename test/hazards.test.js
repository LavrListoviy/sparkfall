import test from 'node:test';
import assert from 'node:assert/strict';
import { Random } from '../public/core/random.js';
import { createBoard, legalMoves, swapBoard, applyHazard, disableCorners, ageCraters, strikeBoard, cleanCell, findMatches } from '../public/core/board.js';

test('E02: a locked tile cannot be exchanged but clears when matched indirectly', () => {
  const random = new Random('locks');
  const board = createBoard(random);
  const [a,b] = legalMoves(board)[0];
  const locked = applyHazard(board, 'locks', [a]);
  assert.equal(swapBoard(locked,a,b,random).valid,false);
  const result = swapBoard(board,a,b,random);
  const third = result.waves[0].groups.flatMap(g=>g.indices).find(i=>i!==a&&i!==b);
  const indirect = applyHazard(board,'locks',[third]);
  const cleared = swapBoard(indirect,a,b,new Random(board.tiles.length));
  assert.equal(cleared.valid,true);
  assert.equal(cleared.board.locks[third],false);
});

test('E02: hazard limits and cell attachment survive unrelated changes', () => {
  const board = createBoard(new Random('limits'));
  const marked = applyHazard(board,'unstable',[1,2,3,4]);
  assert.equal(marked.unstable.filter(Boolean).length,3);
  assert.equal(marked.unstable[1],true);
  assert.equal(marked.tiles[1],board.tiles[1]);
  assert.equal(board.unstable?.some(Boolean)??false,false);
});

test('E03: disabled corners remain disabled after crater aging and cleanup', () => {
  const random = new Random('boss');
  let board = disableCorners(createBoard(random),random);
  for(const i of [0,6,42,48]){assert.equal(board.blocked[i],true);assert.equal(board.tiles[i],null);}
  board = strikeBoard(board,10,random);
  board = ageCraters(ageCraters(board,random),random);
  board = cleanCell(board,0,random);
  assert.equal(board.blocked[0],true);
  assert.equal(board.tiles[0],null);
  assert.ok(legalMoves(board).length>0);
  assert.equal(findMatches(board).length,0);
  assert.equal(swapBoard(board,0,1,random).valid,false);
});

test('A01: cleaning a temporary hazard preserves permanent geometry and other cells', () => {
  const random = new Random('clean');
  let board = createBoard(random);
  board = applyHazard(board,'locks',[12]);
  board = applyHazard(board,'unstable',[12,13]);
  const cleaned = cleanCell(board,12,random);
  assert.equal(cleaned.locks[12],false);
  assert.equal(cleaned.unstable[12],false);
  assert.equal(cleaned.unstable[13],true);
});
