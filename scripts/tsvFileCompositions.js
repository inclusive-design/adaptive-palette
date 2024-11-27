/*
 * Copyright 2023-2024 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { open, writeFile } from "fs/promises";
import blissSymbols from "../data/bliss_symbol_explanations.json" assert {type: "json"};

// The columns of each line in the tsv data are:
// BCI-AV-ID, Symbol graphic, gloss, Bliss-character?, Up to 7 composing symbols
// The following are column indices.  Note that the index for the graphic is
// skipped.
const BCI_ID = 0;
const GLOSS = 2;
const IS_CHARACTER = 3;
const COMPOSE_START = 4;

/**
 * Main entry point that loads the tsv file, and associates each BCI AV with an
 * array of symbol IDs that it is composed out of.  It also stores whether the
 * symbol is a Bliss-character and its gloss.
 * @return {Array} an array of objects with this structure:
 *                 { id, gloss, isCharacter, composition }
 */
async function findCompositions () {
  const tsvFile = await open("./data/BciAvCompositionAnalysis.tsv");
  const compositions = []
  let firstLine = true;
  for await (const aLine of tsvFile.readLines()) {
    // Ignore the first line -- the column names.
    if (firstLine) {
      firstLine = false;
      continue;
    }
    // It's tempting to filter out all cells with empty strings here, but that
    // would remove some Bliss-character declarations.  That declaration is
    // either "Y" or "".  The latter empty string is significant.
    const cells = aLine.split("\t");
    const aComposition = {}
    aComposition.id = parseInt(cells[BCI_ID]);
    aComposition.gloss = cells[GLOSS];
    aComposition.isCharacter = ( cells[IS_CHARACTER] === "Y" ? true : false );

    // If there are composing IDs listed, change them to an array of integers.
    // Remove any cells with empty strings first though -- they are meaningless
    // in this case.
    const composingIds = cells.slice(COMPOSE_START).filter((item) => item.length > 0);
    composingIds.forEach( (anId, index, theArray ) => {
      theArray[index] = parseInt(anId);
    });
    if (composingIds.length > 0 && !checkCompRepeats(aComposition.id, composingIds)) {
      aComposition.composingIds = composingIds;
    }
    console.log(JSON.stringify(aComposition));
    compositions.push(aComposition);
  }
  return compositions;
};

/**
 * Check the composition array for the given symbol.  If the composition is only
 * a repetition of the symbol itself, ignore it.
 * @param {Integer} symbolID - BCI AV ID of the symbol in question
 * @param {Array} compositionIDs - Set of BCI AV IDs that the `symbolID` symbol
 *                                 is composed out of.
 * @return {Boolean} - `true` if the `compositionIDs` have one member whose
 *                      value is the same as the `symbolID`; otherwise, false.
 */
function checkCompRepeats (symbolID, compositionIDs) {
  let result = false;
  if (compositionIDs && compositionIDs.length === 1) {
    if (compositionIDs[0] === symbolID) {
      result = true;
    }
  }
  return result;
}

/**
 * Merge the composition information into the main Bliss symbol json file
 * and save to a new file
 * @param {Array} compositions - Array of objects whose `character` and
 *                              `composition` fields are to be copied into
 *                              the main Bliss symbols array of objects
 * @param {Array} mainBlissSymbols - The main array of Bliss symbols information
 * @param {String} filePath    - The path to the file to store the merged JSON
 *                               data to.
 */
function mergeAndSave(compositions, mainBlissSymbols, filePath) {
  // Merge
  compositions.forEach((aComposition) => {
    const blissRecord = mainBlissSymbols.find((symbol) => parseInt(symbol.id) === aComposition.id);
    if (!blissRecord) {
      console.error(`Not found: ${aComposition.id}:${aComposition.gloss}`);
    }
    else {
      blissRecord.isCharacter = aComposition.isCharacter;
      console.log(`${aComposition.id}: ${aComposition.gloss}, ${aComposition.composingIds}`);
      if (aComposition.composingIds) {
        blissRecord.composingIds = aComposition.composingIds;
      }
      console.log(`${blissRecord.id}: ${blissRecord.isCharacter}, ${blissRecord.composingIds}`);
    }
  });
  // Save to disk
  saveJsonToFile(filePath, mainBlissSymbols);
}

/**
 * Store the json data to the given file
 * @param {String} filePath - Path to the file to store the fiven json
 *                            information
 * @param {Array} jsonData - The JSON data to write to a disk file
 */
async function saveJsonToFile (filePath, jsonData) {
  try {
    await writeFile(filePath, JSON.stringify(jsonData, null, 2));
  }
  catch (err) {
    console.error("Failed to save to '`${filePath}`'");
    console.error(err);
  }
}

/**
 * Merge the composition data with the main `bliss_symbol_explanations.json`
 */
async function main () {
  const compositions = await findCompositions();
  await saveJsonToFile("./data/blissSymbolComposition.json", compositions);
  mergeAndSave(compositions, blissSymbols, "./data/blissSymbolsJson.json")
  console.log("Done!");
}

main();
