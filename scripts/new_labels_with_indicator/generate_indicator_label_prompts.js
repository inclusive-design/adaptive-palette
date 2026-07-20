/*
 * Usage:
 * node generate_indicator_label_prompts.js <blissWordsFile.json> <indicatorsFile.json> <outputFile.jsonl> [--verbose]
 *
 * Example:
 * node generate_indicator_label_prompts.js ../../public/data/bliss_symbol_explanations.json \
 *   ../../public/data/indicators.json ../data/new_labels_with_indicator_prompts.jsonl
 *
 * Reads Bliss word data and the curated indicator table (../../public/data/indicators.json), and for
 * every word whose `pos` matches an indicator's group (see GROUP_TO_POS), emits one prompt
 * row asking a language model for the word's new label under that indicator.
 *
 * Output is JSONL: the first line is a `_meta` row carrying the shared system prompt; every
 * subsequent line is one { targetId, wordId, gloss, pos, indicatorCode, indicatorName, prompt }
 */

import fs from "fs";

const GROUP_TO_POS = {
  "Nominal": ["noun", "person"],
  "Not planned for Unicode": ["noun", "person"],
  "Verbal": ["action"],
  "Adjectival": ["description"]
};

const SYSTEM_PROMPT = `You are a linguistic assistant for Bliss, a symbol-based AAC language. A Bliss word carries a base meaning; a Bliss "indicator" is a grammatical marker applied to that word to shift its part of speech or grammatical form (tense, number, voice, mood, etc). Given a base word and an indicator, output the single resulting label in English: one word if possible, otherwise the shortest natural short phrase.

Examples:
Word "ability" (noun) + indicator "plural" -> abilities
Word "ability" (noun) + indicator "third person" -> their abilities
Word "hammer" (noun) + indicator "action" -> to hammer
Word "walk" (action) + indicator "past action" -> walked
Word "able" (description) + indicator "adverb" -> ably

Respond with ONLY the resulting label. No punctuation, no quotation marks, no explanation, no preamble, no restating the word.`;

/**
 * Strip the "INDICATOR " prefix and lowercase, e.g. "INDICATOR PLURAL" -> "plural".
 * @param {string} name
 * @returns {string}
 */
function toIndicatorName(name) {
  return name.replace(/^INDICATOR\s+/i, "").toLowerCase();
}

/**
 * Build the per-pair user prompt for a word + indicator.
 * @param {{gloss: string, pos: string, explanation?: string}} word
 * @param {{indicatorName: string, purpose: string}} indicator
 * @returns {string}
 */
function buildPrompt(word, indicator) {
  const header = word.explanation
    ? `Word: "${word.gloss}" (${word.pos}). Meaning: ${word.explanation}`
    : `Word: "${word.gloss}" (${word.pos}).`;
  return `${header}\nIndicator: ${indicator.indicatorName} — ${indicator.purpose}`;
}

/**
 * Pair every word with every indicator whose group's target pos matches the word's pos.
 * @param {{id: number, gloss: string, pos: string, explanation?: string}[]} words
 * @param {{id: number, group: string, indicatorName: string, purpose: string}[]} indicators
 * @returns {object[]}
 */
function generateRows(words, indicators) {
  const rows = [];
  for (const word of words) {
    for (const indicator of indicators) {
      const targetPosList = GROUP_TO_POS[indicator.group] || [];
      if (!targetPosList.includes(word.pos)) continue;
      rows.push({
        targetId: `${word.id}_${indicator.id}`,
        wordId: word.id,
        gloss: word.gloss,
        pos: word.pos,
        indicatorId: indicator.id,
        indicatorName: indicator.indicatorName,
        prompt: buildPrompt(word, indicator)
      });
    }
  }
  return rows;
}

/**
 * Read and parse the curated indicator table, deriving `indicatorName` from `name`.
 * @param {string} fileName
 * @returns {{id: number, group: string, indicatorName: string, purpose: string}[]}
 */
function loadIndicators(fileName) {
  let rawData;
  try {
    rawData = fs.readFileSync(fileName, "utf8");
  } catch {
    console.error(`Error: Failed to read "${fileName}". Make sure the file exists.`);
    process.exit(1);
  }
  let raw;
  try {
    raw = JSON.parse(rawData);
  } catch {
    console.error(`Error: Failed to parse "${fileName}". Make sure the file is valid JSON.`);
    process.exit(1);
  }
  return raw.map(entry => ({
    id: Number(entry.id),
    group: entry.group,
    indicatorName: toIndicatorName(entry.name),
    purpose: entry.purpose
  }));
}

/**
 * Read and parse the Bliss word data file.
 * @param {string} fileName
 * @returns {{id: number, gloss: string, pos: string, explanation?: string}[]}
 */
function readWords(fileName) {
  let rawData;
  try {
    rawData = fs.readFileSync(fileName, "utf8");
  } catch {
    console.error(`Error: Failed to read "${fileName}". Make sure the file exists.`);
    process.exit(1);
  }
  try {
    return JSON.parse(rawData);
  } catch {
    console.error(`Error: Failed to parse "${fileName}". Make sure the file is valid JSON.`);
    process.exit(1);
  }
}

/**
 * Write the JSONL output: a `_meta` header row followed by one row per line.
 * @param {string} fileName
 * @param {object[]} rows
 */
function writeOutput(fileName, rows) {
  const lines = [
    JSON.stringify({ _meta: true, systemPrompt: SYSTEM_PROMPT }),
    ...rows.map(row => JSON.stringify(row))
  ];
  try {
    fs.writeFileSync(fileName, lines.join("\n") + "\n", "utf8");
  } catch {
    console.error(`Error: Failed to write to "${fileName}". Check directory permissions.`);
    process.exit(1);
  }
}

/**
 * @param {string[]} argv
 * @returns {{ inputFile: string, outputFile: string, verbose: boolean }}
 */
function parseArgs(argv) {
  const verbose = argv.includes("--verbose");
  const positional = argv.filter(a => a !== "--verbose");
  if (positional.length !== 3) {
    console.error("Error: Invalid arguments.");
    console.error("Usage: node generate_indicator_label_prompts.js <blissWordsFile.json> <indicatorsFile.json> <outputFile.jsonl> [--verbose]");
    process.exit(1);
  }
  const [inputFile, indicatorsFile, outputFile] = positional;
  return { inputFile, indicatorsFile, outputFile, verbose };
}

const { inputFile, indicatorsFile, outputFile, verbose } = parseArgs(process.argv.slice(2));
const words = readWords(inputFile);
const indicators = loadIndicators(indicatorsFile);
const rows = generateRows(words, indicators);
writeOutput(outputFile, rows);
console.log(`Wrote ${rows.length} prompt rows (${words.length} words x ${indicators.length} indicators) to ${outputFile}`);
if (verbose) {
  const byIndicator = {};
  for (const row of rows) {
    byIndicator[row.indicatorName] = (byIndicator[row.indicatorName] || 0) + 1;
  }
  console.log("Rows per indicator:", byIndicator);
}

export { toIndicatorName, buildPrompt, generateRows, loadIndicators, readWords, SYSTEM_PROMPT, GROUP_TO_POS };
