/*
 * Copyright The Adaptive Palette copyright holders
 * See the AUTHORS.md file at the top-level directory of this distribution and at
 * https://github.com/inclusive-design/adaptive-palette/raw/main/AUTHORS.md.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */
import { adaptivePaletteGlobals } from "./GlobalData";
import { MatchType } from "./index.d";

/**
 * Finds symbols for a given label/gloss. The data structure searched is the
 * global symbol structure in `adaptivePaletteGlobals.symbols`.
 *
 * The label is compared to each of the glosses where a match is defined as
 * either an exact match, or a "word" match using the regular expression
 * /\bword\b/, where "word" is the same as the given label and "\b" is white
 * space on either side of the "word".
 *
 * Note: this was based on a similar function used in
 * `./apps/palette-generator/paletteJsonGenerator.ts`
 *
 * @param {string} label - The label to use to search for matches in the gloss.
 * @returns {Array} An array of objects whose gloss matches the given label:
 *                  { id, label, composition }, or an empty
 *                  array if no symbol is found for the label.
 */
export function findSymbolByGloss(label: string): MatchType[] {
  const matches: MatchType[] = [];
  // Search only if there is text to base the search on.
  if (label.trim().length !== 0) {
    // Search for the label in the Bliss gloss
    const wordMatch = new RegExp("\\b" + `${label}` + "\\b");
    for (const oneSymbolEntry of adaptivePaletteGlobals.symbols) {
      // Try an exact match or a word match
      if ((label === oneSymbolEntry.gloss) || wordMatch.test(oneSymbolEntry.gloss)) {
        matches.push({
          id: oneSymbolEntry.id,
          bciAvId: oneSymbolEntry.bciAvId,
          label: oneSymbolEntry.gloss,
          composition: oneSymbolEntry.composition
        });
      }
    }
  }
  return matches;
}
