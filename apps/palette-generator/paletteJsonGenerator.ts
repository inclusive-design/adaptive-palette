/*
 * Copyright 2024-2025 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */
import { v4 as uuidv4 } from "uuid";
import { bstrToComposition } from "../../src/client/SvgUtils";
import { SymbolCompositionType, BlissSymbolEntry, JsonPaletteType } from "../../src/client/index.d";

const BLANK_CELL = "BLANK";
const SVG_PREFIX = "SVG:";
const SVG_SUFFIX = ":SVG";
const LABEL_MARKER = "LABEL:";

type MatchInfo = {
  id: number,
  bciAvId: number,
  label: string,
  composition?: SymbolCompositionType
};

type MatchByInfo = { [label: string]: MatchInfo[] };

type ProcessPaletteResult = {
  paletteJson: JsonPaletteType,
  matches: MatchByInfo[],
  errors: string[]
};

let bliss_gloss: BlissSymbolEntry[];
export async function fetchBlissGlossJson (): Promise<BlissSymbolEntry[]> {
  // Read and parse the Bliss gloss JSON file
  try {
    const fetchResponse = await fetch("../../public/data/bliss_symbol_explanations.json");
    bliss_gloss = await fetchResponse.json() as BlissSymbolEntry[];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching 'bliss_symbol_explanations.json': ${message}`);
  }
  return bliss_gloss;
}

/**
 * Test for the presencs of a string that encodes SVG builder information.  Such
 * strings begin with "SVG:" and ends with ":SVG"
 * @param {string} - the string to test.
 * @returns {boolean}
 */
function isSvgBuilderString (theString: string): boolean {
  return theString.startsWith(SVG_PREFIX) && theString.endsWith(SVG_SUFFIX);
}

/**
 * Converts a string that encodes the information required by the SvgUtils
 * (svg builder) to the proper format -- an array of bliss-svg specifications.
 * Three forms are accepted:
 * - Comma separated, e.g., 'SVG:13166,";",9011:SVG',
 * - BCI-AV-ID codes and separators: 'SVG:13166;9011:SVG'
 * - Blissary codes and separators: 'SVG:B220;B99:SVG
 * @param {string} svgBuilderString - The string to convert.
 * @return {Array} - An array of the specifiers required by the SvgUtils.
 * @throws {Error} - If the encoding is not well formed.
 */
function convertSvgBuilderString (theString: string): SymbolCompositionType {
  let result: SymbolCompositionType;
  // Three forms, one with commas and one without:
  // - commas:
  //   Replace the SVG prefix and suffix with "[" and "]", then parse the array.
  //   e.g., 'SVG:13166,";",9011:SVG' -> '[13166,";",9011]'
  // - no commas, using BCI AV IDs:
  //   Treat as an SVG composition string and use bstrToComposition() to convert
  //   it to the array form.
  //   e.g., 'SVG:13166;9011:SVG' -> '[13166,";",9011]'
  // - no commas, using Blissary IDs:
  //   Treat as an SVG composition string and use bstrToComposition() to convert
  //   it to the array form.
  //   e.g., 'SVG:B220;B99:SVG' -> '[13166,";",9011]'
  if (theString.indexOf(",") !== -1) {
    // Replace the SVG prefix and suffix strings with square brackers (array)
    theString = theString.replace(SVG_PREFIX, "[").replace(SVG_SUFFIX,"]");
    result = JSON.parse(theString) as SymbolCompositionType;
  }
  else if (theString.indexOf("B") !== -1) {
    // Remove the SVG prefix and suffix; parse Blissary builder format (e.g. "B220;B99")
    theString = theString.replace(SVG_PREFIX, "").replace(SVG_SUFFIX,"");
    result = bstrToComposition(theString);
  }
  else {
    // Numeric BCI-AV-ID notation (e.g. "13166;9011") is no longer supported.
    // Use Blissary format (e.g. "B823;B99") or comma-separated IDs instead.
    throw new Error(`Unsupported SVG builder format (numeric BCI-AV-ID): ${theString}. Use Blissary "B<id>" format.`);
  }
  return result;
}

/**
 * Finds the BCI AV ID(s) for a given label.  The label is compared to each of
 * the glosses where a match is defined as either an exact match, or a "word"
 * match using the regular expression /\bword\b/, where "word" is the value of
 * the given label.
 * @param {string} label - The label to use to search for matches in the gloss.
 * @param {Array} blissSymbolEntries - Array of objects containing BCI AV IDs, and
 *                               their glosses:
 *                               { id: number, gloss: string, ... }
 * @returns {Array} An array of objects whose gloss matches the given label:
 *                  { id: {number}, gloss: {string}, ... }
 * @throws {Error} If no BCI AV ID is found for the label.
 */
function findBciAvId(label: string, blissSymbolEntries: BlissSymbolEntry[]): MatchInfo[] {
  const matches: MatchInfo[] = [];
  // Search for the label in the Bliss gloss
  console.log(`For label ${label}:`);
  for (const oneBlissSymbolEntry of blissSymbolEntries) {
    // Try an exact match or a word match
    const wordMatch = new RegExp(`\\b${label}\\b`);
    if ((label === oneBlissSymbolEntry.gloss) || wordMatch.test(oneBlissSymbolEntry.gloss)) {
      matches.push({
        id: oneBlissSymbolEntry.id,
        bciAvId: oneBlissSymbolEntry.bciAvId,
        label: oneBlissSymbolEntry.gloss,
        composition: oneBlissSymbolEntry.composition
      });
      console.log(`\tFound match: ${oneBlissSymbolEntry.gloss}, bci-av-id: ${oneBlissSymbolEntry.bciAvId}`);
    }
  }
  // If no BCI AV ID is found, throw an error
  if (matches.length === 0) {
    throw new Error(`BciAvId not found for label: ${label}`);
  }
  return matches;
}

/**
 * Find full gloss item for a given BCI AV ID.
 * @param {string} bciAvId - A string version of the id.
 * @param {Array} blissSymbolEntries - Array of objects containing BCI AV IDs, and their
 *                               glosses:
 *                              { id: {number}, gloss: {string}, ... }
 * @returns {Object} The object that matches the given BCI AV ID
 * @throws {Error} If the given BCI AV ID is invalid (not in the gloss)
 */
function findByBciAvId (bciAvId: string, blissSymbolEntries: BlissSymbolEntry[]): BlissSymbolEntry {
  const theEntry = blissSymbolEntries.find((entry) => (entry.bciAvId === parseInt(bciAvId)));
  if (theEntry === undefined) {
    throw new Error(`BciAvId not found for BCI AV ID: ${bciAvId}`);
  }
  return theEntry;
}

/**
 * Given an array of arrays of labels, find matches in the Bliss gloss and use
 * the first such match to build a palette cell for the symbol found. The
 * placement of that symbol within the palette depends on the `startRow` and
 * `startColumn` parameters. The first item in the first array of labels is
 * placed at `(startRow, startColumn)`.  The column index is advanced by one
 * for every other label in that array.  The row index is advance by one for
 * every array of labels in the input.
 *
 * Matches against the gloss are found by two criteria:  either an exact match
 * to the label or a partial match where the match is a "word" in the gloss.
 * A word is defined by a regular expression, for example, if the word is "man",
 * the regular expression is /\bman\b/, where "\b" means "match a word
 * boundary".  For more information, see:
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Assertions
 *
 * There are three special cases of labels:
 * 1. A number where the match will be against the BCI AV IDs in the gloss, not
 *    the gloss strings themselves. If the number provided is not a match to an
 *    existing BCI AV ID, a "not found" result is output.
 * 2. The string "BLANK" is interpretted as a blank cell in the palette.  The
 *    gloss is not consulted in this case, and the column index is increased.
 * 3. The string begins with "SVG:" and ends with ":SVG", and the rest is a
 *    series of Svg Builder specifiers, e.g.,
 *    'SVG:14183,"/",25777,"/","W8W:0,8":SVG' (specifies a wavy line).
 *
 * @param {Array} paletteLabels - Array of arrays of label strings, numbers,
 *                                 and "BLANK" for searching the gloss for
 *                                 matching Bliss symbols
 * @param {String} paletteName - The name for the palette.
 * @param {number} startRow - The row index of the top left cell of the palette
 * @param {number} startColumn - The column index of the top left cell of the
 *                                palette
 * @param {String} cellType - The type to use for each cell.
 * @return {Object} - an object with the following structure:
 * {
 *    paletteJson: the JSON representation of the palette (type {Palette})
 *    matches: an array of matches for each label passed in, where each match
 *             has the structure:
 *             { label: [ {bciAvId: {number}, label: {string}, full gloss }, ... ]}
 *    errors: an array of "not found" messages for each label for which there
 *            was no match in the gloss
 * }
 */
export function processPaletteLabels (
  paletteLabels: string[][],
  paletteName: string,
  startRow: number,
  startColumn: number,
  cellType: string
): ProcessPaletteResult {
  // Initialize palette to return, the matches, and the error list
  const finalJson: JsonPaletteType = {
    name: paletteName,
    cells: {}
  };
  const matchByInfoArray: MatchByInfo[] = [];
  const errors: string[] = [];

  paletteLabels.forEach((row, rowIndex) => {
    row.forEach((infoString, colIndex) => {
      const current_row = startRow + rowIndex;
      const current_column = startColumn + colIndex;

      // Handle empty cells by advancing to the next item
      if (infoString.startsWith(BLANK_CELL)) {
        return;
      }
      // Create a cell object for the current `infoString`, leaving the
      // `composition` field undefined for now.
      const cell: { type: string, options: { label: string, composition: SymbolCompositionType | undefined, rowStart: number, rowSpan: number, columnStart: number, columnSpan: number } } = {
        type: cellType,
        options: {
          label: infoString,
          composition: undefined,
          rowStart: current_row,
          rowSpan: 1,
          columnStart: current_column,
          columnSpan: 1
        }
      };
      try {
        // Split on `LABEL_MARKER`.  Result is an array, but if there is no
        // `LABEL_MARKER` it is an array of one element.
        const labelSplits = infoString.split(LABEL_MARKER);
        infoString = labelSplits[0];
        const actualLabel = labelSplits[1]?.replace(/_/g, " ");

        // If the `infoString` is an Svg Builder string, convert it to the
        // proper array version of the `composition`, but it won't have a label
        if (isSvgBuilderString(infoString)) {
          cell.options.composition = convertSvgBuilderString(infoString);
          cell.options.label = actualLabel || "";
        }
        else {
          // If the `infoString` is a BCI AV ID (a number), look it up to get
          // the ID for the composition field.
          const parsedId = parseInt(infoString);
          if (!isNaN(parsedId)) {
            const glossEntry = findByBciAvId(infoString, bliss_gloss);
            cell.options.composition = glossEntry.id;
            cell.options.label = actualLabel || glossEntry.gloss;
          }
          else {
            // Find the ID(s) for the current infoString label.
            // Use the composition of the first match (or its ID).
            const matches = findBciAvId(infoString, bliss_gloss);
            cell.options.composition = matches[0].composition ?? matches[0].id;
            cell.options.label = actualLabel || infoString;
            const inputMatches: MatchByInfo = {};
            inputMatches[infoString] = matches;
            matchByInfoArray.push(inputMatches);
          }
        }
      }
      catch (error) {
        // If an error occurs, add it to the errors array
        const message = error instanceof Error ? error.message : String(error);
        errors.push(message);

        // Change the cell label to indicate that this cell is not right yet.
        // IDs: 2088=not, 303=eye, 92=past-action-indicator, 1044=hidden-thing
        cell.options.label += " NOT FOUND";
        cell.options.composition = [ 2088, "/", 303, ";", 92, "/", 1044];
      }
      finalJson.cells[`${infoString}-${uuidv4()}`] = cell;
    });
  });
  return { paletteJson: finalJson, matches: matchByInfoArray, errors: errors };
}
