/*
 * Usage:
 * node generate_indicator_label_prompts.js <blissWordsFile.json> <indicatorsFile.json> <outputFile.jsonl> [--language sv] [--verbose]
 *
 * Example:
 * node generate_indicator_label_prompts.js ../../public/data/bliss_symbol_explanations.json \
 *   ../../public/data/indicators.json ../data/new_labels_with_indicator_prompts.jsonl
 *
 * Reads Bliss word data and the curated indicator table (../../public/data/indicators.json), and for
 * every word whose `pos` matches an indicator's group (see GROUP_TO_POS), emits one prompt
 * row asking a language model for the word's new label under that indicator.
 *
 * `--language sv` asks with the Swedish gloss and the Swedish system prompt (default `en`).
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

const SYSTEM_PROMPTS = {
  en: `You are a linguistic assistant for Bliss, a symbol-based AAC language. A Bliss word carries a base meaning; a Bliss "indicator" is a grammatical marker applied to that word to shift its part of speech or grammatical form (tense, number, voice, mood, etc). Given a base word and an indicator, output the single resulting label in English: one word if possible, otherwise the shortest natural short phrase.

Examples:
Word "ability" (noun) + indicator "plural" -> abilities
Word "ability" (noun) + indicator "third person" -> their abilities
Word "hammer" (noun) + indicator "action" -> to hammer
Word "walk" (action) + indicator "past action" -> walked
Word "able" (description) + indicator "adverb" -> ably

Respond with ONLY the resulting label. No punctuation, no quotation marks, no explanation, no preamble, no restating the word.`,
  sv: `Du är en språklig assistent för Bliss, ett symbolbaserat AAC-språk. Ett blissord har en grundbetydelse; en blissindikator är en grammatisk markör som läggs på ordet för att ändra dess ordklass eller grammatiska form (tempus, numerus, diates, modus osv.). Givet ett grundord och en indikator, skriv den resulterande etiketten på svenska: ett ord om möjligt, annars den kortaste naturliga frasen.

Exempel:
Ord "förmåga" (noun) + indikator "plural" -> förmågor
Ord "förmåga" (noun) + indikator "definite" -> förmågan
Ord "hammare" (noun) + indikator "action" -> att hamra
Ord "gå" (action) + indikator "past action" -> gick
Ord "glad" (description) + indikator "adverb" -> glatt

Svara ENDAST med den resulterande etiketten. Inga skiljetecken, inga citattecken, ingen förklaring, ingen inledning, upprepa inte ordet.`
};

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
 * @param {string} [language] "en" or "sv"; "sv" uses `glossSv` when present
 * @returns {object[]}
 */
function generateRows(words, indicators, language = "en") {
  const rows = [];
  for (const word of words) {
    const gloss = language === "sv" ? word.glossSv ?? word.gloss : word.gloss;
    for (const indicator of indicators) {
      const targetPosList = GROUP_TO_POS[indicator.group] || [];
      if (!targetPosList.includes(word.pos)) continue;
      rows.push({
        targetId: `${word.id}_${indicator.id}`,
        wordId: word.id,
        gloss,
        pos: word.pos,
        indicatorId: indicator.id,
        indicatorName: indicator.indicatorName,
        prompt: buildPrompt({ ...word, gloss }, indicator)
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
    // The symbol file wraps the list in { license, attribution, data }
    const parsed = JSON.parse(rawData);
    return Array.isArray(parsed) ? parsed : parsed.data;
  } catch {
    console.error(`Error: Failed to parse "${fileName}". Make sure the file is valid JSON.`);
    process.exit(1);
  }
}

/**
 * Write the JSONL output: a `_meta` header row followed by one row per line.
 * @param {string} fileName
 * @param {object[]} rows
 * @param {string} language
 */
function writeOutput(fileName, rows, language) {
  const lines = [
    JSON.stringify({ _meta: true, systemPrompt: SYSTEM_PROMPTS[language] }),
    ...rows.map(row => JSON.stringify(row))
  ];
  try {
    fs.writeFileSync(fileName, lines.join("\n") + "\n", "utf8");
  } catch {
    console.error(`Error: Failed to write to "${fileName}". Check directory permissions.`);
    process.exit(1);
  }
}

const USAGE = "Usage: node generate_indicator_label_prompts.js <blissWordsFile.json> <indicatorsFile.json> <outputFile.jsonl> [--language sv] [--verbose]";

/**
 * @param {string[]} argv
 * @returns {{ inputFile: string, indicatorsFile: string, outputFile: string, language: string, verbose: boolean }}
 */
function parseArgs(argv) {
  const verbose = argv.includes("--verbose");
  const positional = [];
  let language = "en";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--verbose") continue;
    if (argv[i] === "--language") {
      language = argv[++i];
    } else {
      positional.push(argv[i]);
    }
  }
  if (positional.length !== 3 || !SYSTEM_PROMPTS[language]) {
    console.error("Error: Invalid arguments.");
    console.error(USAGE);
    process.exit(1);
  }
  const [inputFile, indicatorsFile, outputFile] = positional;
  return { inputFile, indicatorsFile, outputFile, language, verbose };
}

if (import.meta.main) {
  const { inputFile, indicatorsFile, outputFile, language, verbose } = parseArgs(process.argv.slice(2));
  const words = readWords(inputFile);
  const indicators = loadIndicators(indicatorsFile);
  const rows = generateRows(words, indicators, language);
  writeOutput(outputFile, rows, language);
  console.log(`Wrote ${rows.length} prompt rows (${words.length} words x ${indicators.length} indicators) to ${outputFile}`);
  if (verbose) {
    const byIndicator = {};
    for (const row of rows) {
      byIndicator[row.indicatorName] = (byIndicator[row.indicatorName] || 0) + 1;
    }
    console.log("Rows per indicator:", byIndicator);
  }
}

export { toIndicatorName, buildPrompt, generateRows, loadIndicators, readWords, SYSTEM_PROMPTS, GROUP_TO_POS };
