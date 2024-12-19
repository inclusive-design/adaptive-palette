/*
 * Copyright 2024 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

/**
 * Use the Blissary BCI-AV-ID map to generate BciAvTypes that encode the
 * composition of Bliss-words and attach it to the
 * bliss_symbol_explanations.json file
 */

import { makeBlissComposition } from "../../src/client/SvgUtils.ts";
import { initAdaptivePaletteGlobals } from "../../src/client/GlobalData.ts";

let blissSymbols;
export async function fetchBlissSymbolsJson () {
  // Read and parse the Bliss gloss JSON file
  try {
    const fetchResponse = await fetch("http://localhost:5173/data/bliss_symbol_explanations.json");
    blissSymbols = await fetchResponse.json();
  } catch (error) {
    console.error(`Error fetching 'bliss_symbol_explanations.json': ${error.message}`);
  }
  return blissSymbols;
}

/*
 * Loop through the Bliss symbol entries in `bliss_symbol_explanations.json`:
 * - create a composition array based on information in the Blissary,
 * - add the composition array to the entry, `composition` field,
 * - remove any current `composingIds` from the entry,
 * - make a list of entries that have no composition,
 * - make a list of entries whose composition is just their symbol -- do not
 *   add a `composition` field in this case.
 * @return {Object} - An object containing the modified
 *                   `bliss_symbol_explanations` data, counts of the number
 *                    of symbols processed , the number of symbols in the
 *                    original input, the number of symbols with no defined
 *                    composition and a list of those symbols, and a count of
 *                    the number of symbols whose composition is identical to
 *                    their BCI AV ID, and a list of those symbols.
 */
export async function findAndRecordCompositions () {
  await initAdaptivePaletteGlobals();
  let count = 0;
  const noComposition = { count: 0, message: "" };
  const undef = { count: 0, message: "" };
  blissSymbols.forEach( (aSymbol) => {
    console.log(aSymbol.id);
    const numericalId = parseInt(aSymbol.id);
    const composition = makeBlissComposition(numericalId);
    if (composition) {
      if (composition.bciComposition.length === 1 && composition.bciComposition[0] === numericalId) {
        console.log(`Ignoring ${aSymbol.description} (${aSymbol.id})`); // do nothing.
        noComposition.message += `<br>Ignoring ${aSymbol.description} (${aSymbol.id})`;
        noComposition.count++;
      }
      else {
        aSymbol.composition = composition.bciComposition;
      }
    }
    else {
      console.log(`No composition defined for BCI AV ID ${aSymbol.description} (${aSymbol.id})`);
      undef.count++;
      undef.message += `<br>No composition defined for BCI AV ID ${aSymbol.description} (${aSymbol.id})`;
    }
    delete aSymbol.composingIds;  // Does not throw when there is no such field.
    count++;
  });
  console.log(`Final count: ${count}, actual length: ${blissSymbols.length}, ignored ${noComposition.count}, number of undefined: ${undef.count}`);
  return {
    newBlissSymbols: blissSymbols,
    counts: `Final count: ${count}, actual length: ${blissSymbols.length}, ignored ${noComposition.count}, number of undefined: ${undef.count}`,
    noComposition: noComposition,
    undef: undef
  };
};
