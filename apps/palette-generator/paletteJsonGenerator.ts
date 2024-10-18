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
import { v4 as uuidv4 } from "uuid";

const BLANK_CELL_LABEL = "BLANK";
const SVG_PREFIX = "SVG:";
const SVG_SUFFIX = ":SVG";

// Configurable options -- ideally provided by the UI
const palette_name = "No name Palette";
const type = "ActionBmwCodeCell";

// Special encodings for labels that don't follow the standard mapping
const specialEncodings = {
  // Add any special label-to-BciAvId mappings here
  // Example:
  // "specialLabel1": 12345
  // "specialLabel2": [12345, "/", 23456]
};

// End of configurable options

let bliss_gloss;
export async function fetchBlissGlossJson () {
  // Read and parse the Bliss gloss JSON file
  try {
    const fetchResponse = await fetch("https://raw.githubusercontent.com/cindyli/baby-bliss-bot/refs/heads/feat/bmw/data/bliss_symbol_explanations.json");
    bliss_gloss = await fetchResponse.json();
  } catch (error) {
    console.error(`Error fetching 'bliss_symbol_explanations.json': ${error.message}`);
  }
  return bliss_gloss;
}

/**
 * Test for the presencs of a string that encodes SVG builder information.  Such
 * strings begin with "SVG:" and end with ":SVG".
 * @parma {string} - the string to test.
 * @returns {boolean}
 */
function isSvgBuilderString (theString) {
  return theString.startsWith(SVG_PREFIX) && theString.endsWith(SVG_SUFFIX);
}

/**
 * Converts a string that encodes the information required by the SvgUtils
 * (svg builder) to the proper format -- an array of bliss-svg specifications
 * @param {string} svgBuilderString - The string to convert
 * @return {Array} An array of the specifiers required by the SvgUtils
 * @throws {Error} If the encoding is not well formed.
 */
function convertSvgBuilderString (theString) {
  // Replace the SVG prefix and suffix strings with square brackers (array)
  theString = theString.replace(SVG_PREFIX, "[").replace(SVG_SUFFIX,"]");
  return JSON.parse(theString);
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
function findBciAvId(label, blissGlosses) {
  // Check if the label has a special encoding
  if (label in specialEncodings) {
    return specialEncodings[label];
  }
  const matches = [];
  // Search for the label in the Bliss gloss
  console.log(`For label ${label}:`);
  for (const gloss of blissGlosses) {
    // Try an exact match or a word match
    const wordMatch = new RegExp("\\b" + `${label}` + "\\b");
    if ((label === gloss.description) || wordMatch.test(gloss.description)) {
      matches.push({ bciAvId: parseInt(gloss.id), label: gloss.description });
      console.log(`\tFound match: ${gloss.description}, bci-av-id: ${gloss.id}`);
    }
  }
  // If no BCI AV ID is found, throw an error
  if (matches.length === 0) {
    throw new Error(`BciAvId not found for label: ${label}`);
  }
  console.log("");
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
function findByBciAvId (bciAvId: string, blissGlosses: array) {
  const theEntry = blissGlosses.find((entry) => (entry.id === bciAvId));
  if (theEntry === undefined) {
    throw new Error(`BciAvId not found for BCI AV ID: ${bciAvId}`);
  }
  return theEntry;
}

/**
 * Given an array of arrays of labels, find matches in the Bliss gloss and use
 * the first such match to build a palette cell for the symbol found. The
 * placement of that symbol within the palette depends on the `start_row` and
 * `start_column` parameters. The first item in the first array of labels is
 * placed at `(start_row, start_column)`.  The column index is advanced by one
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
 * @param {Array} palette_labels - Array of arrays of label strings, numbers,
 *                                 and "BLANK" for searching the gloss for
 *                                 matching Bliss symbols
 * @param {number} start_row - The row index of the top left cell of the palette
 * @param {number} start_column - The column index of the top left cell of the
 *                                palette
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
export function processPaletteLabels (palette_labels, start_row, start_column) {
  // Initialize palette to return, the matches, and the error list
  const final_json = {
    "name": palette_name,
    "cells": {}
  };
  const matchByLabel = [];
  const errors = [];

  palette_labels.forEach((row, rowIndex) => {
    row.forEach((label, colIndex) => {
      const current_row = start_row + rowIndex;
      const current_column = start_column + colIndex;

      // Handle empty cells by advancing to the next item
      if (label === BLANK_CELL_LABEL) {
        return;
      }

      // Create a cell object for the current label, leaving the `bciAvId` field
      // undefined for now.
      const cell = {
        type: type,
        options: {
          label: label,
          bciAvId: undefined,
          rowStart: current_row,
          rowSpan: 1,
          columnStart: current_column,
          columnSpan: 1
        }
      };
      try {
        // If the `label` is an Svg Builder string, convert it to the proper
        // array version of the `bciAvId`, but it won't have a label
        if (isSvgBuilderString(label)) {
          cell.options.bciAvId = convertSvgBuilderString(label);
        }
        else {
          // If the "label" is a BCI AV ID (a number), just use it for the
          // `bciAvId`.  Even so, find its description from the `bliss_gloss`
          cell.options.bciAvId = parseInt(label);
          if (!isNaN(cell.options.bciAvId)) {
            const glossEntry = findByBciAvId(label, bliss_gloss);
            cell.options.label = glossEntry["description"];
          }
          else {
            // Find the BCI AV IDs for the current label.  Use the first match for
            // the palette
            const matches = findBciAvId(label, bliss_gloss);
            cell.options.bciAvId = matches[0].bciAvId;
            const labelMatch = {};
            labelMatch[label] = matches;
            matchByLabel.push(labelMatch);
          }
        }
      }
      catch (error) {
        // If an error occurs, add it to the errors array
        errors.push(error.message);

        // Change the label to indicate that this cell is not right yet.  The
        // `bciAvId` encoding means "not found".
        cell.options.label += " NOT FOUND";
        cell.options.bciAvId = [ 15733, "/", 14133, ";", 9004, "/", 25570];
        // "not found"             not,        eye + past action +  hidden thing
      }
      final_json.cells[`${label}-${uuidv4()}`] = cell;
    });
  });
  return { paletteJson: final_json, matches: matchByLabel, errors: errors };
}
