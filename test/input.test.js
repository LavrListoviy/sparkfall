import test from 'node:test';
import assert from 'node:assert/strict';
import { swipeTarget, chooseCell } from '../public/core/input.js';

const board = { width: 7, height: 7, craters: Array(49).fill(0) };

test('V02: mouse drags and touch swipes select one adjacent cell', () => {
  assert.equal(swipeTarget(board, 24, 80, 5, 48), 25);
  assert.equal(swipeTarget(board, 24, -60, 1, 48), 23);
  assert.equal(swipeTarget(board, 24, 3, 50, 48), 31);
  assert.equal(swipeTarget(board, 24, 0, -50, 48), 17);
});

test('V02: short, diagonal and out-of-bounds gestures are rejected', () => {
  assert.equal(swipeTarget(board, 24, 5, 3, 48), null);
  assert.equal(swipeTarget(board, 24, 30, 30, 48), null);
  assert.equal(swipeTarget(board, 6, 50, 0, 48), null);
  assert.equal(swipeTarget(board, 0, 0, -50, 48), null);
});

test('V02: taps select, deselect, move selection or propose an adjacent swap', () => {
  assert.deepEqual(chooseCell(board, null, 24), { selected: 24, swap: null });
  assert.deepEqual(chooseCell(board, 24, 24), { selected: null, swap: null });
  assert.deepEqual(chooseCell(board, 24, 0), { selected: 0, swap: null });
  assert.deepEqual(chooseCell(board, 24, 25), { selected: null, swap: [24, 25] });
});

test('V02: craters cannot be selected or swiped into', () => {
  const damaged = structuredClone(board);
  damaged.craters[25] = 2;
  assert.equal(swipeTarget(damaged, 24, 50, 0, 48), null);
  assert.deepEqual(chooseCell(damaged, 24, 25), { selected: 24, swap: null });
});
