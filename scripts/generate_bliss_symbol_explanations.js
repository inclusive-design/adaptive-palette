/*
 * Usage:
 * node generate_bliss_symbol_explanations.js <inputFile.json> <outputFile.json>
 *
 * Example:
 * node generate_bliss_symbol_explanations.js data/bliss_dictionary_20260513.json ../public/data/bliss_symbol_explanations.json
 *
 * This script processes a JSON file containing linguistic derivation data and 
 * maps it into a new hierarchical structure used by this project. The original
 * data file is used by bliss-svg-builder: https://github.com/hlridge/bliss-svg-builder
 * and located at scripts/data/bliss_dictionary-20260513.json.
 * 
 * Operations:
 * 1. Field Mapping: Maps specified fields (e.g., `bciAvId` -> `id`, `isChar` -> 
 *    `isCharacter`, `gloss` -> `gloss`, `explanation` -> `explanation`).
 *    1.1 Fallbacks for missing `bciAvId`:
 *      - Top-level: Uses `"B" + item.id`.
 *      - `code`: Decomposes the code into its constituent parts.
 *    1.2 Fallback for missing `isChar`: defaults to `false`.
 * 2. Composition Generation: Recursively decomposes non-character items 
 *    (`isChar === false`) down to their base characters (`isChar === true`).
 * 3. Delimiters: Inserts ";" before IDs that fall into the provided indicator 
 *    ranges/lists, and "/" otherwise, dynamically flattening the array.
 * 
 * Manual operations after script execution:
 * 1. Add "pos" value "noun" to item with ID "B6437"
 * 2. Add "pos" value "expression" to item with ID "B6438"
 * 
 * Execution report:
 * Report: Successfully processed 6420 records into bliss_symbol_explanations.json
 * 
 * Warning: Top-level items missing "bciAvId" (fallback applied "B" + id): 9 items.
 * Warning: Items missing "isChar" key (defaulted to false): 296 items.
 * 
 * === Special Code Segment Report (Total: 249) ===
 * Warning: Top level ID 1170 has special code segment "RK:-2".
 * Warning: Top level ID 1179 has special code segment "RK:-2".
 * Warning: Top level ID 1180 has special code segment "RK:-2".
 * Warning: Top level ID 1197 has special code segment "RK:-2".
 * Warning: Top level ID 1227 has special code segment "RK:-2".
 * Warning: Top level ID 1228 has special code segment "RK:-2".
 * Warning: Top level ID 1230 has special code segment "RK:-2".
 * Warning: Top level ID 1231 has special code segment "RK:-2".
 * Warning: Top level ID 1251 has special code segment "RK:-2".
 * Warning: Top level ID 1268 has special code segment "RK:-2".
 * Warning: Top level ID 1281 has special code segment "RK:-2".
 * Warning: Top level ID 1282 has special code segment "RK:-2".
 * Warning: Top level ID 1375 has special code segment "RK:-2".
 * Warning: Top level ID 1468 has special code segment "RK:-2".
 * Warning: Top level ID 1474 has special code segment "RK:-2".
 * Warning: Top level ID 1475 has special code segment "RK:-2".
 * Warning: Top level ID 1659 has special code segment "RK:-2".
 * Warning: Top level ID 1738 has special code segment "RK:-2".
 * Warning: Top level ID 1776 has special code segment "RK:-2".
 * Warning: Top level ID 1785 has special code segment "RK:-2".
 * Warning: Top level ID 1805 has special code segment "RK:-2".
 * Warning: Top level ID 1818 has special code segment "RK:-2".
 * Warning: Top level ID 1819 has special code segment "RK:-2".
 * Warning: Top level ID 1838 has special code segment "RK:-2".
 * Warning: Top level ID 1844 has special code segment "RK:-2".
 * Warning: Top level ID 1859 has special code segment "RK:-2".
 * Warning: Top level ID 1896 has special code segment "RK:-2".
 * Warning: Top level ID 2075 has special code segment "RK:-2".
 * Warning: Top level ID 2125 has special code segment "RK:-2".
 * Warning: Top level ID 2126 has special code segment "RK:-2".
 * Warning: Top level ID 2132 has special code segment "RK:-2".
 * Warning: Top level ID 2135 has special code segment "RK:-2".
 * Warning: Top level ID 2162 has special code segment "RK:-2".
 * Warning: Top level ID 2169 has special code segment "RK:-2".
 * Warning: Top level ID 2170 has special code segment "RK:-2".
 * Warning: Top level ID 2172 has special code segment "RK:-2".
 * Warning: Top level ID 2173 has special code segment "RK:-2".
 * Warning: Top level ID 2217 has special code segment "RK:-2".
 * Warning: Top level ID 2223 has special code segment "RK:-2".
 * Warning: Top level ID 2261 has special code segment "RK:-2".
 * Warning: Top level ID 2262 has special code segment "RK:-2".
 * Warning: Top level ID 2332 has special code segment "RK:-2".
 * Warning: Top level ID 2362 has special code segment "RK:-2".
 * Warning: Top level ID 2399 has special code segment "RK:-2".
 * Warning: Top level ID 2400 has special code segment "RK:-2".
 * Warning: Top level ID 2456 has special code segment "RK:-2".
 * Warning: Top level ID 2543 has special code segment "RK:-2".
 * Warning: Top level ID 2548 has special code segment "RK:-2".
 * Warning: Top level ID 2561 has special code segment "RK:-2".
 * Warning: Top level ID 2565 has special code segment "RK:-2".
 * Warning: Top level ID 2571 has special code segment "RK:-2".
 * Warning: Top level ID 2584 has special code segment "RK:-2".
 * Warning: Top level ID 2626 has special code segment "RK:-2".
 * Warning: Top level ID 2763 has special code segment "RK:-2".
 * Warning: Top level ID 2857 has special code segment "XA".
 * Warning: Top level ID 2857 has special code segment "XL".
 * Warning: Top level ID 2857 has special code segment "XH".
 * Warning: Top level ID 2920 has special code segment "RK:-2".
 * Warning: Top level ID 2921 has special code segment "RK:-2".
 * Warning: Top level ID 2943 has special code segment "RK:-2".
 * Warning: Top level ID 2944 has special code segment "RK:-2".
 * Warning: Top level ID 2962 has special code segment "RK:-2".
 * Warning: Top level ID 2963 has special code segment "RK:-2".
 * Warning: Top level ID 3054 has special code segment "RK:-2".
 * Warning: Top level ID 3083 has special code segment "RK:-2".
 * Warning: Top level ID 3366 has special code segment "RK:-2".
 * Warning: Top level ID 3446 has special code segment "Xa".
 * Warning: Top level ID 3446 has special code segment "Xb".
 * Warning: Top level ID 3446 has special code segment "Xc".
 * Warning: Top level ID 3568 has special code segment "RK:-2".
 * Warning: Top level ID 3569 has special code segment "RK:-2".
 * Warning: Top level ID 3633 has special code segment "RK:-2".
 * Warning: Top level ID 3634 has special code segment "RK:-2".
 * Warning: Top level ID 3674 has special code segment "RK:-2".
 * Warning: Top level ID 3690 has special code segment "RK:-2".
 * Warning: Top level ID 3710 has special code segment "RK:-2".
 * Warning: Top level ID 3730 has special code segment "RK:-2".
 * Warning: Top level ID 3733 has special code segment "RK:-2".
 * Warning: Top level ID 3744 has special code segment "RK:-2".
 * Warning: Top level ID 3795 has special code segment "Xa".
 * Warning: Top level ID 3795 has special code segment "Xb".
 * Warning: Top level ID 3795 has special code segment "Xc".
 * Warning: Top level ID 3796 has special code segment "Xa".
 * Warning: Top level ID 3796 has special code segment "Xb".
 * Warning: Top level ID 3796 has special code segment "Xc".
 * Warning: Top level ID 3796 has special code segment "RK:-7".
 * Warning: Top level ID 3796 has special code segment "RK:3".
 * Warning: Top level ID 3838 has special code segment "Xa".
 * Warning: Top level ID 3838 has special code segment "Xb".
 * Warning: Top level ID 3838 has special code segment "Xc".
 * Warning: Top level ID 3839 has special code segment "Xa".
 * Warning: Top level ID 3839 has special code segment "Xb".
 * Warning: Top level ID 3839 has special code segment "Xc".
 * Warning: Top level ID 3840 has special code segment "Xa".
 * Warning: Top level ID 3840 has special code segment "Xb".
 * Warning: Top level ID 3840 has special code segment "Xc".
 * Warning: Top level ID 3841 has special code segment "Xa".
 * Warning: Top level ID 3841 has special code segment "Xb".
 * Warning: Top level ID 3841 has special code segment "Xc".
 * Warning: Top level ID 3842 has special code segment "Xa".
 * Warning: Top level ID 3842 has special code segment "Xb".
 * Warning: Top level ID 3842 has special code segment "Xc".
 * Warning: Top level ID 3856 has special code segment "RK:-2".
 * Warning: Top level ID 3865 has special code segment "RK:-2".
 * Warning: Top level ID 3880 has special code segment "Xa".
 * Warning: Top level ID 3880 has special code segment "Xb".
 * Warning: Top level ID 3880 has special code segment "Xc".
 * Warning: Top level ID 3896 has special code segment "RK:-2".
 * Warning: Top level ID 3910 has special code segment "RK:-2".
 * Warning: Top level ID 3918 has special code segment "RK:-2".
 * Warning: Top level ID 3919 has special code segment "RK:-2".
 * Warning: Top level ID 3930 has special code segment "RK:-2".
 * Warning: Top level ID 3931 has special code segment "RK:-2".
 * Warning: Top level ID 3938 has special code segment "Xa".
 * Warning: Top level ID 3938 has special code segment "Xb".
 * Warning: Top level ID 3938 has special code segment "Xc".
 * Warning: Top level ID 3938 has special code segment "RK:-7".
 * Warning: Top level ID 3938 has special code segment "RK:3".
 * Warning: Top level ID 3943 has special code segment "RK:-2".
 * Warning: Top level ID 3951 has special code segment "Xa".
 * Warning: Top level ID 3951 has special code segment "Xb".
 * Warning: Top level ID 3951 has special code segment "Xc".
 * Warning: Top level ID 3976 has special code segment "RK:-2".
 * Warning: Top level ID 4090 has special code segment "RK:-2".
 * Warning: Top level ID 4164 has special code segment "RK:-2".
 * Warning: Top level ID 4167 has special code segment "RK:-2".
 * Warning: Top level ID 4171 has special code segment "RK:-2".
 * Warning: Top level ID 4172 has special code segment "RK:-2".
 * Warning: Top level ID 4194 has special code segment "RK:-2".
 * Warning: Top level ID 4197 has special code segment "RK:-2".
 * Warning: Top level ID 4222 has special code segment "RK:-2".
 * Warning: Top level ID 4268 has special code segment "RK:-2".
 * Warning: Top level ID 4270 has special code segment "RK:-2".
 * Warning: Top level ID 4277 has special code segment "RK:-2".
 * Warning: Top level ID 4296 has special code segment "RK:-2".
 * Warning: Top level ID 4297 has special code segment "RK:-2".
 * Warning: Top level ID 4330 has special code segment "RK:-2".
 * Warning: Top level ID 4336 has special code segment "RK:-2".
 * Warning: Top level ID 4342 has special code segment "RK:-2".
 * Warning: Top level ID 4391 has special code segment "RK:-2".
 * Warning: Top level ID 4436 has special code segment "RK:-2".
 * Warning: Top level ID 4464 has special code segment "RK:-2".
 * Warning: Top level ID 4496 has special code segment "RK:-2".
 * Warning: Top level ID 4498 has special code segment "RK:-2".
 * Warning: Top level ID 4499 has special code segment "RK:-2".
 * Warning: Top level ID 4529 has special code segment "RK:-2".
 * Warning: Top level ID 4538 has special code segment "RK:-2".
 * Warning: Top level ID 4599 has special code segment "RK:-2".
 * Warning: Top level ID 4620 has special code segment "RK:-2".
 * Warning: Top level ID 4629 has special code segment "RK:-2".
 * Warning: Top level ID 4630 has special code segment "RK:-2".
 * Warning: Top level ID 4637 has special code segment "RK:-2".
 * Warning: Top level ID 4647 has special code segment "RK:-2".
 * Warning: Top level ID 4663 has special code segment "RK:-2".
 * Warning: Top level ID 4746 has special code segment "RK:-2".
 * Warning: Top level ID 4747 has special code segment "RK:-2".
 * Warning: Top level ID 4749 has special code segment "RK:-2".
 * Warning: Top level ID 4801 has special code segment "RK:-2".
 * Warning: Top level ID 4836 has special code segment "RK:-2".
 * Warning: Top level ID 4837 has special code segment "RK:-2".
 * Warning: Top level ID 4905 has special code segment "RK:-2".
 * Warning: Top level ID 4940 has special code segment "RK:-2".
 * Warning: Top level ID 4941 has special code segment "RK:-2".
 * Warning: Top level ID 4942 has special code segment "RK:-2".
 * Warning: Top level ID 4942 has special code segment "XM".
 * Warning: Top level ID 5038 has special code segment "RK:-2".
 * Warning: Top level ID 5063 has special code segment "Xa".
 * Warning: Top level ID 5063 has special code segment "Xb".
 * Warning: Top level ID 5063 has special code segment "Xc".
 * Warning: Top level ID 5124 has special code segment "RK:-2".
 * Warning: Top level ID 5157 has special code segment "XS".
 * Warning: Top level ID 5160 has special code segment "RK:-2".
 * Warning: Top level ID 5183 has special code segment "XD".
 * Warning: Top level ID 5183 has special code segment "XE".
 * Warning: Top level ID 5183 has special code segment "XU".
 * Warning: Top level ID 5184 has special code segment "XD".
 * Warning: Top level ID 5184 has special code segment "XE".
 * Warning: Top level ID 5184 has special code segment "XU".
 * Warning: Top level ID 5185 has special code segment "XT".
 * Warning: Top level ID 5185 has special code segment "XH".
 * Warning: Top level ID 5185 has special code segment "XA".
 * Warning: Top level ID 5186 has special code segment "XR".
 * Warning: Top level ID 5186 has special code segment "XO".
 * Warning: Top level ID 5186 has special code segment "XU".
 * Warning: Top level ID 5188 has special code segment "XD".
 * Warning: Top level ID 5188 has special code segment "XE".
 * Warning: Top level ID 5188 has special code segment "XU".
 * Warning: Top level ID 5189 has special code segment "XR".
 * Warning: Top level ID 5189 has special code segment "XO".
 * Warning: Top level ID 5189 has special code segment "XU".
 * Warning: Top level ID 5190 has special code segment "XR".
 * Warning: Top level ID 5190 has special code segment "XO".
 * Warning: Top level ID 5190 has special code segment "XU".
 * Warning: Top level ID 5192 has special code segment "XT".
 * Warning: Top level ID 5192 has special code segment "XH".
 * Warning: Top level ID 5192 has special code segment "XA".
 * Warning: Top level ID 5193 has special code segment "XT".
 * Warning: Top level ID 5193 has special code segment "XH".
 * Warning: Top level ID 5193 has special code segment "XA".
 * Warning: Top level ID 5209 has special code segment "RK:-2".
 * Warning: Top level ID 5212 has special code segment "RK:-2".
 * Warning: Top level ID 5215 has special code segment "RK:-2".
 * Warning: Top level ID 5224 has special code segment "RK:-2".
 * Warning: Top level ID 5242 has special code segment "RK:-2".
 * Warning: Top level ID 5255 has special code segment "RK:-2".
 * Warning: Top level ID 5256 has special code segment "RK:-2".
 * Warning: Top level ID 5257 has special code segment "RK:-2".
 * Warning: Top level ID 5275 has special code segment "RK:-2".
 * Warning: Top level ID 5332 has special code segment "RK:-2".
 * Warning: Top level ID 5338 has special code segment "RK:-2".
 * Warning: Top level ID 5339 has special code segment "RK:-2".
 * Warning: Top level ID 5340 has special code segment "RK:-2".
 * Warning: Top level ID 5367 has special code segment "RK:-2".
 * Warning: Top level ID 5373 has special code segment "RK:-2".
 * Warning: Top level ID 5374 has special code segment "RK:-2".
 * Warning: Top level ID 5375 has special code segment "RK:-2".
 * Warning: Top level ID 5402 has special code segment "RK:-2".
 * Warning: Top level ID 5500 has special code segment "XL".
 * Warning: Top level ID 5500 has special code segment "XA".
 * Warning: Top level ID 5500 has special code segment "XT".
 * Warning: Top level ID 5501 has special code segment "XL".
 * Warning: Top level ID 5501 has special code segment "XA".
 * Warning: Top level ID 5501 has special code segment "XT".
 * Warning: Top level ID 5502 has special code segment "XL".
 * Warning: Top level ID 5502 has special code segment "XA".
 * Warning: Top level ID 5502 has special code segment "XT".
 * Warning: Top level ID 5668 has special code segment "RK:-2".
 * Warning: Top level ID 5695 has special code segment "RK:-2".
 * Warning: Top level ID 5725 has special code segment "RK:-2".
 * Warning: Top level ID 5726 has special code segment "RK:-2".
 * Warning: Top level ID 5727 has special code segment "RK:-2".
 * Warning: Top level ID 5749 has special code segment "RK:-2".
 * Warning: Top level ID 5761 has special code segment "RK:-2".
 * Warning: Top level ID 5790 has special code segment "RK:-2".
 * Warning: Top level ID 5805 has special code segment "RK:1".
 * Warning: Top level ID 5816 has special code segment "RK:-2".
 * Warning: Top level ID 5829 has special code segment "RK:-2".
 * Warning: Top level ID 5830 has special code segment "RK:-2".
 * Warning: Top level ID 5847 has special code segment "RK:-2".
 * Warning: Top level ID 5889 has special code segment "RK:-2".
 * Warning: Top level ID 5921 has special code segment "RK:-2".
 * Warning: Top level ID 5982 has special code segment "RK:-2".
 * Warning: Top level ID 5988 has special code segment "RK:-2".
 * Warning: Top level ID 6297 has special code segment "RK:-2".
 * Warning: Top level ID 6298 has special code segment "RK:-2".
 * Warning: Top level ID 6311 has special code segment "RK:-2".
 * Warning: Top level ID 6318 has special code segment "XOH".
 * Warning: Top level ID 6319 has special code segment "XOH".
 * Warning: Top level ID 6368 has special code segment "RK:-2".
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
  missingTopBciAvId: new Set(),
  missingIsChar: new Set(),
  missingBPrefix: new Set(),
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

      // Verify item exists and has a valid bciAvId
      if (refItem && refItem.bciAvId !== undefined && refItem.bciAvId !== null) {
        // Prevent infinite loops
        if (visited.has(refId)) {
          reports.circularDependency.add(`Error: Circular dependency detected involving ID ${refId}.`);
          composition.push(trimmedPart); // Keep original token as fallback
          continue;
        }

        if (refItem.isChar === true) {
          composition.push(refItem.bciAvId);
        } else {
          // If the reference is not a character, recursively decompose it
          // Pass a cloned Set to allow valid parallel branches
          const subComp = decompose(refItem, new Set(visited));
          composition.push(...subComp);
        }
      } else {
        // Fallback: If `bciAvId` is not found, keep using the original blissary builder ID
        composition.push(trimmedPart);
      }
    } else {
      // Fallback: If it starts with "B" but contains other invalid characters (e.g. B12A)
      reports.missingBPrefix.add(`Warning: Top level ID ${item.id} has special code segment "${trimmedPart}".`);
      composition.push(trimmedPart);
    }
  }

  return composition;
}

const outputData = data.map(item => {
  // Top level Output ID fallback logic
  let outId;
  if (item.bciAvId !== undefined && item.bciAvId !== null) {
    outId = item.bciAvId.toString();
  } else {
    outId = "B" + item.id;
    reports.missingTopBciAvId.add(item.id);
  }

  if (!item.pos) {
    reports.missingPos.add(item.id);
  }

  if (!item.explanation) {
    reports.missingExplanation.add(item.id);
  }

  /** @type {{ id: string, gloss: string, pos?: string, explanation?: string, isCharacter: boolean, composition?: (string | number)[] }} */
  const outItem = {
    id: outId,
    gloss: item.gloss,
    pos: item.pos,
    explanation: item.explanation,
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

if (reports.missingTopBciAvId.size > 0) {
  console.log(`Warning: Top-level items missing "bciAvId" (fallback applied "B" + id): ${reports.missingTopBciAvId.size} items: ${[...reports.missingTopBciAvId].join(", ")}`);
} else {
  console.log("Report: No Top-level items missing \"bciAvId\".");
}

if (reports.missingIsChar.size > 0) {
  console.log(`Warning: Items missing "isChar" key (defaulted to false): ${reports.missingIsChar.size} items.`);
}

if (reports.missingBPrefix.size > 0) {
  console.log(`\n=== Special Code Segment Report (Total: ${reports.missingBPrefix.size}) ===`);
  reports.missingBPrefix.forEach(msg => console.log(msg));
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

if (reports.missingBPrefix.size === 0 && reports.circularDependency.size === 0) {
  console.log("\nReport: No data structural errors detected.");
}
