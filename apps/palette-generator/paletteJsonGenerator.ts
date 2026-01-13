/*
 * Copyright 2024-2026 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */
import { v4 as uuidv4 } from "uuid";
import { bciAvSymbolsDictUrl, loadDataFromUrl } from "../../src/client/GlobalData";
import {
  makeBciAvIdType, BCIAV_PATTERN_KEY, BLISSARY_PATTERN_KEY, decomposeBciAvId
} from "../../src/client/SvgUtils";
import { BciAvSymbolsDict } from "../../src/client";

const BLANK_CELL = "BLANK";
const SVG_PREFIX = "SVG:";
const SVG_SUFFIX = ":SVG";
const LABEL_MARKER = "LABEL:";

let bciAvSymbolsDict: BciAvSymbolsDict = [];

// Load the BCI AV symbols dictionary from the URL
export async function loadBciAvSymbolsDict() {
  bciAvSymbolsDict = await loadDataFromUrl<BciAvSymbolsDict>(bciAvSymbolsDictUrl);
}

/**
 * Test for the presencs of a string that encodes SVG builder information.  Such
 * strings begin with "SVG:" and ends with ":SVG"
 * @param {string} - the string to test.
 * @returns {boolean}
 */
function isSvgBuilderString (theString: string) {
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
function convertSvgBuilderString (theString: string) {
  let result;
  // Three forms, one with commas and one without:
  // - commas:
  //   Replace the SVG prefix and suffix with "[" and "]", then parse the array.
  //   e.g., 'SVG:13166,";",9011:SVG' -> '[13166,";",9011]'
  // - no commas, using BCI AV IDs:
  //   Treat as an SVG composition string and use makeBciAvIdType() to convert
  //   it to the array form.
  //   e.g., 'SVG:13166;9011:SVG' -> '[13166,";",9011]'
  // - no commas, using Blissary IDs:
  //   Treat as an SVG composition string and use makeBciAvIdType() to convert
  //   it to the array form.
  //   e.g., 'SVG:B220;B99:SVG' -> '[13166,";",9011]'
  if (theString.indexOf(",") !== -1) {
    // Replace the SVG prefix and suffix strings with square brackers (array)
    theString = theString.replace(SVG_PREFIX, "[").replace(SVG_SUFFIX,"]");
    result = JSON.parse(theString);
  }
  else if (theString.indexOf("B") !== -1) {
    // Remove the SVG prefix and suffix
    theString = theString.replace(SVG_PREFIX, "").replace(SVG_SUFFIX,"");
    result = makeBciAvIdType(theString, BLISSARY_PATTERN_KEY);
  }
  else {
    // Remove the SVG prefix and suffix
    theString = theString.replace(SVG_PREFIX, "").replace(SVG_SUFFIX,"");
    result = makeBciAvIdType(theString, BCIAV_PATTERN_KEY);
  }
  return result;
}

/**
 * Finds the BCI AV ID(s) for a given label.  The label is compared to each of
 * the glosses where a match is defined as either an exact match, or a "word"
 * match using the regular expression /\bword\b/, where "word" is the value of
 * the given label.
 * @param {string} label - The label to use to search for matches in the gloss.
 * @param {Array} blissGlosses - Array of objects containing BCI AV IDs, and
 *                               their glosses:
 *                               { id: number, description: string, ... }
 * @returns {Array} An array of objects whose gloss matches the given label:
 *                  { id: {number}, description: {string}, ... }
 * @throws {Error} If no BCI AV ID is found for the label.
 */

// Define the shape of the objects inside the function
interface BlissGloss {
  id: string | number;
  description: string;
  composition?: (string | number)[]; // Optional
}

interface BciAvMatch {
  bciAvId: number;
  label: string;
  composition?: (string | number)[]; // Optional
  fullComposition?: (string | number)[]; // Optional
}

/**
 * Helper function: Normalizes polymorphic return from decomposeBciAvId 
 * (value | array | undefined) into (array | undefined)
 */
const normalizeToOptionalArray = (val: unknown): (string | number)[] | undefined => {
  if (val === undefined || val === null) return undefined;
  if (Array.isArray(val)) {
    return val as (string | number)[];
  }
  return [val as string | number];
};

/**
 * Helper function: Compares two arrays for equality safely
 */
const areArraysEqual = (a?: (string | number)[], b?: (string | number)[]): boolean => {
  if (!a || !b) return a === b; // If both undefined, they are equal
  if (a.length !== b.length) return false;
  return a.every((val, index) => String(val) === String(b[index]));
};

function findBciAvId(label: string, blissGlosses: BlissGloss[]): BciAvMatch[] {
  const matches: BciAvMatch[] = [];
  console.log(`For label ${label}:`);

  for (const gloss of blissGlosses) {
    const wordMatch = new RegExp("\\b" + label + "\\b");
    
    if (label === gloss.description || wordMatch.test(gloss.description)) {
      const glossId = typeof gloss.id === "number" ? gloss.id : parseInt(gloss.id);

      // Determine the source for decomposition and what "original" state to compare against
      const source = gloss.composition ?? glossId;
      const originalAsArray = gloss.composition ?? [glossId];

      const fullComp = normalizeToOptionalArray(decomposeBciAvId(source));
      
      // Check if the decomposition resulted in exactly what we started with
      const equalCompositions = areArraysEqual(fullComp, originalAsArray);

      matches.push({
        bciAvId: glossId,
        label: gloss.description,
        composition: gloss.composition, // Might be undefined
        fullComposition: equalCompositions ? undefined : fullComp
      });

      console.log(`\tFound match: ${gloss.description}, bci-av-id: ${glossId}`);
    }
  }

  if (matches.length === 0) {
    throw new Error(`BciAvId not found for label: ${label}`);
  }

  return matches;
}

/**
 * Find full gloss item for a given BCI AV ID.
 * @param {string} bciAvId - A string version of the id.
 * @param {Array} blissGlosses - Array of objects contina BCI AV IDs, and their
 *                               glosses:
 *                              { id: {number}, description: {string}, ... }
 * @returns {Object} The object that matches the given BCI AV ID
 * @throws {Error} If the given BCI AV ID is invalid (not in the gloss)
 */
function findByBciAvId (bciAvId: string, blissGlosses: BlissGloss[]) {
  const theEntry = blissGlosses.find((entry) => (entry.id === bciAvId));
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


interface Cell {
  type: string;
  options: {
    label: string;
    bciAvId?: number | (string | number)[];
    rowStart: number;
    rowSpan: number;
    columnStart: number;
    columnSpan: number;
  };
}

interface Palette {
  name: string;
  cells: Record<string, Cell>;
}

// Type `BciAvMatch` is defined in the function above
type MatchByInfo = Record<string, BciAvMatch[]>;

export async function processPaletteLabels (paletteLabels: string[][], paletteName: string, startRow: number, startColumn: number, cellType: string) {
  // Initialize palette to return, the matches, and the error list
  const finalJson: Palette = {
    "name": paletteName,
    "cells": {}
  };
  const matchByInfoArray: MatchByInfo[] = [];
  const errors: string[] = [];

  paletteLabels.forEach((row: string[], rowIndex: number) => {
    row.forEach((infoString: string, colIndex: number) => {
      const current_row = startRow + rowIndex;
      const current_column = startColumn + colIndex;

      // Handle empty cells by advancing to the next item
      if (infoString.startsWith(BLANK_CELL)) {
        return;
      }
      // Create a cell object for the current `infoString`, leaving the
      // `bciAvId` field undefined for now.
      const cell: Cell = {
        type: cellType,
        options: {
          label: infoString,
          bciAvId: undefined,
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
        // proper array version of the `bciAvId`, but it won't have a label
        if (isSvgBuilderString(infoString)) {
          cell.options.bciAvId = convertSvgBuilderString(infoString);
          cell.options.label = actualLabel || "";
        }
        else {
          // If the `infoString` is a BCI AV ID (a number), just use it for the
          // `bciAvId`.  Even so, find its description from the `bciAvSymbolsDict`
          cell.options.bciAvId = parseInt(infoString);
          if (!isNaN(cell.options.bciAvId)) {
            const glossEntry = findByBciAvId(infoString, bciAvSymbolsDict);
            cell.options.label = actualLabel || glossEntry["description"];
          }
          else {
            // Find the BCI AV IDs for the current infoString.  Use the first
            // match for the palette
            const matches = findBciAvId(infoString, bciAvSymbolsDict);
            cell.options.bciAvId = matches[0].bciAvId;
            cell.options.label = actualLabel || infoString;
            const inputMatches: MatchByInfo = {};
            inputMatches[infoString] = matches;
            matchByInfoArray.push(inputMatches);
          }
        }
      }
      catch (error: unknown) {
        // If an error occurs, add it to the errors array
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(errorMessage);

        // Change the cell label to indicate that this cell is not right yet.
        // The `bciAvId` encoding means "not found".
        cell.options.label += " NOT FOUND";
        cell.options.bciAvId = [ 15733, "/", 14133, ";", 9004, "/", 25570];
        // "not found"             not,        eye + past action +  hidden thing
      }
      finalJson.cells[`${infoString}-${uuidv4()}`] = cell;
    });
  });
  return { paletteJson: finalJson, matches: matchByInfoArray, errors: errors };
}
