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
 * Most Bliss symbols are created by combining other Bliss symbols into new
 * ones. The composition of many Bliss symbols is documented; one such document
 * is the BCI-AV Composition Analysis spreadsheet:
 * https://docs.google.com/spreadsheets/d/1zdTAeoY5gTNoUs8hvPuHC3-obInmoiUFKh2ttp97HKw/
 *
 * This script is to used to find the composition details given in a TSV file
 * and merge it with the main Bliss symbol JSON file.  The script assumes the
 * following files are in the `data` directory:
 * - `./data/bliss_symbol_explanations.json`
 *  - This is the main Bliss symbol JSON file containing information such as the
 *    BCI AV ID, a dsecription of the symbol (the gloss), etc.
 * - `./data/BciAvCompositionAnalysis.tsv`
 *   - This is a TSV file derived from the BCI-AV Composition Analysis
 *     spreadsheet.
 *
 * The script loads and modifies the main Bliss information file:
 * - `./data/bliss_symbol_explanations.json`
 *  - The character and composition information found in
 *    `./data/BciAvCompositionAnalysis.tsv` is merged into this main Bliss file.
 *
 * Usage: node scripts/tsvFindCompositions.js
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

// The TSV input file containing the composistion and Bliss-character status
// information.
const COMPOSTION_ANALYSIS_TSV = "./data/BciAvCompositionAnalysis.tsv";

// The main Bliss information json file.  The composistion and Bliss-character
// status is merged into it.
const MAIN_BLISS_JSON = "./data/bliss_symbol_explanations.json";

/**
 * Load the tsv file and associate each BCI AV ID found within it with an
 * array of symbol IDs that it is composed out of. Also store whether the
 * symbol is a Bliss-character and its gloss.
 * @param {String} - The path to a TSV file to consult
 * @return {Array} - an array of objects with this structure:
 *                 { id, gloss, isCharacter, composingIds }
 */
async function findCompositions (tsvFileInput) {
  const tsvFile = await open(tsvFileInput);
  const compositions = [];
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
    const aComposition = {};
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
      if (aComposition.composingIds) {
        blissRecord.composingIds = aComposition.composingIds;
      }
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
  const compositions = await findCompositions(COMPOSTION_ANALYSIS_TSV);
  mergeAndSave(compositions, blissSymbols, MAIN_BLISS_JSON);
  console.log("Done!");
}

main();
