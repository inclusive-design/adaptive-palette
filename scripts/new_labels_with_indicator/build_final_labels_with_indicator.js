/*
 * Usage:
 * node build_final_labels_with_indicator.js <labelsJsonlFile> <outputFile>
 *
 * Example:
 * node build_final_labels_with_indicator.js \
 *   ./data/new_labels_with_indicator.jsonl \
 *   ../../public/data/new_labels_with_indicator.json
 *
 * Post-processes LLM-generated indicator labels into a flat, id-keyed lookup:
 * "{wordId}_{indicatorId}" -> newLabel. The key is the row's `targetId`, which is
 * already unique by construction (one row per word+indicator pair) -- a duplicate
 * targetId indicates corrupt input and is a hard error.
 */

import fs from "fs";

/**
 * @typedef {{ targetId: string, wordId: number, indicatorId: number, newLabel: string }} LabelRow
 */

/**
 * Parse and validate CLI arguments.
 * @param {string[]} argv
 * @returns {{ labelsFile: string, outputFile: string }}
 */
function parseArgs(argv) {
  if (argv.length !== 2) {
    console.error("Error: Invalid arguments.");
    console.error("Usage: node build_final_labels_with_indicator.js <labelsJsonlFile> <outputFile>");
    process.exit(1);
  }
  const [labelsFile, outputFile] = argv;
  return { labelsFile, outputFile };
}

/**
 * Read the labels JSONL file into an array of parsed rows, skipping blank lines.
 * @param {string} fileName
 * @returns {LabelRow[]}
 */
function readLabelRows(fileName) {
  let rawData;
  try {
    rawData = fs.readFileSync(fileName, "utf8");
  } catch {
    console.error(`Error: Failed to read "${fileName}". Make sure the file exists.`);
    process.exit(1);
  }
  const lines = rawData
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch {
      console.error(`Error: Failed to parse line ${index + 1} of "${fileName}".`);
      process.exit(1);
    }
  });
}

/**
 * Build the id-keyed output map: `targetId` -> `newLabel`. `targetId` is unique by
 * construction (one row per word+indicator pair); a duplicate indicates corrupt
 * input and is a hard error (logged, then `process.exit(1)`).
 * @param {LabelRow[]} rows
 * @returns {Record<string, string>}
 */
function processRows(rows) {
  /** @type {Record<string, string>} */
  const output = {};

  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(output, row.targetId)) {
      console.error(
        `Error: Duplicate targetId "${row.targetId}" found in labels file - targetId must be unique. ` +
        "This indicates corrupt input data."
      );
      process.exit(1);
    }
    if (typeof row.newLabel !== "string" || row.newLabel.trim().length === 0) {
      console.error(
        `Error: Missing or empty newLabel for targetId "${row.targetId}". ` +
        "This indicates corrupt input data."
      );
      process.exit(1);
    }
    output[row.targetId] = row.newLabel;
  }

  return output;
}

/**
 * Write the output object to a JSON file, with error handling for write failures.
 * @param {string} fileName
 * @param {Record<string, string>} output
 */
function writeOutput(fileName, output) {
  try {
    fs.writeFileSync(fileName, JSON.stringify(output, null, 2), "utf8");
  } catch {
    console.error(`Error: Failed to write to "${fileName}". Check directory permissions.`);
    process.exit(1);
  }
}

// Main execution
const { labelsFile, outputFile } = parseArgs(process.argv.slice(2));
const rows = readLabelRows(labelsFile);
const output = processRows(rows);
writeOutput(outputFile, output);

console.log("\n=== Processing Report ===");
console.log(`Report: Processed ${rows.length} input rows into ${Object.keys(output).length} entries in ${outputFile}`);
