/** Convert one directional gesture to one neighbor; reject ambiguous diagonals. */
export function swipeTarget(board, start, dx, dy, cellSize) {
  const x = Math.abs(dx);
  const y = Math.abs(dy);
  if (Math.max(x, y) < cellSize * 0.35 || Math.max(x, y) < Math.min(x, y) * 1.35) return null;
  const col = start % board.width + (x > y ? Math.sign(dx) : 0);
  const row = Math.floor(start / board.width) + (y > x ? Math.sign(dy) : 0);
  if (col < 0 || col >= board.width || row < 0 || row >= board.height) return null;
  const target = row * board.width + col;
  return board.craters[start] || board.craters[target] || board.blocked?.[start] || board.blocked?.[target] || board.locks?.[start] || board.locks?.[target] ? null : target;
}

/** Shared mouse/touch/keyboard selection; combat owns actual swap validation. */
export function chooseCell(board, selected, index) {
  if (index < 0 || index >= board.width * board.height || board.craters[index] || board.blocked?.[index] || board.locks?.[index]) return { selected, swap: null };
  if (selected === index) return { selected: null, swap: null };
  if (selected !== null) {
    const distance = Math.abs(selected % board.width - index % board.width) + Math.abs(Math.floor(selected / board.width) - Math.floor(index / board.width));
    if (distance === 1) return { selected: null, swap: [selected, index] };
  }
  return { selected: index, swap: null };
}
