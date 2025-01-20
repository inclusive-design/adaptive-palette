/*
 * Copyright 2024, 2025 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

/**
 * This one-time script uses the Blissary BCI-AV-ID map to generate BciAvTypes
 * that encode the composition of Bliss-words.  The composition information is
 * then attached to each entry in the `bliss_symbol_explanations.json` file.
 * The latter file is overwritten with the new information.
 *
 * Running the script makes use of `vite-node` with `npx`.  That allows this
 * TypeScript script to run using node js, and to properly link with other
 * TypeScript files.  The first time that `npx vite-node ...` is used,
 * users are asked if they want to install `vite-node`, which is installed in
 * the `npm` global directory, e.g. `~/.npm/...` on macOS. See:
 * https://www.npmjs.com/package/vite-node
 *
 * The script will re-write `./public/data/bliss_symbol_explanations.json` as
 * well as log two items on the console:
 * 1. The Bliss symbols whose composition is identical to their BCI-AV-ID. There
 *    are slighlty more than 1000.  They are loggged as "Ignored" and the entry
 *    in the json file has no `composition` field.
 * 2. The Bliss symbols that have no defined composition.  There are three.
 * This information can be redirected to a file of the user's choosing.
 *
 * Usage: npx vite-node scripts/createAndRecordCompositions.ts [> logFile]
 */

import { makeBlissComposition } from "../src/client/SvgUtils.ts";
import { initAdaptivePaletteGlobals } from "../src/client/GlobalData.ts";
import blissSymbols from "../public/data/bliss_symbol_explanations.json";

import { writeFileSync } from "fs";
import { join } from "path";

const OUTPUT_FILE = "../public/data/bliss_symbol_explanations.json";

/*
 * Loop through the Bliss symbol entries in `bliss_symbol_explanations.json`:
 * - create a composition array based on information in the Blissary,
 * - add the composition array to the entry's `composition` field,
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
  const noComposition = [];
  const undef = [];
  blissSymbols.forEach( (aSymbol) => {
    const numericalId = parseInt(aSymbol.id);
    const composition = makeBlissComposition(numericalId);
    if (composition) {
      if (composition.bciComposition.length === 1 && composition.bciComposition[0] === numericalId) {
        noComposition.push(`Ignoring ${aSymbol.description} (${aSymbol.id})`);
      }
      else {
        aSymbol.composition = composition.bciComposition;
      }
    }
    else {
      undef.push(`No composition defined for ${aSymbol.description} (${aSymbol.id})`);
    }
    delete aSymbol.composingIds;  // Does not throw when there is no such field.
    count++;
  });
  return {
    newBlissSymbols: blissSymbols,
    counts: `Final count: ${count}, actual length: ${blissSymbols.length}, ignored ${noComposition.length}, number of undefined: ${undef.length}`,
    noComposition: noComposition,
    undef: undef
  };
};

async function main (): void {
  const newInfo = await findAndRecordCompositions();
  console.log("");
  console.log(`${newInfo.counts}`);
  console.log("Ignoring the following symbols whose composition is just their BCI AV ID:");
  newInfo.noComposition.forEach( (ignored) => console.log(ignored) );
  console.log("");
  console.log("These symbols have no defined composition:");
  newInfo.undef.forEach( (undef) => console.log(undef) );

  // Save the file.
  writeFileSync(
    join(__dirname, OUTPUT_FILE), JSON.stringify(newInfo.newBlissSymbols, null, 2)
  );
  console.log("done");
}
main();
