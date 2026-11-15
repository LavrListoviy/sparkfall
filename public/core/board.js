export const TYPES = ['steel', 'fire', 'ice', 'poison', 'heal'];
const copy = board => ({ ...board, tiles: [...board.tiles], craters: [...board.craters], blocked: [...(board.blocked ?? Array(board.tiles.length).fill(false))], locks: [...(board.locks ?? Array(board.tiles.length).fill(false))], unstable: [...(board.unstable ?? Array(board.tiles.length).fill(false))] });
const active = (board, index) => index >= 0 && index < board.tiles.length && !board.craters[index] && !board.blocked?.[index];

/** Draw once among allowed types; unweighted legacy boards retain their exact RNG path. */
function drawGlyph(board,random,options=TYPES) {
  if (!board.glyphWeights) return options[random.int(options.length)];
  const total=options.reduce((sum,type)=>sum+board.glyphWeights[type],0);
  let roll=random.next()*total;
  for (const type of options) {
    roll-=board.glyphWeights[type];
    if (roll<0) return type;
  }
  return options.at(-1);
}

/** Place cell-bound elite hazards, respecting the per-kind limit. */
export function applyHazard(board, kind, indices) {
  const result = copy(board);
  if (!['locks', 'unstable'].includes(kind)) return result;
  for (const index of indices) {
    if (result[kind].filter(Boolean).length >= 3) break;
    if (active(result,index)) result[kind][index] = true;
  }
  return result;
}

/** Permanently remove boss corners; no tile effect is triggered by the transformation. */
export function disableCorners(board, random) {
  const result = copy(board);
  for (const index of [0,board.width-1,board.tiles.length-board.width,board.tiles.length-1]) {
    result.blocked[index] = true;
    result.craters[index] = 0;
    result.locks[index] = result.unstable[index] = false;
    result.tiles[index] = null;
  }
  return ensurePlayable(result,random);
}

/** Remove temporary damage only; permanent boss geometry is immutable. */
export function cleanCell(board,index,random) {
  const result = copy(board);
  if (result.blocked[index]) return result;
  result.craters[index] = 0;
  result.locks[index] = result.unstable[index] = false;
  return restoreHoles(result,random);
}

/** Merge touching matched cells of the same type; intersections count only once. */
export function findMatches(board) {
  const marked = new Set();
  const scan = indices => {
    let start = 0;
    while (start < indices.length) {
      const index = indices[start];
      const type = active(board, index) ? board.tiles[index] : null;
      let end = start + 1;
      while (type && end < indices.length && active(board, indices[end]) && board.tiles[indices[end]] === type) end++;
      if (type && end - start >= 3) for (let p = start; p < end; p++) marked.add(indices[p]);
      start = end;
    }
  };
  for (let row = 0; row < board.height; row++) scan(Array.from({ length: board.width }, (_, col) => row * board.width + col));
  for (let col = 0; col < board.width; col++) scan(Array.from({ length: board.height }, (_, row) => row * board.width + col));
  const groups = [];
  for (const index of [...marked].sort((a, b) => a - b)) {
    if (!marked.has(index)) continue;
    const type = board.tiles[index];
    const stack = [index];
    const indices = [];
    marked.delete(index);
    while (stack.length) {
      const current = stack.pop();
      indices.push(current);
      const neighbors = [current - board.width, current + board.width];
      if (current % board.width > 0) neighbors.push(current - 1);
      if (current % board.width < board.width - 1) neighbors.push(current + 1);
      for (const next of neighbors) {
        if (marked.has(next) && board.tiles[next] === type) { marked.delete(next); stack.push(next); }
      }
    }
    groups.push({ type, indices: indices.sort((a, b) => a - b) });
  }
  return groups;
}

/** Only adjacent active cells can be exchanged; crossing a row boundary is invalid. */
function exchanged(board, a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b) || !active(board, a) || !active(board, b)) return null;
  if (board.locks?.[a] || board.locks?.[b]) return null;
  const distance = Math.abs(a % board.width - b % board.width) + Math.abs(Math.floor(a / board.width) - Math.floor(b / board.width));
  if (distance !== 1) return null;
  const result = copy(board);
  [result.tiles[a], result.tiles[b]] = [result.tiles[b], result.tiles[a]];
  return result;
}

/** Enumerate valid moves without consuming randomness or modifying the board. */
export function legalMoves(board) {
  const moves = [];
  for (let a = 0; a < board.tiles.length; a++) {
    for (const b of [a + 1, a + board.width]) {
      const swapped = exchanged(board, a, b);
      if (swapped && findMatches(swapped).some(g => g.indices.includes(a) || g.indices.includes(b))) moves.push([a, b]);
    }
  }
  return moves;
}

/** Construct a stable, playable board using the supplied deterministic source. */
export function createBoard(random, width = 7, height = 7, glyphWeights) {
  const board = { width, height, tiles: Array(width * height).fill(null), craters: Array(width * height).fill(0), ...(glyphWeights?{glyphWeights:{...glyphWeights}}:{}) };
  return ensurePlayable(board, random);
}

/** Compact each vertical segment independently; craters never pass falling tiles. */
export function fillBoard(board, random) {
  const result = copy(board);
  for (let col = 0; col < board.width; col++) {
    let bottom = board.height - 1;
    while (bottom >= 0) {
      if (!active(result,bottom * board.width + col)) { result.tiles[bottom * board.width + col] = null; bottom--; continue; }
      let top = bottom;
      while (top > 0 && active(result,(top - 1) * board.width + col)) top--;
      const values = [];
      for (let row = bottom; row >= top; row--) {
        const tile = result.tiles[row * board.width + col];
        if (tile) values.push(tile);
      }
      for (let row = bottom; row >= top; row--) result.tiles[row * board.width + col] = values[bottom - row] ?? drawGlyph(result,random);
      bottom = top - 1;
    }
  }
  return result;
}

/** Rebuild only when necessary. Technical refills have no combat side effects. */
export function ensurePlayable(board, random) {
  let result = copy(board);
  const ready = value => value.tiles.every((tile, i) => !active(value,i) ? tile === null : TYPES.includes(tile)) && findMatches(value).length === 0 && legalMoves(value).length > 0;
  if (ready(result)) return result;
  for (let repairs = 0; repairs <= board.tiles.length; repairs++) {
    for (let attempt = 0; attempt < 80; attempt++) {
      result.tiles.fill(null);
      for (let i = 0; i < result.tiles.length; i++) {
        if (!active(result,i)) continue;
        const col = i % result.width;
        const row = Math.floor(i / result.width);
        const options = TYPES.filter(type => !(col >= 2 && result.tiles[i - 1] === type && result.tiles[i - 2] === type) && !(row >= 2 && result.tiles[i - result.width] === type && result.tiles[i - result.width * 2] === type));
        result.tiles[i] = drawGlyph(result,random,options);
      }
      if (ready(result)) return result;
    }
    const oldest = result.craters.reduce((best, age, i) => age && (best < 0 || age < result.craters[best]) ? i : best, -1);
    if (oldest >= 0) result.craters[oldest] = 0;
    else {
      const lock = result.locks.findIndex(Boolean);
      if (lock < 0) throw new Error('Board geometry cannot support a legal move');
      result.locks[lock] = false;
    }
  }
  throw new Error('Board repair limit exceeded');
}

/** Resolve every cascade as one player action, retaining presentation snapshots. */
export function swapBoard(board, a, b, random) {
  let result = exchanged(board, a, b);
  if (!result || !findMatches(result).some(g => g.indices.includes(a) || g.indices.includes(b))) return { valid: false, board, waves: [] };
  const waves = [];
  for (let count = 0; count < 64; count++) {
    const groups = findMatches(result);
    if (!groups.length) break;
    const before = copy(result);
    for (const group of groups) for (const index of group.indices) {
      result.tiles[index] = null;
      result.locks[index] = result.unstable[index] = false;
    }
    result = fillBoard(result, random);
    waves.push({ groups, before, after: copy(result) });
  }
  result = ensurePlayable(result, random);
  return { valid: true, board: result, waves };
}

/** Age existing craters before the next impact; new craters keep their full lifetime. */
export function ageCraters(board, random) {
  const result = copy(board);
  result.craters = result.craters.map(age => Math.max(0, age - 1));
  return restoreHoles(result,random);
}

/** Restore missing active cells locally before considering a full reshuffle. */
function restoreHoles(result,random) {
  for (let i = 0; i < result.tiles.length; i++) {
    if (!active(result,i) || result.tiles[i]) continue;
    const options = TYPES.filter(type => {
      result.tiles[i] = type;
      return findMatches(result).length === 0;
    });
    result.tiles[i] = drawGlyph(result,random,options.length?options:TYPES);
  }
  return ensurePlayable(result, random);
}

/** Apply one impact, refreshing the oldest crater if the three-crater limit is reached. */
export function strikeBoard(board, index, random) {
  const result = copy(board);
  if (result.blocked[index]) return result;
  const existing = result.craters.flatMap((age, i) => age ? [i] : []);
  let target = index;
  if (!result.craters[index] && existing.length >= 3) target = existing.reduce((a, b) => result.craters[a] <= result.craters[b] ? a : b);
  result.craters[target] = 2;
  result.locks[target] = result.unstable[target] = false;
  result.tiles[target] = null;
  return ensurePlayable(result, random);
}
