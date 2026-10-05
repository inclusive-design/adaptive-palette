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

import { adaptivePaletteGlobals } from "../state/GlobalData";
import { renderPromptLines, promptsFor } from "./PromptUtils";
import { glossFor } from "./SvgUtils";
import { queryChat } from "../core/OllamaApi";
import { LANGUAGES, Language, languageSignal } from "../i18n/I18n";

export type IndicatorInfoEntry = {
  id: number,
  group: string,
  name: string,
  purpose: string
};

// The pregenerated table for each language. A language whose table is missing falls back
// to the model.
const LABELS_URLS: Record<Language, string> = {
  en: "/data/new_labels_with_indicator.json",
  sv: "/data/new_labels_with_indicator_sv.json"
};
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
 * Load the pregenerated id-keyed label lookup of each language (stored on
 * `adaptivePaletteGlobals.indicatorLabels`, keyed by language) and the indicator metadata table (kept
 * module-private, used only to build Ollama prompts). Called once from
 * `initAdaptivePaletteGlobals()`. Each fetch failure is reported with `console.error`
 * and leaves its data empty, so lookups return undefined rather than throwing.
 * @returns {Promise<void>}
 */
export async function initIndicatorLabels (): Promise<void> {
  adaptivePaletteGlobals.indicatorLabels = {};
  // ponytail: loads every language's table at start-up (3 MB each); load on language change if
  // start-up time matters.
  await Promise.all(LANGUAGES.map(async (language) => {
    try {
      const response = await fetch(LABELS_URLS[language]);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      adaptivePaletteGlobals.indicatorLabels[language] = await response.json() as Record<string, string>;
    } catch (error) {
      console.error(`Error loading ${LABELS_URLS[language]}: ${String(error)}`);
    }
  }));

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
 * `userPrompt` template (the UI language's, from config.json). When `userSelectedSymbolId`
 * is known, gloss (in `language`)/pos/explanation come from `adaptivePaletteGlobals.symbols`; otherwise the
 * word falls back to `baseLabel` (or `label` if unset), with no part of speech. Template
 * lines whose value is empty are dropped, so a missing part of speech or explanation leaves
 * no empty line behind. Returns undefined if the indicator id is not in the loaded table,
 * if `userSelectedSymbolId` is set but not found in `adaptivePaletteGlobals.symbols`, or if
 * the word is blank (an unlabelled symbol).
 * @param {string} userPrompt - The prompt template for `language`.
 * @param {number | undefined} userSelectedSymbolId - Dictionary id of the originally selected symbol, if any.
 * @param {string} label - The symbol's current label.
 * @param {string | undefined} baseLabel - The label before any indicator swap; used as the prompt's word when `userSelectedSymbolId` is unset.
 * @param {number} indicatorId - The id of the indicator being applied.
 * @param {Language} language - The language of the gloss.
 * @returns {string | undefined}
 */
function buildOllamaPrompt (userPrompt: string, userSelectedSymbolId: number | undefined, label: string, baseLabel: string | undefined, indicatorId: number, language: Language): string | undefined {
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
    word = { gloss: glossFor(symbol, language), pos: symbol.pos ?? "", explanation: symbol.explanation ?? "" };
  }

  // No word means no question to ask.
  if (word.gloss.trim().length === 0) {
    return undefined;
  }

  return renderPromptLines(userPrompt, {
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
 * of `language` (`"{userSelectedSymbolId}_{indicatorId}"`). Synchronous -- no network/model involved.
 * @param {number | undefined} userSelectedSymbolId - Dictionary id of the originally selected symbol, if any.
 * @param {number} indicatorId - The id of the indicator being applied.
 * @param {Language} language - The language of the table; the UI language by default.
 * @returns {string | undefined}
 */
export function getStaticNewLabel (userSelectedSymbolId: number | undefined, indicatorId: number, language: Language = languageSignal.value): string | undefined {
  if (userSelectedSymbolId === undefined) {
    return undefined;
  }
  return adaptivePaletteGlobals.indicatorLabels[language]?.[`${userSelectedSymbolId}_${indicatorId}`];
}

/**
 * Resolve the new label for a symbol + indicator pair through tier 2 of the resolution
 * order described in docs/IndicatorLabelLookup.md: a model query, only when
 * `adaptivePaletteGlobals.config.indicatorLabelLookup.useModelQueryFallback` is true and
 * a prompt can be built, using the prompt and gloss of `language`. Results are cached
 * in-memory for the session, keyed by `"{language}:{userSelectedSymbolId}_{indicatorId}"` when
 * the symbol id is known, otherwise by `"{language}:{baseLabel ?? label}_{indicatorId}"`. Whether the fallback is viable, already
 * settled, or needs a fresh query is all decided synchronously, so the caller can choose
 * the right immediate announcement before awaiting anything.
 * @param {number | undefined} userSelectedSymbolId - Dictionary id of the originally selected symbol, if any.
 * @param {string} label - The symbol's current label.
 * @param {string | undefined} baseLabel - The label before any indicator swap, if one occurred.
 * @param {number} indicatorId - The id of the indicator being applied.
 * @param {Language} language - The language to ask in; the UI language by default.
 * @returns {ModelQueryResult}
 */
export function getNewLabelViaModelQuery (userSelectedSymbolId: number | undefined, label: string, baseLabel: string | undefined, indicatorId: number, language: Language = languageSignal.value): ModelQueryResult {
  const lookup = adaptivePaletteGlobals.config.indicatorLabelLookup;
  const prompts = promptsFor(lookup, language);
  if (!lookup.useModelQueryFallback || !prompts) {
    return { status: "not-viable" };
  }

  const prompt = buildOllamaPrompt(prompts.userPrompt, userSelectedSymbolId, label, baseLabel, indicatorId, language);
  if (!prompt) {
    return { status: "not-viable" };
  }

  const modelName = adaptivePaletteGlobals.config.indicatorLabelLookup.model || adaptivePaletteGlobals.models[0];
  if (!modelName) {
    return { status: "not-viable" };
  }

  const cacheKey = `${language}:` + (userSelectedSymbolId !== undefined
    ? `${userSelectedSymbolId}_${indicatorId}`
    : `${baseLabel ?? label}_${indicatorId}`);

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
  const resultPromise: Promise<string | undefined> = queryChat(prompt, modelName, false, prompts.systemPrompt)
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
