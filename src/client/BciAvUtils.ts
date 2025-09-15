/*
 * Copyright 2025 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */
import { adaptivePaletteGlobals } from "./GlobalData";
import { decomposeBciAvId } from "./SvgUtils";

/**
 * Finds the BCI AV ID(s) for a given label.  The date structure searched is the
 * global BCI AV ID structure in `adaptivePaletteGlobals.bliss_symbols`.
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
 *                  { bciAvId, label, composition, fullComposition}, or an empty
 *                  array if no BCI AV ID is found for the label.
 */
export function findBciAvId(label) {
  const matches = [];
  // Search only if there is text to base the search on.
  if (label.trim().length !== 0) {
    // Search for the label in the Bliss gloss
    for (const gloss of adaptivePaletteGlobals.bciAvSymbols) {
      // Try an exact match or a word match
      const wordMatch = new RegExp("\\b" + `${label}` + "\\b");
      if ((label === gloss.description) || wordMatch.test(gloss.description)) {
        // Get the composition of all the parts of the symbol's compostion or
        // its ID.  But if the `fullComposition` is the same as the original
        // ignore it.
        const glossId = parseInt(gloss.id);
        let fullComposition = undefined;
        let equalCompositions = false;
        if (gloss.composition) {
          fullComposition = decomposeBciAvId(gloss.composition);
          equalCompositions = fullComposition.join("") === gloss.composition.join("");
        }
        else {
          fullComposition = decomposeBciAvId(glossId);
          if (fullComposition && fullComposition.length === 1) {
            equalCompositions = fullComposition[0] === glossId;
          }
        }
        matches.push({
          bciAvId: glossId,
          label: gloss.description,
          composition: gloss.composition,
          fullComposition: ( equalCompositions ? undefined : fullComposition )
        });
        // DEBUGGING
        const lastMatch = matches[matches.length - 1];
        if (lastMatch.fullComposition) {
          console.debug(`${lastMatch.label} has a defined fullComposition: '${fullComposition.join("")}'`);
        }
      }
    }
  }
  return matches;
}

/**
 * Find symbols where the given single BCI AV ID is part of the composiiton
 * of other symbols.
 * @param {number} bciId - The BCI AV ID to search symbols' compositions
 *                                for matches.
 * @returns {Array} An array of objects whose `composition` contains the given
 *                  `bciId`:
 *                  { bciAvId, label, composition, fullComposition}, or an empty
 *                  array if no mathches are found.
 */
export function findCompositionsUsingId (bciId: number) {
  const matches = [];
  for (const symbol of adaptivePaletteGlobals.bciAvSymbols) {
    const symbolId = parseInt(symbol.id);
    // Add the symbol itself
    if (symbolId === bciId) {
      matches.push({
        bciAvId: symbolId,
        label: symbol.description,
        composition: symbol.composition,
        fullComposition: ( symbol.composition ? decomposeBciAvId(symbol.composition) : undefined )
      });
    }
    else if (symbol.composition) {
      const fullComposition = decomposeBciAvId(symbol.composition);
      if (fullComposition?.constructor === Array) {
        for (const member of fullComposition) {
          if (member === bciId) {
            matches.push({
              bciAvId: symbolId,
              label: symbol.description,
              composition: symbol.composition,
              fullComposition: fullComposition
            });
            // It's enough to find one occurrence of `bciId` in the
            // `fullComposition` to record this `symbol`.
            break;
          }
        }
      }
    }
  }
  return matches;
}
