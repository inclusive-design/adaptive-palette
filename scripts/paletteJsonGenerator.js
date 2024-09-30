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
 *                   Each sub-array represents a row, and each element represents a cell.
 *   start_row: The starting row number for the first cell in the palette (default: 2).
 *   start_column: The starting column number for the first cell in the palette (default: 1).
 *   type: The type of cell to be created (default: "ActionBmwCodeCell").
 *   specialEncodings: An object containing special label-to-BciAvId mappings for labels
 *                     that don't follow the standard mapping in the Bliss gloss file.
 * 
 * The script will generate a JSON file with the following structure:
 * {
 *   "name": "Palette Name",
 *   "cells": {
 *     "<uuid>": {
 *       "type": "<type>",
 *       "options": {
 *         "label": "<label>",
 *         "bciAvId": <bciAvId>,
 *         "rowStart": <rowNumber>,
 *         "rowSpan": 1,
 *         "columnStart": <columnNumber>,
 *         "columnSpan": 1
 *       }
 *     },
 *     ...
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
const palette_labels = [["label1", "angle"], ["label2", "angry"], ["angle", "angry"]];
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

// Read and parse the Bliss gloss JSON file
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
 * @returns {number} The BCI AV ID
 * @throws {Error} If no BCI AV ID is found for the label
 */
function findBciAvId(label) {
    // Check if the label has a special encoding
    if (label in specialEncodings) {
        return specialEncodings[label];
    }

    // Search for the label in the Bliss gloss
    for (const [id, glosses] of Object.entries(bliss_gloss)) {
        if (glosses.includes(label)) {
            return parseInt(id);
        }
    }

    // If no BCI AV ID is found, throw an error
    throw new Error(`BciAvId not found for label: ${label}`);
}

// Array to store any errors that occur during processing
let errors = [];

// Process each label in the palette_labels array
palette_labels.forEach((row, rowIndex) => {
    row.forEach((label, colIndex) => {
        const current_row = start_row + rowIndex;
        const current_column = start_column + colIndex;

        try {
            // Find the BCI AV ID for the current label
            const bci_av_id = findBciAvId(label);

            // Create a cell object for the current label
            const cell = {
                type: type,
                options: {
                    label: label,
                    bciAvId: bci_av_id,
                    rowStart: current_row,
                    rowSpan: 1,
                    columnStart: current_column,
                    columnSpan: 1
                }
            };

            // Add the cell to the final JSON structure with a unique ID
            final_json.cells[uuidv4()] = cell;
        } catch (error) {
            // If an error occurs, add it to the errors array
            errors.push(error.message);
        }
    });
});

// Check if any errors occurred during processing
if (errors.length > 0) {
    // If errors occurred, log them and exit without generating the JSON file
    console.error("Errors occurred:");
    errors.forEach(error => console.error(error));
    console.error(`${paletteJsonFile} is not generated because of the error(s).`);
} else {
    // If no errors occurred, write the final JSON to the output file
    fs.writeFileSync(paletteJsonFile, JSON.stringify(final_json, null, 2));
    console.log(`JSON file generated successfully: ${paletteJsonFile}`);
}
