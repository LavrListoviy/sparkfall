import { TYPES } from './board.js';
import { ARTIFACTS, LOADOUTS, GLYPH_RULES } from './content.js';

/** Resolve the bounded generation profile without consuming randomness. */
export function glyphWeights(loadout='coil',artifacts=[],catalog=ARTIFACTS) {
  return combineGlyphBonuses([LOADOUTS[loadout]?.glyphBonus,...[...new Set(artifacts)].map(id=>catalog[id]?.glyphBonus)]);
}

/** Combine independent additive sources into a generation profile. */
export function combineGlyphBonuses(sources=[]) {
  return Object.fromEntries(TYPES.map(type=>{
    const sum=sources.reduce((weight,source)=>weight+(source?.[type]??0),GLYPH_RULES.base);
    return [type,Math.max(GLYPH_RULES.base,Math.min(GLYPH_RULES.max,sum))];
  }));
}
