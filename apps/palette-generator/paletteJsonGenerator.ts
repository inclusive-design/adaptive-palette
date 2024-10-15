/**
 * Palette JSON Generator
 *
 * This script generates a JSON file for a palette based on a two-dimensional array of labels.
 * It uses a Bliss gloss JSON file to map labels to BCI AV IDs.
 *
 * Usage: node scripts/paletteJsonGenerator.js <paletteJsonFile>
 *
 * Arguments:
 *   paletteJsonFile: Path to the output palette JSON file
 *
 * Example:
 *   node scripts/paletteJsonGenerator.js output/palette.json
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

// Configurable options -- get from UI
const palette_name = "No name Palette";
const palette_labels = [];
const start_row = 1;
const start_column = 1;
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
 * Finds the BCI AV ID for a given label
 * @param {string} label - The label to find the BCI AV ID for
 * @param {blissGlosses} Array - Array of objects contina BCI AV IDs, an their
 *                       glosses: { id: number, dscription: string }
 * @returns {Array} An array of matching BCK AV IDs
 * @throws {Error} If no BCI AV ID is found for the label
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
    if (gloss.description.includes(label)) {
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

// Array to store any errors that occur during processing
let errors = [];

// Process each label in the palette_labels array
export function processPaletteLabels (palette_labels, start_row, start_column) {
  // Initialize palette to return, the matches, and the error list
  const final_json = {
    "name": palette_name,
    "cells": {}
  };
  const matchByLabel = [];
  errors.length = 0;

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
        // If the "label" isa BCI AV ID (a number), just use it, but find its
        // label
        cell.options.bciAvId = parseInt(label);
        if (!isNaN(cell.options.bciAvId)) {
          for (const gloss of bliss_gloss) {
            if (gloss.id === label) {
              cell.options.label = gloss["description"];
              break;
            }
          }
        }
        else {
          // Find the BCI AV IDs for the current label.  Use the first one for the
          // palette
          const matches = findBciAvId(label, bliss_gloss);
          cell.options.bciAvId = matches[0].bciAvId;
          matchByLabel.push({ label: matches });
          // TODO: show the all of the matches somewhere.
        }
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
  return { paletteJson: final_json, matches: matchByLabel, errors: errors };
}
