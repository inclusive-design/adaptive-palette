/*
 * Usage:
 * node generate_bliss_symbol_explanations.js <inputFile.json> <outputFile.json> [bciAv.csv] [--verbose]
 *
 * Example:
 * node generate_bliss_symbol_explanations.js data/bliss_dictionary_20260827.json ../public/data/bliss_symbol_explanations.json ../docs/design/BCI-AV.csv
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
 *     `isIndicator` -> `isIndicator` (kept only when true), `code` -> parses the code
 *     into `composition`).
 *    1.1 Fallback for missing `isChar`: defaults to `false`.
 * 2. Composition Generation: Parses `item.code` directly for non-character items
 *    (`isChar === false`) — `B`-prefixed IDs are resolved to character IDs.
 *    Separators (`/` and `;`) are preserved as strings.
 * 3. Swedish gloss: with a BCI-AV CSV file, each item whose `bciAvId` has a Swedish entry
 *    gets `glossSv`, cleaned like `gloss` (underscores to spaces, ", " between senses).
 *
 * 4. Output: rewrites only the `data` array of the existing output file. Its `license` and
 *    `attribution` sections are preserved untouched.
 *
 * Reporting (use --verbose for full output):
 * - Errors (always shown): null required fields, missing code, missing ID references,
 *     non-character references
 * - Warnings (always shown): missing bciAvId, missing pos, items with no Swedish gloss (with a CSV)
 * - Verbose-only (--verbose): special code segments, missing isChar, missing explanation
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
 *   isIndicator?: boolean,
 *   code?: string
 * }} BlissItem
 */

const errors = {
  nullRequiredField: new Set(),
  missingCode: new Set(),
  missingIDReference: new Set(),
  notACharacter: new Set()
};
const warnings = {
  missingBciAvId: new Set(),
  missingPos: new Set(),
  missingSwedish: new Set()
};
const verboseWarnings = {
  specialCodeSegment: new Set(),
  missingIsChar: new Set(),
  missingExplanation: new Set()
};

/**
 * Parse input arguments and return structured parameters.
 * @param {string[]} argv
 * @returns {{ inputFile: string, outputFile: string, bciAvFile?: string, verbose: boolean }}
 */
function parseArgs(argv) {
  const verbose = argv.includes("--verbose");
  const positional = argv.filter(a => a !== "--verbose");
  if (positional.length < 2 || positional.length > 3) {
    console.error("Error: Invalid arguments.");
    console.error("Usage: node generate_bliss_symbol_explanations.js <inputFile.json> <outputFile.json> [bciAv.csv] [--verbose]");
    process.exit(1);
  }
  const [inputFile, outputFile, bciAvFile] = positional;
  return { inputFile, outputFile, bciAvFile, verbose };
}

/**
 * Read and parse the input JSON file, returning an array of BlissItem objects.
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
  try {
    const parsed = /** @type {{ data: BlissItem[] }} */ (JSON.parse(rawData));
    return parsed.data;
  }
  catch {
    console.error(`Error: Failed to parse "${fileName}". Make sure the file is valid JSON.`);
    process.exit(1);
  }
}

/**
 * Split CSV text into rows of fields. A quoted field may hold commas, line breaks and
 * doubled quotes.
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === "\"" && text[i + 1] === "\"") {
        field += "\"";
        i++;
      } else if (char === "\"") {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === "\"") {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * A Swedish gloss written like the English ones: underscores to spaces, one space after each
 * comma. `undefined` when nothing is left.
 * @param {string} raw - The CSV cell.
 * @returns {string | undefined}
 */
export function cleanSwedishGloss(raw) {
  const senses = raw.replace(/_/g, " ").split(",")
    .map(sense => sense.trim().replace(/\s+/g, " "))
    .filter(sense => sense.length > 0);
  const gloss = senses.join(", ");
  return /[\p{L}\p{N}]/u.test(gloss) ? gloss : undefined;
}

/**
 * The Swedish gloss for each BCI-AV id in the CSV. Rows with an empty Swedish cell are left out.
 * @param {string} csvText
 * @returns {Map<number, string>}
 */
export function swedishGlossesById(csvText) {
  const [header, ...rows] = parseCsv(csvText.replace(/^\uFEFF/, ""));
  const idColumn = header.indexOf("BCI-AV#");
  const swedishColumn = header.indexOf("Swedish");
  if (idColumn === -1 || swedishColumn === -1) {
    throw new Error("The BCI-AV file needs \"BCI-AV#\" and \"Swedish\" columns.");
  }
  const glosses = new Map();
  for (const row of rows) {
    const gloss = cleanSwedishGloss(row[swedishColumn] ?? "");
    if (gloss) {
      glosses.set(Number(row[idColumn]), gloss);
    }
  }
  return glosses;
}

/**
 * The item with `glossSv` right after `gloss`, when its `bciAvId` has a Swedish gloss.
 * @param {{ id: number, bciAvId?: number, gloss: string }} item
 * @param {Map<number, string>} swedishById
 * @returns {object}
 */
export function withSwedishGloss(item, swedishById) {
  const { id, bciAvId, gloss, ...rest } = item;
  const glossSv = bciAvId ? swedishById.get(bciAvId) : undefined;
  return glossSv ? { id, bciAvId, gloss, glossSv, ...rest } : { id, bciAvId, gloss, ...rest };
}

/**
 * Build a lookup map from ID to BlissItem for easy reference during composition parsing.
 * This also checks for missing "isChar" keys and defaults them to false, while logging a warning.
 * @param {BlissItem[]} data
 * @returns {Map<number, BlissItem>}
 */
function buildLookupMap(data) {
  /** @type {Map<number, BlissItem>} */
  const map = new Map();
  data.forEach(item => {
    if (!Object.prototype.hasOwnProperty.call(item, "isChar")) {
      item.isChar = false;
      verboseWarnings.missingIsChar.add(item.id);
    } else if (item.isChar === null) {
      item.isChar = false;
      errors.nullRequiredField.add(`Error: ID ${item.id} has a null "isChar"; defaulted to false.`);
    }
    map.set(Number(item.id), item);
  });
  return map;
}

/**
 * Parse the `code` field of a non-character item to build its composition array.
 * - `B`-prefixed segments are resolved to character IDs using the lookup map.
 * - Separators (`/` and `;`) are preserved as strings in the composition array.
 * - Logs errors for missing code, missing ID references, and non-character references.
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
 * Report a null value in any field the output type declares non-null. A missing "isChar" key is
 * handled in buildLookupMap; only a present-but-null value counts as an error.
 * @param {BlissItem} item
 */
function checkRequiredFields(item) {
  if (item.id === null) {
    errors.nullRequiredField.add(`Error: an item has a null "id" (gloss: "${item.gloss}").`);
  }
  if (item.gloss === null) {
    errors.nullRequiredField.add(`Error: ID ${item.id} has a null "gloss".`);
  }
}

/**
 * Transform the input data array into the desired output structure, while performing error and warning checks.
 * @param {BlissItem[]} data
 * @param {Map<number, BlissItem>} lookupMap
 * @param {Map<number, string>} [swedishById]
 * @returns {{ id: number, bciAvId?: number, gloss: string, glossSv?: string, pos?: string, explanation?: string, isCharacter: boolean, isIndicator?: boolean, composition?: (string | number)[] }[]}
 */
function transformItems(data, lookupMap, swedishById) {
  return data.map(item => {
    checkRequiredFields(item);
    if (!item.bciAvId) warnings.missingBciAvId.add(item.id);
    if (!item.pos) warnings.missingPos.add(item.id);
    if (!item.explanation) verboseWarnings.missingExplanation.add(item.id);

    /** @type {{ id: number, bciAvId?: number, gloss: string, glossSv?: string, pos?: string, explanation?: string, isCharacter: boolean, isIndicator?: boolean, composition?: (string | number)[] }} */
    const outItem = {
      id: item.id,
      bciAvId: item.bciAvId ?? undefined,
      gloss: item.gloss,
      pos: item.pos ?? undefined,
      explanation: item.explanation ?? undefined,
      isCharacter: item.isChar
    };

    if (item.isIndicator === true) outItem.isIndicator = true;

    if (item.isChar === false) {
      outItem.composition = buildComposition(item, lookupMap);
    }

    if (swedishById && !swedishById.has(item.bciAvId)) warnings.missingSwedish.add(item.id);
    return swedishById ? withSwedishGloss(outItem, swedishById) : outItem;
  });
}

/**
 * Replace the "data" array of the existing output file, preserving its "license" and
 * "attribution" sections. The output file must already exist and parse; the script does not
 * invent a wrapper.
 * @param {string} fileName
 * @param {object[]} data
 */
function writeOutput(fileName, data) {
  let existing;
  try {
    existing = JSON.parse(fs.readFileSync(fileName, "utf8"));
  } catch {
    console.error(`Error: Failed to read or parse the existing "${fileName}". Regeneration updates the "data" section of that file, so it must exist and be valid JSON.`);
    process.exit(1);
  }

  try {
    fs.writeFileSync(fileName, JSON.stringify({ ...existing, data }, null, 2), "utf8");
  } catch {
    console.error(`Error: Failed to write to "${fileName}". Check directory permissions.`);
    process.exit(1);
  }
}

/**
 * Print a report of the processing results, including any errors or warnings.
 * @param {string} outputFile
 * @param {number} count
 * @param {boolean} verbose
 */
function printReport(outputFile, count, verbose) {
  console.log("\n=== Processing Report ===");
  console.log(`Report: Successfully processed ${count} records into ${outputFile}`);

  if (errors.nullRequiredField.size > 0) {
    console.log(`\n=== Null Required Field Report (Total: ${errors.nullRequiredField.size}) ===`);
    errors.nullRequiredField.forEach(msg => console.log(msg));
  }

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

  const hasErrors = errors.nullRequiredField.size > 0 || errors.missingCode.size > 0 || errors.missingIDReference.size > 0 || errors.notACharacter.size > 0;
  if (!hasErrors) {
    console.log("\nReport: No structural errors detected.");
  }

  if (warnings.missingBciAvId.size > 0) {
    console.log(`\nWarning: missing "bciAvId": ${warnings.missingBciAvId.size} items: ${[...warnings.missingBciAvId].join(", ")}`);
  }

  if (warnings.missingPos.size > 0) {
    console.log(`\nWarning: Items missing "pos" value: ${warnings.missingPos.size} items: ${[...warnings.missingPos].join(", ")}`);
  }

  if (warnings.missingSwedish.size > 0) {
    console.log(`\nWarning: Items with no Swedish gloss: ${warnings.missingSwedish.size} items: ${[...warnings.missingSwedish].join(", ")}`);
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

/**
 * Read the BCI-AV CSV and index its Swedish glosses, or exit with a message.
 * @param {string} fileName
 * @returns {Map<number, string>}
 */
function readSwedishGlosses(fileName) {
  try {
    return swedishGlossesById(fs.readFileSync(fileName, "utf8"));
  } catch (error) {
    console.error(`Error: Failed to read "${fileName}": ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  const { inputFile, outputFile, bciAvFile, verbose } = parseArgs(process.argv.slice(2));
  const data = readInput(inputFile);
  const lookupMap = buildLookupMap(data);
  const swedishById = bciAvFile ? readSwedishGlosses(bciAvFile) : undefined;
  const outputData = transformItems(data, lookupMap, swedishById);
  writeOutput(outputFile, outputData);
  printReport(outputFile, data.length, verbose);
}
