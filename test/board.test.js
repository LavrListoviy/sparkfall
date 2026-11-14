import test from 'node:test';
import assert from 'node:assert/strict';
import { Random } from '../public/core/random.js';
import { TYPES, findMatches, legalMoves, createBoard, swapBoard, fillBoard, ensurePlayable, ageCraters, strikeBoard } from '../public/core/board.js';

const symbols = { S: 'steel', F: 'fire', I: 'ice', P: 'poison', H: 'heal', '.': null };
function fixture(rows) {
  return { width: rows[0].length, height: rows.length, tiles: rows.join('').split('').map(s => symbols[s]), craters: Array(rows.join('').length).fill(0) };
}

test('B01: seeded randomness repeats and resumes from its saved state', () => {
  const a = new Random('test-run');
  const b = new Random('test-run');
  const values = Array.from({ length: 20 }, () => a.next());
  assert.deepEqual(values, Array.from({ length: 20 }, () => b.next()));
  assert.ok(new Set(values).size > 15);
  assert.ok(values.every(v => v >= 0 && v < 1));
  const resumed = new Random(a.state);
  assert.equal(a.next(), resumed.next());
});

test('B01: intersecting lines count each matched tile once', () => {
  const board = fixture(['SHIPH', 'IFFFH', 'PSFIP', 'HIFSH', 'SFHIP']);
  assert.deepEqual(findMatches(board), [{ type: 'fire', indices: [6, 7, 8, 12, 17] }]);
});

test('B01: separate groups remain separate and blocked cells interrupt lines', () => {
  const board = fixture(['FFFIP', 'IPSFH', 'HHHPI']);
  assert.deepEqual(findMatches(board).map(g => g.indices), [[0, 1, 2], [10, 11, 12]]);
  board.craters[1] = 2;
  board.tiles[1] = null;
  assert.deepEqual(findMatches(board).map(g => g.indices), [[10, 11, 12]]);
});

test('B01: generated boards have no automatic matches and at least one move across 80 seeds', () => {
  for (let seed = 0; seed < 80; seed++) {
    const board = createBoard(new Random(seed));
    assert.equal(board.tiles.length, 49);
    assert.ok(board.tiles.every(t => TYPES.includes(t)));
    assert.equal(findMatches(board).length, 0);
    assert.ok(legalMoves(board).length > 0, `No moves for seed ${seed}`);
  }
});

test('B01: invalid swaps leave the board and RNG unchanged', () => {
  const random = new Random('invalid');
  const board = fixture(['SFIPH', 'IPH SF'.replace(' ', ''), 'HSFIP', 'FIPHS', 'PHSFI']);
  const before = structuredClone(board);
  const snapshot = random.state;
  for (const [a, b] of [[0, 6], [4, 5], [-1, 0], [0, 30], [0, 1]]) {
    assert.equal(swapBoard(board, a, b, random).valid, false);
    assert.deepEqual(board, before);
    assert.equal(random.state, snapshot);
  }
});

test('B01: a legal swap resolves cascades without mutating its input', () => {
  const random = new Random('cascade');
  const board = createBoard(random);
  const before = structuredClone(board);
  const [a, b] = legalMoves(board)[0];
  const result = swapBoard(board, a, b, random);
  assert.equal(result.valid, true);
  assert.ok(result.waves.length >= 1);
  assert.ok(result.waves.every(w => w.groups.every(g => g.indices.length >= 3)));
  assert.equal(findMatches(result.board).length, 0);
  assert.ok(legalMoves(result.board).length > 0);
  assert.deepEqual(board, before);
});

test('B01/B05: gravity treats a crater as a boundary', () => {
  const board = fixture(['S', '.', '.', 'F', '.']);
  board.craters[2] = 2;
  const filled = fillBoard(board, new Random('gravity'));
  assert.equal(filled.tiles[1], 'steel');
  assert.equal(filled.tiles[2], null);
  assert.equal(filled.tiles[4], 'fire');
  assert.notEqual(filled.tiles[0], null);
  assert.notEqual(filled.tiles[3], null);
});

test('B01: a dead board is reshuffled into a stable playable board', () => {
  const board = fixture(['SFIPH', 'IPHSF', 'HSFIP', 'FIPHS', 'PHSFI']);
  assert.equal(legalMoves(board).length, 0);
  const repaired = ensurePlayable(board, new Random('repair'));
  assert.ok(legalMoves(repaired).length > 0);
  assert.equal(findMatches(repaired).length, 0);
});

test('B05: a new crater survives two future round boundaries and then restores the tile', () => {
  const random = new Random('meteor');
  let board = createBoard(random);
  board = strikeBoard(board, 10, random);
  assert.equal(board.craters[10], 2);
  assert.equal(board.tiles[10], null);
  board = ageCraters(board, random);
  assert.equal(board.craters[10], 1);
  board = ageCraters(board, random);
  assert.equal(board.craters[10], 0);
  assert.ok(TYPES.includes(board.tiles[10]));
  assert.ok(legalMoves(board).length > 0);
  assert.equal(findMatches(board).length, 0);
});

test('B05: impacts respect the crater limit and refresh an existing crater', () => {
  const random = new Random('limit');
  let board = createBoard(random);
  for (const index of [1, 12, 24, 30]) board = strikeBoard(board, index, random);
  assert.ok(board.craters.filter(Boolean).length <= 3);
  const existing = board.craters.findIndex(Boolean);
  board.craters[existing] = 1;
  board = strikeBoard(board, existing, random);
  assert.equal(board.craters[existing], 2);
});

test('B05: crater expiration preserves unaffected tiles when local repair is possible', () => {
  const random = new Random('local-repair');
  let board = createBoard(random);
  board = strikeBoard(board, 10, random);
  board = ageCraters(board, random);
  const restored = ageCraters(board, random);
  for (let i = 0; i < board.tiles.length; i++) if (i !== 10) assert.equal(restored.tiles[i], board.tiles[i], `Unaffected tile ${i} moved`);
  assert.ok(TYPES.includes(restored.tiles[10]));
  assert.equal(findMatches(restored).length, 0);
});
