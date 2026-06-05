/*
 * Usage:
 * node generate_bliss_symbol_explanations.js <inputFile.json> <outputFile.json> [--verbose]
 *
 * Example:
 * node generate_bliss_symbol_explanations.js data/bliss_dictionary_20260513.json ../public/data/bliss_symbol_explanations.json
 *
 * This script processes a JSON file containing linguistic derivation data and
 * maps it into a new hierarchical structure used by this project. The original
 * data file is provided by [bliss-svg-builder project](https://github.com/hlridge/bliss-svg-builder).
 * See [`../docs/GenerateBlissSymbolExplanations.md`](../docs/GenerateBlissSymbolExplanations.md)
 * for detailed documentation.
 *
 * Operations:
 * 1. Field Mapping: Maps specified fields (e.g., `id` -> `id`, `bciAvId` -> `bciAvId`,
 *     `isChar` -> `isCharacter`, `gloss` -> `gloss`, `explanation` -> `explanation`,
 *     `code` -> parses the code into `composition`).
 *    1.1 Fallback for missing `isChar`: defaults to `false`.
 * 2. Composition Generation: Parses `item.code` directly for non-character items
 *    (`isChar === false`) — `B`-prefixed IDs are resolved to character IDs.
 *    Separators (`/` and `;`) are preserved as strings.
 *
 * Reporting (use --verbose for full output):
 * - Errors (always shown): missing code, missing ID references, non-character references
 * - Warnings (always shown): missing bciAvId, missing pos
 * - Verbose-only (--verbose): special code segments, missing isChar, missing explanation
 *
 * Notes but not show-stopper: after processing, a few items with missing fields:
 * Warning: Items missing "explanation" value: 1 items: 6330
 * Warning: missing "bciAvId": 9 items: 5844, 5995, 6435, 6436, 6437, 6438, 6439, 6440, 6441
 */

import fs from "fs";

/**
 * @typedef {{
 *   id: number,
 *   bciAvId?: number | null,
 *   isChar: boolean,
 *   gloss: string,
 *   explanation?: string,
 *   pos?: string,
 *   code?: string
 * }} BlissItem
 */

const errors = {
  missingCode: new Set(),
  missingIDReference: new Set(),
  notACharacter: new Set()
};
const warnings = {
  missingBciAvId: new Set(),
  missingPos: new Set()
};
const verboseWarnings = {
  specialCodeSegment: new Set(),
  missingIsChar: new Set(),
  missingExplanation: new Set()
};

/**
 * @param {string[]} argv
 * @returns {{ inputFile: string, outputFile: string, verbose: boolean }}
 */
function parseArgs(argv) {
  const verbose = argv.includes("--verbose");
  const positional = argv.filter(a => a !== "--verbose");
  if (positional.length !== 2) {
    console.error("Error: Invalid arguments.");
    console.error("Usage: node generate_bliss_symbol_explanations.js <inputFile.json> <outputFile.json> [--verbose]");
    process.exit(1);
  }
  const [inputFile, outputFile] = positional;
  return { inputFile, outputFile, verbose };
}

/**
 * @param {string} fileName
 * @returns {BlissItem[]}
 */
function readInput(fileName) {
  let rawData;
  try {
    rawData = fs.readFileSync(fileName, "utf8");
  } catch {
    console.error(`Error: Failed to read "${fileName}". Make sure the file exists.`);
    process.exit(1);
  }
  const parsed = /** @type {{ data: BlissItem[] }} */ (JSON.parse(rawData));
  return parsed.data;
}

/**
 * @param {BlissItem[]} data
 * @returns {Map<number, BlissItem>}
 */
function buildLookupMap(data) {
  /** @type {Map<number, BlissItem>} */
  const map = new Map();
  data.forEach(item => {
    if (!Object.prototype.hasOwnProperty.call(item, "isChar") || item.isChar === null) {
      item.isChar = false;
      verboseWarnings.missingIsChar.add(item.id);
    }
    map.set(Number(item.id), item);
  });
  return map;
}

/**
 * @param {BlissItem} item
 * @param {Map<number, BlissItem>} lookupMap
 * @returns {(string | number)[]}
 */
function buildComposition(item, lookupMap) {
  if (!item.code) {
    errors.missingCode.add(`Error: ID ${item.id} has isChar=false but no code.`);
    return [];
  }

  const parts = item.code.split(/([/;])/);
  /** @type {(string | number)[]} */
  const composition = [];

  for (const part of parts) {
    if (part === "/" || part === ";") {
      composition.push(part);
      continue;
    }

    const trimmedPart = part.trim();
    if (!trimmedPart) continue;

    const match = trimmedPart.match(/^B(\d+)$/);
    if (match) {
      const refId = parseInt(match[1], 10);
      const refItem = lookupMap.get(refId);
      if (!refItem) {
        errors.missingIDReference.add(`Error: ID ${item.id} references missing ID ${refId} in code segment "${trimmedPart}".`);
        continue;
      }
      if (refItem.isChar === false) {
        errors.notACharacter.add(`Error: ID ${item.id} references non-character ID ${refId} in code segment "${trimmedPart}".`);
        continue;
      }
      composition.push(refItem.id);
    } else {
      verboseWarnings.specialCodeSegment.add(`Warning: ID ${item.id} has special code segment "${trimmedPart}".`);
      composition.push(trimmedPart);
    }
  }

  return composition;
}

/**
 * @param {BlissItem[]} data
 * @param {Map<number, BlissItem>} lookupMap
 * @returns {{ id: number, bciAvId?: number, gloss: string, pos?: string, explanation?: string, isCharacter: boolean, composition?: (string | number)[] }[]}
 */
function transformItems(data, lookupMap) {
  return data.map(item => {
    if (!item.bciAvId) warnings.missingBciAvId.add(item.id);
    if (!item.pos) warnings.missingPos.add(item.id);
    if (!item.explanation) verboseWarnings.missingExplanation.add(item.id);

    /** @type {{ id: number, bciAvId?: number, gloss: string, pos?: string, explanation?: string, isCharacter: boolean, composition?: (string | number)[] }} */
    const outItem = {
      id: item.id,
      bciAvId: item.bciAvId ?? undefined,
      gloss: item.gloss,
      pos: item.pos ?? undefined,
      explanation: item.explanation ?? undefined,
      isCharacter: item.isChar
    };

    if (item.isChar === false) {
      outItem.composition = buildComposition(item, lookupMap);
    }

    return outItem;
  });
}

/**
 * @param {string} fileName
 * @param {object[]} data
 */
function writeOutput(fileName, data) {
  try {
    fs.writeFileSync(fileName, JSON.stringify(data, null, 2), "utf8");
  } catch {
    console.error(`Error: Failed to write to "${fileName}". Check directory permissions.`);
    process.exit(1);
  }
}

/**
 * @param {string} outputFile
 * @param {number} count
 * @param {boolean} verbose
 */
function printReport(outputFile, count, verbose) {
  console.log("\n=== Processing Report ===");
  console.log(`Report: Successfully processed ${count} records into ${outputFile}\n`);

  if (errors.missingCode.size > 0) {
    console.log(`\n=== Missing Code Report (Total: ${errors.missingCode.size}) ===`);
    errors.missingCode.forEach(msg => console.log(msg));
  }

  if (errors.missingIDReference.size > 0) {
    console.log(`\n=== Missing ID Reference Report (Total: ${errors.missingIDReference.size}) ===`);
    errors.missingIDReference.forEach(msg => console.log(msg));
  }

  if (errors.notACharacter.size > 0) {
    console.log(`\n=== Non-Character Reference Report (Total: ${errors.notACharacter.size}) ===`);
    errors.notACharacter.forEach(msg => console.log(msg));
  }

  const hasErrors = errors.missingCode.size > 0 || errors.missingIDReference.size > 0 || errors.notACharacter.size > 0;
  if (!hasErrors) {
    console.log("\nReport: No structural errors detected.");
  }

  if (warnings.missingBciAvId.size > 0) {
    console.log(`\nWarning: missing "bciAvId": ${warnings.missingBciAvId.size} items: ${[...warnings.missingBciAvId].join(", ")}`);
  }

  if (warnings.missingPos.size > 0) {
    console.log(`\nWarning: Items missing "pos" value: ${warnings.missingPos.size} items: ${[...warnings.missingPos].join(", ")}`);
  }

  if (verbose) {
    if (verboseWarnings.missingIsChar.size > 0) {
      console.log(`\nWarning: Items missing "isChar" key (defaulted to false): ${verboseWarnings.missingIsChar.size} items.`);
    }

    if (verboseWarnings.missingExplanation.size > 0) {
      console.log(`\nWarning: Items missing "explanation" value: ${verboseWarnings.missingExplanation.size} items: ${[...verboseWarnings.missingExplanation].join(", ")}`);
    }

    if (verboseWarnings.specialCodeSegment.size > 0) {
      console.log(`\n=== Special Code Segment Report (Total: ${verboseWarnings.specialCodeSegment.size}) ===`);
      verboseWarnings.specialCodeSegment.forEach(msg => console.log(msg));
    }
  }
}

const { inputFile, outputFile, verbose } = parseArgs(process.argv.slice(2));
const data = readInput(inputFile);
const lookupMap = buildLookupMap(data);
const outputData = transformItems(data, lookupMap);
writeOutput(outputFile, outputData);
printReport(outputFile, data.length, verbose);
