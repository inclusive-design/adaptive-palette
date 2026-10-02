/*
 * Copyright The Adaptive Palette copyright holders
 * See the AUTHORS.md file at the top-level directory of this distribution and at
 * https://github.com/inclusive-design/adaptive-palette/raw/main/AUTHORS.md.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */
/*
 * Usage, from the repository root, with Ollama running:
 * node scripts/draft_swedish_labels.js
 *
 * One-time script: gives every labelled cell in the standard chart a Swedish label, turning
 * `"label": "bread"` into `"label": { "en": "bread", "sv": "bröd" }`.
 * 1. A single-symbol cell labelled with the symbol's whole English gloss takes its `glossSv`.
 * 2. Every other cell gets a draft from the model, given the English label, gloss and
 *    explanation. The same label on the same symbol is asked once.
 * A cell whose label is already an object is skipped, so a stopped run can be started again.
 * A palette file that JSON.stringify would reflow (hand-formatted lines) is edited in place instead.
 * The drafts are machine translations; see docs/issue.md, "Decisions and known limits".
 */

import fs from "fs";
import { Ollama } from "ollama";

const PALETTES_DIR = "public/palette-sets/standardBlissChart/palettes";
const SYMBOLS_FILE = "public/data/bliss_symbol_explanations.json";
const MODEL = "gemma4:12b";

const SYSTEM_PROMPT = `You translate button labels on a Blissymbolics AAC communication board from English into Swedish.
Reply with the Swedish label only: no quotes, no explanation.
Keep it as short as the English label, keep its capital letters, and use the words a Swedish AAC user would expect.
When a Swedish gloss is given, prefer its words.`;

/**
 * The Swedish label a cell can take without the model: the Swedish gloss of a single symbol
 * labelled with its whole English gloss. When the English label is one word (no comma), only
 * the first Swedish sense is used.
 * @param {string} label - The English label.
 * @param {number | (number | string)[]} composition - The cell's composition.
 * @param {Map<number, { gloss: string, glossSv?: string }>} symbolsById
 * @returns {string | undefined}
 */
export function glossLabel(label, composition, symbolsById) {
  if (typeof composition !== "number") {
    return undefined;
  }
  const entry = symbolsById.get(composition);
  if (entry?.gloss !== label) {
    return undefined;
  }
  // A one-word English label gets one Swedish word, its first sense.
  return label.includes(",") ? entry.glossSv : entry.glossSv?.split(",")[0].trim();
}

/**
 * What the model is told about one cell.
 * @param {string} label
 * @param {number | (number | string)[]} composition
 * @param {Map<number, { gloss: string, glossSv?: string, explanation?: string }>} symbolsById
 * @returns {string}
 */
function cellPrompt(label, composition, symbolsById) {
  const ids = typeof composition === "number" ? [composition] : (composition ?? []).filter(part => typeof part === "number");
  const entries = ids.map(id => symbolsById.get(id)).filter(Boolean);
  const lines = [`English label: ${label}`];
  // A label with no symbol (a row heading) is translated from the label alone.
  if (entries.length > 0) {
    lines.push(`Symbol meaning: ${entries.map(entry => entry.gloss).join(" + ")}`);
  }
  if (entries.length === 1 && entries[0].explanation) {
    lines.push(`Explanation: ${entries[0].explanation}`);
  }
  const swedish = entries.map(entry => entry.glossSv).filter(Boolean);
  if (swedish.length > 0) {
    lines.push(`Swedish gloss: ${swedish.join(" + ")}`);
  }
  return lines.join("\n");
}

/**
 * Ask the model for one label.
 * @param {Ollama} ollama
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function draft(ollama, prompt) {
  const response = await ollama.chat({
    model: MODEL,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: prompt }],
    think: false,
    options: { temperature: 0 }
  });
  const text = response.message.content.trim().split("\n")[0].replace(/^["'“”]+|["'“”]+$/g, "").trim();
  if (text.length === 0) {
    throw new Error(`The model gave no label for:\n${prompt}`);
  }
  return text;
}

async function main() {
  const symbols = JSON.parse(fs.readFileSync(SYMBOLS_FILE, "utf8")).data;
  const symbolsById = new Map(symbols.map(entry => [entry.id, entry]));
  const ollama = new Ollama();
  const drafted = new Map();
  let fromGloss = 0;
  let fromModel = 0;

  for (const fileName of fs.readdirSync(PALETTES_DIR).filter(name => name.endsWith(".json")).sort()) {
    const filePath = `${PALETTES_DIR}/${fileName}`;
    const palette = JSON.parse(fs.readFileSync(filePath, "utf8"));
    for (const cell of Object.values(palette.cells)) {
      const { label, composition } = cell.options;
      if (typeof label !== "string") {
        continue;
      }
      let sv = glossLabel(label, composition, symbolsById);
      if (sv) {
        fromGloss++;
      } else {
        const key = `${label}|${JSON.stringify(composition)}`;
        if (!drafted.has(key)) {
          drafted.set(key, await draft(ollama, cellPrompt(label, composition, symbolsById)));
          console.log(`${label} -> ${drafted.get(key)}`);
        }
        sv = drafted.get(key);
        fromModel++;
      }
      cell.options.label = { en: label, sv };
    }
    // Written per file, so a stopped run keeps what it has done.
    const original = fs.readFileSync(filePath, "utf8");
    if (JSON.stringify(JSON.parse(original), null, 2) + "\n" === original) {
      fs.writeFileSync(filePath, JSON.stringify(palette, null, 2) + "\n", "utf8");
    } else {
      // Hand-formatted file: swap each label string in place, keeping the layout.
      const labels = Object.values(palette.cells).map(cell => cell.options.label).filter(label => label !== undefined);
      let index = 0;
      const text = original.replace(/"label": ("(?:[^"\\]|\\.)*"|\{[^}]*\})/g, (match, value) => {
        const label = labels[index++];
        return value.startsWith("{") ? match : `"label": { "en": ${value}, "sv": ${JSON.stringify(label.sv)} }`;
      });
      // Check the edit changed only the labels.
      if (index !== labels.length || JSON.stringify(JSON.parse(text)) !== JSON.stringify(palette)) {
        throw new Error(`The in-place edit of ${filePath} did not match the labels.`);
      }
      fs.writeFileSync(filePath, text, "utf8");
    }
  }
  console.log(`Done: ${fromGloss} cells from the Swedish gloss, ${fromModel} cells from the model (repeated labels share one model call).`);
}

if (import.meta.main) {
  await main();
}
