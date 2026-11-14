const paths = {
  steel: '<path d="M30 3 22 7 10 23l5 5L31 12Z" fill="currentColor"/><path d="m11 23 9 9M15 28l-7 7-4-4 7-7" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="m17 23 10-13" stroke="#f5fbff" stroke-width="1.2"/>',
  fire: '<path d="M21 3c2 9-8 10-7 18-4-2-4-5-4-5-8 10-2 21 10 21 12 0 17-13 10-21-1 5-4 6-4 6 1-8-5-12-5-19Z" fill="currentColor"/><path d="M21 20c0 6-7 7-6 11 1 4 9 5 11 0 1-4-3-6-5-11Z" fill="#fff1b6"/>',
  ice: '<path d="m20 2 13 12-5 20-8 5-8-5-5-20Z" fill="currentColor" opacity=".75"/><path d="m20 2-4 14 4 23 5-23ZM7 14l9 2 4-14M33 14l-8 2-5-14M12 34l8 5 8-5" fill="none" stroke="#d7fcff" stroke-width="1.5"/><path d="m16 16 9 0-5 23Z" fill="#bceefa" opacity=".7"/>',
  poison: '<path d="M20 3S6 18 6 26a14 14 0 0 0 28 0C34 18 20 3 20 3Z" fill="currentColor"/><path d="M13 26c0-5 14-5 14 0v5l-3 1v3h-8v-3l-3-1Z" fill="#153b36"/><circle cx="16.5" cy="27" r="2" fill="#d7ef96"/><circle cx="23.5" cy="27" r="2" fill="#d7ef96"/><path d="m10 22 5-8" stroke="#e8ffd2" stroke-width="2" stroke-linecap="round"/>',
  heal: '<path d="M15 4h10v9l8 12c5 8-1 13-13 13S2 33 7 25l8-12Z" fill="currentColor" opacity=".8"/><path d="M12 3h16v5H12Z" fill="#d6b78b"/><path d="M10 25h20M20 23v10M15 28h10" stroke="#fff0e6" stroke-width="3"/><path d="m14 16-4 7" stroke="#ffe1db" stroke-width="2" stroke-linecap="round"/>',
  storm: '<path d="M9 25a8 8 0 1 1 1-16 11 11 0 0 1 21 4 6 6 0 0 1 0 12Z" fill="currentColor" opacity=".7"/><path d="m21 17-8 14h7l-2 9 11-16h-8l4-7Z" fill="currentColor"/>',
  compass: '<circle cx="20" cy="20" r="14" fill="none" stroke="currentColor"/><path d="m25 12-3 12-9 5 4-13Z" fill="currentColor"/><path d="M20 1v5M20 34v5M1 20h5M34 20h5" stroke="currentColor"/>',
  heart: '<path d="M20 35 5 20C-4 8 12 0 20 12 28 0 44 8 35 20Z" fill="currentColor"/>',
  spark: '<path d="m20 1 5 14 14 5-14 5-5 14-5-14-14-5 14-5Z" fill="currentColor"/>',
  sound: '<path d="m6 16 8 0 9-8v24l-9-8H6Z" fill="currentColor"/><path d="M28 13q9 7 0 14M32 7q15 13 0 26" fill="none" stroke="currentColor" stroke-width="2"/>',
  mute: '<path d="m6 16 8 0 9-8v24l-9-8H6Z" fill="currentColor"/><path d="m28 15 9 10m0-10-9 10" fill="none" stroke="currentColor" stroke-width="2"/>',
  arrow: '<path d="M6 20h27M24 10l10 10-10 10" stroke="currentColor" stroke-width="2" fill="none"/>',
  crater: '<ellipse cx="20" cy="24" rx="15" ry="9" fill="#070b10" stroke="#6e5969" stroke-width="2"/><path d="m6 19 7-6 5 3 8-5 7 9M13 27l6-6 10 3" stroke="#a86c64" fill="none"/>',
  eye: '<path d="M2 20S9 9 20 9s18 11 18 11-7 11-18 11S2 20 2 20Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="20" r="5" fill="currentColor"/>'
};
export const icon = (name, className = '') => `<svg class="icon ${className}" viewBox="0 0 40 40" aria-hidden="true">${paths[name] ?? paths.spark}</svg>`;
