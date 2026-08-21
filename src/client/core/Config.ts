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

/**
 * Read and validate `public/config.json`.
 *
 * This module imports nothing but types.  Keeping it a leaf is deliberate: it is what lets
 * `GlobalData` hold the parsed config without acquiring a dependency that points back at it.
 */
import type {
  AdaptivePaletteConfigType, IndicatorLabelLookupConfigType,
  TelegraphicTranslationConfigType, FeatureVisibilityConfigType, WordPredictionConfigType
} from "../index.d";

// Used when `maxStoredRecords` or `wordPrediction.maxSuggestions` is missing or malformed.
export const DEFAULT_MAX_STORED_RECORDS = 500;
export const DEFAULT_MAX_SUGGESTIONS = 10;

// The model half of `wordPrediction`, switched off. Used wherever the section is unusable.
export const DISABLED_MODEL_QUERY = { enableModelQuery: false, model: "", systemPrompt: "", userPrompt: "" };

const isPositiveInteger = (value: unknown): boolean => Number.isInteger(value) && (value as number) > 0;

const isFilledString = (value: unknown): boolean => typeof value === "string" && value.trim().length > 0;

/**
 * Build the configuration the app uses when `config.json` is missing, unreadable, or malformed.
 *
 * This is a function rather than a shared constant because callers mutate the configuration in
 * place.  A shared object would let one caller's edit leak into every later default.
 * @returns {AdaptivePaletteConfigType}
 */
export function makeDefaultConfig (): AdaptivePaletteConfigType {
  return {
    maxStoredRecords: DEFAULT_MAX_STORED_RECORDS,
    announceSymbolOnInput: true,
    markAiSuggestions: true,
    indicatorLabelLookup: { useModelQueryFallback: false, model: "", systemPrompt: "", userPrompt: "" },
    symbolSearch: { show: true },
    svgBuilderString: { show: false },
    wordPrediction: { show: false, maxSuggestions: DEFAULT_MAX_SUGGESTIONS, ...DISABLED_MODEL_QUERY }
  };
}

/**
 * Validate the `indicatorLabelLookup` section of the config. Both prompts are required
 * because there are no hardcoded fallback prompts. Returns `undefined` when the section is
 * missing or malformed, which disables the Ollama fallback tier.
 * @param {unknown} section - The raw parsed section.
 * @returns {IndicatorLabelLookupConfigType | undefined}
 */
function parseIndicatorLabelLookup (section: unknown): IndicatorLabelLookupConfigType | undefined {
  const candidate = section as {
    useModelQueryFallback?: unknown, model?: unknown, systemPrompt?: unknown, userPrompt?: unknown
  } | undefined;
  if (!candidate || typeof candidate.useModelQueryFallback !== "boolean") {
    return undefined;
  }
  const { systemPrompt, userPrompt } = candidate;
  if (!isFilledString(systemPrompt) || !isFilledString(userPrompt)) {
    return undefined;
  }
  return {
    useModelQueryFallback: candidate.useModelQueryFallback,
    model: typeof candidate.model === "string" ? candidate.model : "",
    systemPrompt: systemPrompt as string,
    userPrompt: userPrompt as string
  };
}

/**
 * Validates the `telegraphicTranslation` configuration section:
 * 1. Prompt fields are required because there are no hardcoded fallback prompts.
 * 2. A partially configured section is treated as completely missing, causing the feature
 * to report as unconfigured rather than executing with empty prompts.
 * 3. The `model` field may be an empty string, which indicates it should use Ollama's first
 * available model.
 * 4. `showBlissSentence` is the one optional field. Anything other than `false` reads as
 * `true`, so a config written before the setting existed keeps working.
 * @param {unknown} section - The raw parsed section.
 * @returns {TelegraphicTranslationConfigType | undefined}
 */
function parseTelegraphicTranslation (section: unknown): TelegraphicTranslationConfigType | undefined {
  const candidate = section as {
    model?: unknown, numSentences?: unknown, systemPrompt?: unknown, userPrompt?: unknown,
    showBlissSentence?: unknown
  } | undefined;
  if (!candidate) {
    return undefined;
  }
  const { model, numSentences, systemPrompt, userPrompt } = candidate;
  // `numSentences: 0` is invalid because a query cannot return nothing.
  if (typeof model !== "string" || !isPositiveInteger(numSentences) ||
      !isFilledString(systemPrompt) || !isFilledString(userPrompt)) {
    return undefined;
  }
  return {
    model,
    numSentences: numSentences as number,
    systemPrompt: systemPrompt as string,
    userPrompt: userPrompt as string,
    // Deliberately not required: an existing `config.json` written before this setting
    // existed must keep working, and a missing field here would discard the whole section.
    showBlissSentence: candidate.showBlissSentence !== false
  };
}

/**
 * Validate the top-level `maxStoredRecords`, the cap shared by every log kept in local
 * storage. Zero is valid and means keep the features but store nothing.
 * @param {unknown} value - The raw parsed value.
 * @returns {number}
 */
function parseMaxStoredRecords (value: unknown): number {
  if (isPositiveInteger(value) || value === 0) {
    return value as number;
  }
  return DEFAULT_MAX_STORED_RECORDS;
}

/**
 * Validate the `wordPrediction` section. A missing or malformed section turns the feature
 * off, rather than guessing at what was meant.
 *
 * The model query is a separate decision from the feature itself: it is enabled only when
 * `enableModelQuery` is true and both prompts are filled in, since there are no hardcoded
 * fallback prompts to query with. A half-filled model configuration leaves the history-based
 * suggestions working on their own.
 *
 * The prompts are kept whether or not the query is enabled, so that a user turning it on from
 * the settings dialog has something to query with.
 * @param {unknown} section - The raw parsed section.
 * @returns {WordPredictionConfigType}
 */
function parseWordPrediction (section: unknown): WordPredictionConfigType {
  const candidate = section as {
    show?: unknown, maxSuggestions?: unknown, enableModelQuery?: unknown,
    model?: unknown, systemPrompt?: unknown, userPrompt?: unknown
  } | undefined;
  if (!candidate || typeof candidate.show !== "boolean") {
    return { show: false, maxSuggestions: DEFAULT_MAX_SUGGESTIONS, ...DISABLED_MODEL_QUERY };
  }
  const { model, systemPrompt, userPrompt } = candidate;
  // An empty `model` is valid and means the first model Ollama reports.
  const modelQuery = typeof model === "string" &&
    isFilledString(systemPrompt) && isFilledString(userPrompt)
    ? {
      enableModelQuery: candidate.enableModelQuery === true,
      model,
      systemPrompt: systemPrompt as string,
      userPrompt: userPrompt as string
    }
    : DISABLED_MODEL_QUERY;
  return {
    show: candidate.show,
    maxSuggestions: isPositiveInteger(candidate.maxSuggestions)
      ? candidate.maxSuggestions as number
      : DEFAULT_MAX_SUGGESTIONS,
    ...modelQuery
  };
}

/**
 * Validate a feature-visibility section, one that carries only a `show` boolean.
 * A missing or malformed section falls back to `fallback` so that a hand-edited
 * config.json cannot leave a feature in an undefined state.
 * @param {unknown} section - The raw parsed section.
 * @param {boolean} fallback - The value to use when the section is unusable.
 * @returns {FeatureVisibilityConfigType}
 */
function parseShowFlag (section: unknown, fallback: boolean): FeatureVisibilityConfigType {
  const candidate = section as { show?: unknown } | undefined;
  if (!candidate || typeof candidate.show !== "boolean") {
    return { show: fallback };
  }
  return { show: candidate.show };
}

/**
 * Fetch and validate `public/config.json`: the top-level `maxStoredRecords` and the
 * `indicatorLabelLookup`, `telegraphicTranslation`, `symbolSearch`, `svgBuilderString`,
 * and `wordPrediction` sections.
 * @returns {Promise<AdaptivePaletteConfigType>}
 */
export async function loadConfig (): Promise<AdaptivePaletteConfigType> {
  try {
    const response = await fetch("/config.json");
    if (!response.ok) {
      return makeDefaultConfig();
    }
    const parsed = await response.json() as Record<string, unknown>;
    const indicatorLabelLookup = parseIndicatorLabelLookup(parsed?.indicatorLabelLookup);
    return {
      maxStoredRecords: parseMaxStoredRecords(parsed?.maxStoredRecords),
      // Anything other than `false` leaves announcements on: a mistyped config must not
      // silently mute the palette.
      announceSymbolOnInput: typeof parsed?.announceSymbolOnInput === "boolean" ? parsed.announceSymbolOnInput : true,
      // Anything other than `false` leaves the marking on: a mistyped config must not quietly
      // stop telling the user which suggestions a model made.
      markAiSuggestions: typeof parsed?.markAiSuggestions === "boolean" ? parsed.markAiSuggestions : true,
      indicatorLabelLookup: indicatorLabelLookup ?? makeDefaultConfig().indicatorLabelLookup,
      telegraphicTranslation: parseTelegraphicTranslation(parsed?.telegraphicTranslation),
      symbolSearch: parseShowFlag(parsed?.symbolSearch, true),
      svgBuilderString: parseShowFlag(parsed?.svgBuilderString, false),
      wordPrediction: parseWordPrediction(parsed?.wordPrediction)
    };
  } catch {
    return makeDefaultConfig();
  }
}
