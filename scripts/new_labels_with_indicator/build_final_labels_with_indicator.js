/*
 * Usage:
 * node build_final_labels_with_indicator.js <labelsJsonlFile> <explanationsJsonFile> <outputFile> <logFile>
 *
 * Example:
 * node build_final_labels_with_indicator.js \
 *   ./data/new_labels_with_indicator.jsonl \
 *   ../../public/data/bliss_symbol_explanations.json \
 *   ../../public/data/new_labels_with_indicator.json \
 *   ./data/build_error.log
 *
 * Post-processes LLM-generated indicator labels into a flat lookup:
 * Bliss composition string (B-prefix stripped) -> label.
 */

import fs from "fs";
import { BlissSVGBuilder } from "bliss-svg-builder";

/**
 * @typedef {{ id: number, composition?: (string | number)[] }} ExplanationItem
 */

/**
 * @typedef {{ targetId: string, wordId: number, indicatorId: number, newLabel: string }} LabelRow
 */

/**
 * Parse and validate CLI arguments.
 * @param {string[]} argv
 * @returns {{ labelsFile: string, explanationsFile: string, outputFile: string, logFile: string }}
 */
function parseArgs(argv) {
  if (argv.length !== 4) {
    console.error("Error: Invalid arguments.");
    console.error("Usage: node build_final_labels_with_indicator.js <labelsJsonlFile> <explanationsJsonFile> <outputFile> <logFile>");
    process.exit(1);
  }
  const [labelsFile, explanationsFile, outputFile, logFile] = argv;
  return { labelsFile, explanationsFile, outputFile, logFile };
}

/**
 * Read and parse the explanations JSON file into a lookup Map keyed by id.
 * @param {string} fileName
 * @returns {Map<number, ExplanationItem>}
 */
function readExplanationsMap(fileName) {
  let rawData;
  try {
    rawData = fs.readFileSync(fileName, "utf8");
  } catch {
    console.error(`Error: Failed to read "${fileName}". Make sure the file exists.`);
    process.exit(1);
  }
  /** @type {ExplanationItem[]} */
  let items;
  try {
    items = JSON.parse(rawData);
  } catch {
    console.error(`Error: Failed to parse "${fileName}". Make sure the file is valid JSON.`);
    process.exit(1);
  }
  return new Map(items.map(item => [item.id, item]));
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
 * Build the composition DSL segment for an explanation item: joins the "composition"
 * array (numbers -> "B"-prefixed, separators passed through) or, for atomic characters
 * with no "composition" key, falls back to "B" + the item's own id.
 * @param {ExplanationItem} item
 * @returns {string}
 */
function buildCompositionSegment(item) {
  if (item.composition) {
    return item.composition.map(part => typeof part === "number" ? `B${part}` : part).join("");
  }
  return `B${item.id}`;
}

/**
 * Process all label rows into the output lookup object: composition string (B-prefix
 * stripped) -> newLabel. Rows referencing a missing wordId are skipped and logged.
 * Any BlissSVGBuilder warning halts the whole script (logged via console.error, then
 * process.exit(1)). A composition collision (two rows resolving to the same output key)
 * is logged - with the targetId/newLabel of both the previous and the new row - and
 * overwrites (last write wins).
 * @param {LabelRow[]} rows
 * @param {Map<number, ExplanationItem>} explanationsMap
 * @param {{ warn: (msg: string) => void, error: (msg: string) => void }} logger
 * @returns {{ output: Record<string, string>, skipped: number, overwritten: number }}
 */
function processRows(rows, explanationsMap, logger) {
  /** @type {Record<string, string>} */
  const output = {};
  /** @type {Map<string, { targetId: string, newLabel: string }>} */
  const keySources = new Map();
  let skipped = 0;
  let overwritten = 0;

  for (const row of rows) {
    const item = explanationsMap.get(row.wordId);
    if (!item) {
      logger.warn(`Warning: Skipping targetId "${row.targetId}" - wordId ${row.wordId} not found in explanations file.`);
      skipped++;
      continue;
    }

    const compositionSegment = buildCompositionSegment(item);
    const dsl = `${compositionSegment};;B${row.indicatorId}`;
    const builder = new BlissSVGBuilder(dsl);

    if (builder.warnings.length) {
      logger.error(
        `Error: BlissSVGBuilder produced ${builder.warnings.length} warning(s) for targetId "${row.targetId}" (dsl: "${dsl}"):\n` +
        builder.warnings.map(w => `  - [${w.code}] ${w.message} (source: "${w.source}")`).join("\n")
      );
    }

    const rawKey = builder.toString({ flattenIndicators: true });
    const key = rawKey.replace(/B(\d+)/g, "$1");

    if (Object.prototype.hasOwnProperty.call(output, key)) {
      const previous = keySources.get(key);
      logger.warn(
        `Warning: Duplicate composition key "${key}" - overwriting previous label.\n` +
        `  - previous: targetId "${previous.targetId}", newLabel "${previous.newLabel}"\n` +
        `  - new:      targetId "${row.targetId}", newLabel "${row.newLabel}"`
      );
      overwritten++;
    }

    output[key] = row.newLabel;
    keySources.set(key, { targetId: row.targetId, newLabel: row.newLabel });
  }

  return { output, skipped, overwritten };
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

/**
 * Create a logger that both prints to the console and accumulates lines to be
 * flushed to a log file via flushToFile().
 * @param {string} fileName
 * @returns {{ warn: (msg: string) => void, error: (msg: string) => void, flushToFile: () => void }}
 */
function createLogger(fileName) {
  /** @type {string[]} */
  const lines = [];
  return {
    warn(msg) {
      console.warn(msg);
      lines.push(msg);
    },
    error(msg) {
      console.error(msg);
      lines.push(msg);
    },
    flushToFile() {
      try {
        fs.writeFileSync(fileName, lines.join("\n\n") + (lines.length ? "\n" : ""), "utf8");
      } catch {
        console.error(`Error: Failed to write to "${fileName}". Check directory permissions.`);
        process.exit(1);
      }
    }
  };
}

// Main execution
const { labelsFile, explanationsFile, outputFile, logFile } = parseArgs(process.argv.slice(2));
const logger = createLogger(logFile);
const explanationsMap = readExplanationsMap(explanationsFile);
const rows = readLabelRows(labelsFile);
const { output, skipped, overwritten } = processRows(rows, explanationsMap, logger);
writeOutput(outputFile, output);
logger.flushToFile();

console.log("\n=== Processing Report ===");
console.log(`Report: Processed ${rows.length} input rows into ${Object.keys(output).length} entries in ${outputFile}`);
console.log(`Report: Skipped ${skipped} row(s) with missing wordId.`);
console.log(`Report: ${overwritten} duplicate composition key(s) overwritten.`);
console.log(`Report: Warnings/errors written to "${logFile}".`);
