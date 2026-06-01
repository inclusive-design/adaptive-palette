/*
 * Usage:
 * node generate_bliss_symbol_explanations.js <inputFile.json> <outputFile.json>
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
 *     `code` -> decomposes the code into `composition`).
 *    1.1 Fallback for missing `isChar`: defaults to `false`.
 * 2. Composition Generation: Recursively decomposes non-character items 
 *    (`isChar === false`) down to their base characters (`isChar === true`).
 * 3. Delimiters: Inserts ";" before IDs that fall into the provided indicator 
 *    ranges/lists, and "/" otherwise, dynamically flattening the array.
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

const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error("Error: Invalid arguments.");
  console.error("Usage: node generate_bliss_symbol_explanations.js <inputFile.json> <outputFile.json>");
  process.exit(1);
}

const [inputFileName, outputFileName] = args;

// Tracking Reports
const reports = {
  missingBciAvId: new Set(),
  missingIsChar: new Set(),
  missingBPrefix: new Set(),
  missingIDReference: new Set(),
  missingPos: new Set(),
  missingExplanation: new Set(),
  circularDependency: new Set()
};

// Read Input File
let rawData;
try {
  rawData = fs.readFileSync(inputFileName, "utf8");
} catch {
  console.error(`Error: Failed to read "${inputFileName}". Make sure the file exists.`);
  process.exit(1);
}

// JSON.parse always returns any. The JSDoc cast on the declaration line doesn't
// fix the linting error "@typescript-eslint/no-unsafe-assignment". So disable
// that specific linting rule for this line.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const parsed = /** @type {{ data: BlissItem[] }} */ (JSON.parse(rawData));
/** @type {BlissItem[]} */
const data = parsed.data;

// Pass 1: Build a Lookup Map by Top-Level `id`
/** @type {Map<number, BlissItem>} */
const topLevelIdMap = new Map();
data.forEach(item => {
  // Default isChar if missing
  if (!Object.prototype.hasOwnProperty.call(item, "isChar") || item.isChar === null) {
    item.isChar = false;
    reports.missingIsChar.add(item.id);
  }

  // Storing items mapped by their numerical top-level id
  topLevelIdMap.set(Number(item.id), item);
});

// Pass 2: Transformation & Code Decomposition
/**
 * @param {BlissItem} item
 * @param {Set<number>} visited
 * @returns {(string | number)[]}
 */
function decompose(item, visited) {
  visited.add(Number(item.id));

  if (!item.code) return [];

  // Split by "/" or ";" while keeping the separators in the resulting array
  const parts = item.code.split(/([/;])/);
  let composition = [];

  for (const part of parts) {
    if (part === "/" || part === ";") {
      composition.push(part);
      continue;
    }

    const trimmedPart = part.trim();
    if (!trimmedPart) continue;

    // Extract numerical ID from tokens like "B839"
    const match = trimmedPart.match(/^B(\d+)$/);
    if (match) {
      const refId = parseInt(match[1], 10);
      const refItem = topLevelIdMap.get(refId);

      // Verify item exists and has a valid ID reference
      if (refItem) {
        // Prevent infinite loops
        if (visited.has(refId)) {
          reports.circularDependency.add(`Error: Circular dependency detected involving ID ${refId}.`);
          continue;
        }

        if (refItem.isChar === true) {
          composition.push(refItem.id);
        } else {
          // If the reference is not a character, recursively decompose it
          // Pass a cloned Set to allow valid parallel branches
          const subComp = decompose(refItem, new Set(visited));
          composition.push(...subComp);
        }
      } else {
        reports.missingIDReference.add(`Error: ID ${item.id} references missing ID ${refId} in code segment "${trimmedPart}".`);
      }
    } else {
      // Fallback: If it starts with "B" but contains other invalid characters (e.g. B12A)
      reports.missingBPrefix.add(`Warning: ID ${item.id} has special code segment "${trimmedPart}".`);
      composition.push(trimmedPart);
    }
  }

  return composition;
}

const outputData = data.map(item => {
  if (!item.bciAvId) {
    reports.missingBciAvId.add(item.id);
  }

  if (!item.pos) {
    reports.missingPos.add(item.id);
  }

  if (!item.explanation) {
    reports.missingExplanation.add(item.id);
  }

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
    outItem.composition = decompose(item, new Set());
  }

  return outItem;
});

// Pass 3: Write Output File
try {
  fs.writeFileSync(outputFileName, JSON.stringify(outputData, null, 2), "utf8");
} catch {
  console.error(`Error: Failed to write to "${outputFileName}". Check directory permissions.`);
  process.exit(1);
}

// 7. Output Reports
console.log("\n=== Processing Report ===");
console.log(`Report: Successfully processed ${data.length} records into ${outputFileName}\n`);

if (reports.missingIsChar.size > 0) {
  console.log(`\nWarning: Items missing "isChar" key (defaulted to false): ${reports.missingIsChar.size} items.`);
}

if (reports.missingBPrefix.size > 0) {
  console.log(`\n=== Special Code Segment Report (Total: ${reports.missingBPrefix.size}) ===`);
  reports.missingBPrefix.forEach(msg => console.log(msg));
}

if (reports.missingBPrefix.size === 0 && reports.circularDependency.size === 0 && reports.missingIDReference.size === 0) {
  console.log("\nReport: No data structural errors detected.");
}

if (reports.missingPos.size > 0) {
  console.log(`\nWarning: Items missing "pos" value: ${reports.missingPos.size} items: ${[...reports.missingPos].join(", ")}`);
}

if (reports.missingExplanation.size > 0) {
  console.log(`\nWarning: Items missing "explanation" value: ${reports.missingExplanation.size} items: ${[...reports.missingExplanation].join(", ")}`);
}

if (reports.circularDependency.size > 0) {
  console.log(`\n=== Circular Dependency Report (Total: ${reports.circularDependency.size}) ===`);
  reports.circularDependency.forEach(msg => console.log(msg));
}

if (reports.missingIDReference.size > 0) {
  console.log(`\n=== Missing ID Reference Report (Total: ${reports.missingIDReference.size}) ===`);
  reports.missingIDReference.forEach(msg => console.log(msg));
}

if (reports.missingBciAvId.size > 0) {
  console.log(`\nWarning: missing "bciAvId": ${reports.missingBciAvId.size} items: ${[...reports.missingBciAvId].join(", ")}`);
}
