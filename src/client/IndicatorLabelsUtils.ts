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
import { renderPromptLines } from "./GlobalUtils";
import { queryChat } from "./OllamaApi";

export type IndicatorInfoEntry = {
  id: number,
  group: string,
  name: string,
  purpose: string
};

const LABELS_URL     = "/data/new_labels_with_indicator.json";
const INDICATORS_URL = "/data/indicators.json";

let indicatorsById = new Map<number, IndicatorInfoEntry>();
// An entry is a `Promise` while its query is in flight, and gets overwritten with the
// settled value (string or `undefined`) once it resolves. Presence is checked with
// `.has()`, not `!== undefined`, since a settled miss is stored as literal `undefined`.
const ollamaCache = new Map<string, string | undefined | Promise<string | undefined>>();

export type ModelQueryResult =
  | { status: "not-viable" }
  | { status: "cached", label: string | undefined }
  | { status: "pending", promise: Promise<string | undefined> };

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
 * Build the Ollama user prompt for a symbol + indicator pair by rendering the
 * `indicatorLabelLookup.userPrompt` template from config.json. When `userSelectedSymbolId`
 * is known, gloss/pos/explanation come from `adaptivePaletteGlobals.symbols`; otherwise the
 * word falls back to `baseLabel` (or `label` if unset), with no part of speech. Template
 * lines whose value is empty are dropped, so a missing part of speech or explanation leaves
 * no empty line behind. Returns undefined if the indicator id is not in the loaded table,
 * or if `userSelectedSymbolId` is set but not found in `adaptivePaletteGlobals.symbols`.
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

  let word = { gloss: baseLabel ?? label, pos: "", explanation: "" };
  if (userSelectedSymbolId !== undefined) {
    const symbol = adaptivePaletteGlobals.symbols.find(symbol => symbol.id === userSelectedSymbolId);
    if (!symbol) {
      return undefined;
    }
    word = { gloss: symbol.gloss, pos: symbol.pos ?? "", explanation: symbol.explanation ?? "" };
  }

  return renderPromptLines(adaptivePaletteGlobals.config.indicatorLabelLookup.userPrompt, {
    word: word.gloss,
    pos: word.pos,
    explanation: word.explanation,
    indicator: toIndicatorName(indicator.name),
    purpose: indicator.purpose
  });
}

/**
 * Resolve the new label for a symbol + indicator pair through tier 1 of the resolution
 * order described in docs/IndicatorLabelLookup.md: the pregenerated id lookup
 * (`"{userSelectedSymbolId}_{indicatorId}"`). Synchronous -- no network/model involved.
 * @param {number | undefined} userSelectedSymbolId - Dictionary id of the originally selected symbol, if any.
 * @param {number} indicatorId - The id of the indicator being applied.
 * @returns {string | undefined}
 */
export function getStaticNewLabel (userSelectedSymbolId: number | undefined, indicatorId: number): string | undefined {
  if (userSelectedSymbolId === undefined) {
    return undefined;
  }
  return adaptivePaletteGlobals.indicatorLabels[`${userSelectedSymbolId}_${indicatorId}`];
}

/**
 * Resolve the new label for a symbol + indicator pair through tier 2 of the resolution
 * order described in docs/IndicatorLabelLookup.md: an model query, only when
 * `adaptivePaletteGlobals.config.indicatorLabelLookup.useModelQueryFallback` is true and
 * a prompt can be built. Results are cached in-memory for the session, keyed by
 * `"{userSelectedSymbolId}_{indicatorId}"` when the symbol id is known, otherwise by
 * `"{baseLabel ?? label}_{indicatorId}"`. Whether the fallback is viable, already
 * settled, or needs a fresh query is all decided synchronously, so the caller can choose
 * the right immediate announcement before awaiting anything.
 * @param {number | undefined} userSelectedSymbolId - Dictionary id of the originally selected symbol, if any.
 * @param {string} label - The symbol's current label.
 * @param {string | undefined} baseLabel - The label before any indicator swap, if one occurred.
 * @param {number} indicatorId - The id of the indicator being applied.
 * @returns {ModelQueryResult}
 */
export function getNewLabelViaModelQuery (userSelectedSymbolId: number | undefined, label: string, baseLabel: string | undefined, indicatorId: number): ModelQueryResult {
  if (!adaptivePaletteGlobals.config.indicatorLabelLookup.useModelQueryFallback) {
    return { status: "not-viable" };
  }

  const prompt = buildOllamaPrompt(userSelectedSymbolId, label, baseLabel, indicatorId);
  if (!prompt) {
    return { status: "not-viable" };
  }

  const modelName = adaptivePaletteGlobals.config.indicatorLabelLookup.model || adaptivePaletteGlobals.LLMs[0];
  if (!modelName) {
    return { status: "not-viable" };
  }

  const cacheKey = userSelectedSymbolId !== undefined
    ? `${userSelectedSymbolId}_${indicatorId}`
    : `${baseLabel ?? label}_${indicatorId}`;

  if (ollamaCache.has(cacheKey)) {
    const entry = ollamaCache.get(cacheKey);
    if (entry instanceof Promise) {
      return { status: "pending", promise: entry };
    }
    return { status: "cached", label: entry };
  }

  // Cache the promise itself, set synchronously before awaiting it, so a second call for the
  // same key made before this one settles finds the in-flight promise instead of firing its
  // own query. Both an empty response and a thrown error resolve to `undefined`; once settled,
  // the cache entry is overwritten with the plain value (string or `undefined`) for the rest
  // of the session.
  const resultPromise: Promise<string | undefined> = queryChat(prompt, modelName, false, adaptivePaletteGlobals.config.indicatorLabelLookup.systemPrompt)
    .then((response) => {
      const content = "message" in response ? (response.message?.content || "") : "";
      return content.trim().length > 0 ? content.trim() : undefined;
    })
    .catch((error) => {
      console.error(`Error querying Ollama for a new label after applying an indicator: ${String(error)}`);
      return undefined;
    })
    .then((result) => {
      ollamaCache.set(cacheKey, result);
      return result;
    });
  ollamaCache.set(cacheKey, resultPromise);
  return { status: "pending", promise: resultPromise };
}

/**
 * Clear the in-memory Ollama result cache. Test-only: without this, a cache key reused
 * across test cases would silently serve a stale cached result.
 */
export function resetOllamaCacheForTests (): void {
  ollamaCache.clear();
}
