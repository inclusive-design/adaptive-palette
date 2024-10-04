/**
 * Palette JSON Generator
 *
 * This script generates a JSON file for a palette based on a two-dimensional array of labels.
 * It uses a Bliss gloss JSON file to map labels to BCI AV IDs.
 *
 * Usage: node scripts/paletteJsonGenerator.js <blissGlossJsonFile> <paletteJsonFile>
 *
 * Arguments:
 *   blissGlossJsonFile: Path to the input Bliss gloss JSON file
 *   paletteJsonFile: Path to the output palette JSON file
 *
 * Example:
 *   node scripts/paletteJsonGenerator.js data/bliss_gloss.json output/palette.json
 *
 * Configurable Options:
 *   palette_labels: A 2D array representing the layout of labels in the palette.
 *           Each sub-array represents a row, and each element represents a cell.
 *   start_row: The starting row number for the first cell in the palette (default: 2).
 *   start_column: The starting column number for the first cell in the palette (default: 1).
 *   type: The type of cell to be created (default: "ActionBmwCodeCell").
 *   specialEncodings: An object containing special label-to-BciAvId mappings for labels
 *           that don't follow the standard mapping in the Bliss gloss file.
 *
 * The script will generate a JSON file with the following structure:
 * {
 *   "name": "Palette Name",
 *   "cells": {
 *   "<uuid>": {
 *     "type": "<type>",
 *     "options": {
 *     "label": "<label>",
 *     "bciAvId": <bciAvId>,
 *     "rowStart": <rowNumber>,
 *     "rowSpan": 1,
 *     "columnStart": <columnNumber>,
 *     "columnSpan": 1
 *     }
 *   },
 *   ...
 *   }
 * }
 */

import fs from "fs";
import { v4 as uuidv4 } from "uuid";

// Check for correct number of command-line arguments
if (process.argv.length !== 4) {
  console.log("Usage: node scripts/paletteJsonGenerator.js blissGlossJsonFile paletteJsonFile");
  process.exit(1);
}

// Parse input arguments
const blissGlossJsonFile = process.argv[2];
const paletteJsonFile = process.argv[3];

// Configurable options
const palette_labels = [["indicator_(action)", "indicator_(active)", "indicator_(adverb)"], ["food", "BAR"]];
const start_row = 2;
const start_column = 1;
const type = "ActionBmwCodeCell";

// Special encodings for labels that don't follow the standard mapping
const specialEncodings = {
  // Add any special label-to-BciAvId mappings here
  // Example:
  // "specialLabel1": 12345
  // "specialLabel2": [12345, "/", 23456]
};

// Initialize the final JSON structure
const final_json = {
  "name": "Palette Name",
  "cells": {}
};
// End of configurable options

// // Read and parse the Bliss gloss JSON file
let bliss_gloss;
try {
  bliss_gloss = JSON.parse(fs.readFileSync(blissGlossJsonFile, "utf8"));
} catch (error) {
  console.error(`Error reading ${blissGlossJsonFile}: ${error.message}`);
  process.exit(1);
}

/**
 * Finds the BCI AV ID for a given label
 * @param {string} label - The label to find the BCI AV ID for
 * @param {blissGlosses} Array - Array of objects:
 *                        { bciav: number, english: string }
 * @returns {Object} The BCI AV ID
 * @throws {Error} If no BCI AV ID is found for the label
 */
function findBciAvId(label, blissGlosses) {
  // Check if the label has a special encoding
  if (label in specialEncodings) {
    return specialEncodings[label];
  }
  const matches = {};
  // Search for the label in the Bliss gloss
  console.log(`For label ${label}:`);
  for (const gloss of blissGlosses) {
    if (gloss.description.includes(label)) {
      matches[gloss.id] = gloss.description;
      console.log(`\tFound match: ${matches[gloss.id]}, bci-av-id: ${gloss.id}`);
    }
  }
  // If no BCI AV ID is found, throw an error
  if (Object.keys(matches).length === 0) {
    throw new Error(`BciAvId not found for label: ${label}`);
  }
  console.log("");
  return matches;
}

// Array to store any errors that occur during processing
let errors = [];

// Process each label in the palette_labels array
palette_labels.forEach((row, rowIndex) => {
  row.forEach((label, colIndex) => {
    const current_row = start_row + rowIndex;
    const current_column = start_column + colIndex;

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
      // Find the BCI AV IDs for the current label.  Use the first one for the
      // palette
      const matches = findBciAvId(label, bliss_gloss);
      cell.options.bciAvId = Object.values(matches)[0];
    }
    catch (error) {
      // If an error occurs, add it to the errors array
      errors.push(error.message);

      // Change the label to indicate that this cell is not right yet.  The
      // `bciAvId` encoding means "not found".
      cell.options.label += " NOT FOUND";
      cell.options.bciAvId = [ 15733, "/", 14133, ";", 9004, "/", 25570];
      // "not found"             not,        eye + past action +   hidden thing
    }
    final_json.cells[`${label}-${uuidv4()}`] = cell;
  });
});

// Save the palette and print out the errors and result.
fs.writeFileSync(paletteJsonFile, JSON.stringify(final_json, null, 2));
if (errors.length > 0) {
  console.error("Errors occurred:");
  errors.forEach(error => console.error(error));
  console.error(`${paletteJsonFile} generated but with the above error(s).`);
  process.exit(1);
} else {
  console.log(`JSON file generated successfully: ${paletteJsonFile}`);
  process.exit(0);
}
