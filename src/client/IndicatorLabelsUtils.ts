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
const ollamaCache = new Map<string, Promise<string | undefined>>();

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
 * Build the Ollama user prompt for a symbol + indicator pair, mirroring `buildPrompt()`
 * in `scripts/new_labels_with_indicator/generate_indicator_label_prompts.js`. When
 * `userSelectedSymbolId` is known, gloss/pos/explanation come from
 * `adaptivePaletteGlobals.symbols` (this also covers pos-mismatched pairs the batch
 * pipeline skipped via `GROUP_TO_POS`); otherwise the prompt falls back to `baseLabel`
 * (or `label` if unset), with no part of speech. Returns undefined if the indicator id
 * is not in the loaded table, or if `userSelectedSymbolId` is set but not found in
 * `adaptivePaletteGlobals.symbols`.
 * @param {number | undefined} userSelectedSymbolId - Dictionary id of the originally selected symbol, if any.
 * @param {string} label - The symbol's current label.
 * @param {string | undefined} baseLabel - The label before any indicator swap; used as the prompt's word when `userSelectedSymbolId` is unset.
 * @param {number} indicatorId - The id of the indicator being applied.
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
 *   2. Ollama query, only when `adaptivePaletteGlobals.config.indicatorLabelLookup.useModelQueryFallback`
 *      is true. Results are cached in-memory for the session, keyed by
 *      `"{userSelectedSymbolId}_{indicatorId}"` when the symbol id is known, otherwise by
 *      `"{baseLabel ?? label}_{indicatorId}"`.
 *   3. undefined -- caller keeps the label unchanged.
 * @param {number | undefined} userSelectedSymbolId - Dictionary id of the originally selected symbol, if any.
 * @param {string} label - The symbol's current label.
 * @param {string | undefined} baseLabel - The label before any indicator swap, if one occurred.
 * @param {number} indicatorId - The id of the indicator being applied.
 * @returns {Promise<string | undefined>}
 */
export async function getNewLabel (userSelectedSymbolId: number | undefined, label: string, baseLabel: string | undefined, indicatorId: number): Promise<string | undefined> {
  if (userSelectedSymbolId !== undefined) {
    const newLabel = adaptivePaletteGlobals.indicatorLabels[`${userSelectedSymbolId}_${indicatorId}`];
    if (newLabel !== undefined) {
      return newLabel;
    }
  }

  // Fallback: query Ollama when new label is not found in the pregenerated data if
  // `useModelQueryFallback` is enabled in the config. If the query fails, return undefined.
  if (!adaptivePaletteGlobals.config.indicatorLabelLookup.useModelQueryFallback) {
    return undefined;
  }

  const cacheKey = userSelectedSymbolId !== undefined
    ? `${userSelectedSymbolId}_${indicatorId}`
    : `${baseLabel ?? label}_${indicatorId}`;
  const cached = ollamaCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const prompt = buildOllamaPrompt(userSelectedSymbolId, label, baseLabel, indicatorId);
  if (!prompt) {
    return undefined;
  }

  const modelName = adaptivePaletteGlobals.config.indicatorLabelLookup.model || adaptivePaletteGlobals.LLMs[0];
  if (!modelName) {
    return undefined;
  }
  // Cache the promise itself, set synchronously before awaiting it, so a second call for the
  // same key made before this one resolves finds the in-flight promise instead of firing its
  // own query. Both an empty response and a thrown error resolve to `undefined` and are cached
  // the same way, for the rest of the session.
  const resultPromise = queryChat(prompt, modelName, false, SYSTEM_PROMPT)
    .then((response) => {
      const content = "message" in response ? (response.message?.content || "") : "";
      return content.trim().length > 0 ? content.trim() : undefined;
    })
    .catch((error) => {
      console.error(`Error querying Ollama for a new label after applying an indicator: ${String(error)}`);
      return undefined;
    });
  ollamaCache.set(cacheKey, resultPromise);
  return resultPromise;
}

/**
 * Clear the in-memory Ollama result cache. Test-only: without this, a cache key reused
 * across test cases would silently serve a stale cached result.
 */
export function resetOllamaCacheForTests (): void {
  ollamaCache.clear();
}
