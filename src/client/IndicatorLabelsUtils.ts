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

import type { SymbolEncodingType } from ".";
import { adaptivePaletteGlobals } from "./GlobalData";
import { queryChat } from "./ollamaApi";

export type IndicatorInfoEntry = {
  id: number,
  group: string,
  name: string,
  purpose: string
};

const LABELS_URL     = "/data/new_labels_with_indicator.json";
const INDICATORS_URL = "/data/indicators.json";

// System prompt for Ollama queries.
const SYSTEM_PROMPT = `You are a linguistic assistant for Bliss, a symbol-based AAC language. A Bliss word carries a base meaning; a Bliss "indicator" is a grammatical marker applied to that word to shift its part of speech or grammatical form (tense, number, voice, mood, etc). Given a base word and an indicator, output the single resulting label in English: one word if possible, otherwise the shortest natural short phrase.

Examples:
Word "ability" (noun) + indicator "plural" -> abilities
Word "ability" (noun) + indicator "third person" -> their abilities
Word "hammer" (noun) + indicator "action" -> to hammer
Word "walk" (action) + indicator "past action" -> walked
Word "able" (description) + indicator "adverb" -> ably

Respond with ONLY the resulting label. No punctuation, no quotation marks, no explanation, no preamble, no restating the word.`;

let indicatorsById = new Map<number, IndicatorInfoEntry>();
const ollamaCache = new Map<string, string | undefined>();

/**
 * Load the pregenerated id-keyed label lookup (stored on
 * `adaptivePaletteGlobals.indicatorLabels`) and the indicator metadata table (kept
 * module-private, used only to build Ollama prompts). Called once from
 * `initAdaptivePaletteGlobals()`. Each fetch failure is reported with `console.error`
 * and leaves its data empty, so lookups return undefined rather than throwing.
 * @returns {Promise<void>}
 */
export async function initIndicatorLabels (): Promise<void> {
  try {
    const response = await fetch(LABELS_URL);
    adaptivePaletteGlobals.indicatorLabels = await response.json() as Record<string, string>;
  } catch (error) {
    console.error(`Error loading ${LABELS_URL}: ${String(error)}`);
    adaptivePaletteGlobals.indicatorLabels = {};
  }

  try {
    const response = await fetch(INDICATORS_URL);
    const indicators = await response.json() as IndicatorInfoEntry[];
    indicatorsById = new Map(indicators.map(indicator => [indicator.id, indicator]));
  } catch (error) {
    console.error(`Error loading ${INDICATORS_URL}: ${String(error)}`);
    indicatorsById = new Map();
  }
}

/**
 * Strip the "INDICATOR " prefix and lowercase, e.g. "INDICATOR PLURAL" -> "plural".
 * @param {string} name
 * @returns {string}
 */
function toIndicatorName (name: string): string {
  return name.replace(/^INDICATOR\s+/i, "").toLowerCase();
}

/**
 * Build the Ollama user prompt for a payload + indicator pair, mirroring `buildPrompt()`
 * in `scripts/new_labels_with_indicator/generate_indicator_label_prompts.js`. When the
 * payload's dictionary symbol is known, gloss/pos/explanation come from
 * `adaptivePaletteGlobals.symbols` (this also covers pos-mismatched pairs the batch
 * pipeline skipped via `GROUP_TO_POS`); otherwise the prompt falls back to `baseLabel`
 * with no part of speech. Returns undefined if the indicator id is not in the loaded
 * table, or if a `userSelectedSymbolId` is set but not found in `adaptivePaletteGlobals.symbols`.
 * @param {SymbolEncodingType} payload
 * @param {number} indicatorId
 * @returns {string | undefined}
 */
function buildOllamaPrompt ( userSelectedSymbolId: number | undefined, label: string, baseLabel: string | undefined, indicatorId: number): string | undefined {
  const indicator = indicatorsById.get(indicatorId);
  if (!indicator) {
    return undefined;
  }

  let header;
  if (userSelectedSymbolId !== undefined) {
    const word = adaptivePaletteGlobals.symbols.find(symbol => symbol.id === userSelectedSymbolId);
    if (!word) {
      return undefined;
    }
    header = word.explanation
      ? `Word: "${word.gloss}" (${word.pos}). Meaning: ${word.explanation}`
      : `Word: "${word.gloss}" (${word.pos}).`;
  } else {
    header = `Word: "${baseLabel ?? label}".`;
  }

  return `${header}\nIndicator: ${toIndicatorName(indicator.name)} — ${indicator.purpose}`;
}

/**
 * Resolve the new label for a symbol + indicator pair through the resolution order described
 * in docs/IndicatorLabelLookup.md:
 *   1. Pregenerated id lookup (`"{userSelectedSymbolId}_{indicatorId}"`).
 *   2. Ollama query, only when `adaptivePaletteGlobals.config.indicatorLabelLookup.useOllamaFallback`
 *      is true. Results are cached in-memory for the session, keyed by the symbol id
 *      when known, otherwise by `baseLabel`.
 *   3. undefined -- caller keeps the label unchanged.
 * @param {SymbolEncodingType} payload
 * @param {number} indicatorId
 * @returns {Promise<string | undefined>}
 */
export async function getNewLabel (userSelectedSymbolId: number | undefined, label: string, baseLabel: string | undefined, indicatorId: number): Promise<string | undefined> {
  if (userSelectedSymbolId !== undefined) {
    const newLabel = adaptivePaletteGlobals.indicatorLabels[`${userSelectedSymbolId}_${indicatorId}`];
    if (newLabel !== undefined) {
      return newLabel;
    }
  }

  // Fallback: query Ollama when new label is not found in the pregenerated data.
  // if queryOllama is enabled in the config.  If the query fails, return undefined.
  if (!adaptivePaletteGlobals.config.indicatorLabelLookup.useOllamaFallback) {
    return undefined;
  }

  const cacheKey = userSelectedSymbolId !== undefined
    ? `${userSelectedSymbolId}_${indicatorId}`
    : `${baseLabel ?? label}_${indicatorId}`;
  if (ollamaCache.has(cacheKey)) {
    return ollamaCache.get(cacheKey);
  }

  const prompt = buildOllamaPrompt(userSelectedSymbolId, label, baseLabel, indicatorId);
  if (!prompt) {
    return undefined;
  }

  const modelName = adaptivePaletteGlobals.config.indicatorLabelLookup.model || adaptivePaletteGlobals.LLMs[0];
  if (!modelName) {
    return undefined;
  }

  try {
    const response = await queryChat(prompt, modelName, false, SYSTEM_PROMPT);
    const content = "message" in response ? (response.message?.content || "") : "";
    const result = content.trim().length > 0 ? content.trim() : undefined;
    ollamaCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error(`Error querying Ollama for indicator label: ${String(error)}`);
    return undefined;
  }
}
