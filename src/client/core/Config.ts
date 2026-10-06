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
 * This module imports nothing but types and the leaf `I18n` module.  Keeping it a leaf is
 * deliberate: it is what lets `GlobalData` hold the parsed config without acquiring a
 * dependency that points back at it.
 */
import type {
  AdaptivePaletteConfigType, IndicatorLabelLookupConfigType,
  TelegraphicTranslationConfigType, FeatureVisibilityConfigType, WordPredictionConfigType,
  AboutMeConfigType, SwitchScanningConfigType, PromptType
} from "../index.d";
import { parseLanguage } from "../i18n/I18n";

// Used when `maxRecalledRecords` or `wordPrediction.maxSuggestions` is missing or malformed.
// 500 is a working-set size, not a storage limit: reading further back costs time on every
// keystroke, because word prediction walks the whole set each time it suggests.
export const DEFAULT_MAX_RECALLED_RECORDS = 500;
export const DEFAULT_MAX_SUGGESTIONS = 10;

// Used when `aboutMe.messagesPerRun` is missing or malformed: enough history to find facts
// in, and few enough messages to fit a small local model's context.
export const DEFAULT_MESSAGES_PER_RUN = 200;

// The model half of `wordPrediction`, switched off. Used wherever the section is unusable.
export const DISABLED_MODEL_QUERY = { enableModelQuery: false, model: "", systemPrompt: "", userPrompt: "" };

const isPositiveInteger = (value: unknown): boolean => Number.isInteger(value) && (value as number) > 0;

const isFilledString = (value: unknown): boolean => typeof value === "string" && value.trim().length > 0;

/**
 * Whether a value is a usable prompt: a filled string, sent whatever the language, or an
 * object of filled strings keyed by supported language, with at least one.
 * @param {unknown} value - The raw parsed value.
 * @returns {boolean}
 */
export function isPrompt (value: unknown): value is PromptType {
  if (isFilledString(value)) {
    return true;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const entries = Object.entries(value);
  return entries.length > 0 &&
    entries.every(([language, text]) => parseLanguage(language) !== undefined && isFilledString(text));
}

// The shape of a `KeyboardEvent.code` value: "Space", "KeyA", "Digit1", "F1".
const isKeyCode = (value: unknown): boolean => typeof value === "string" && /^[A-Z][A-Za-z0-9]*$/.test(value);

/**
 * Build the configuration the app uses when `config.json` is missing, unreadable, or malformed.
 *
 * This is a function rather than a shared constant because callers mutate the configuration in
 * place.  A shared object would let one caller's edit leak into every later default.
 * @returns {AdaptivePaletteConfigType}
 */
export function makeDefaultConfig (): AdaptivePaletteConfigType {
  return {
    language: "en",
    maxRecalledRecords: DEFAULT_MAX_RECALLED_RECORDS,
    announceSymbolOnInput: true,
    markAiSuggestions: true,
    backquoteGoesBack: true,
    switchScanning: { enabled: false, moveKey: "Space", selectKey: "Enter" },
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
  if (!isPrompt(systemPrompt) || !isPrompt(userPrompt)) {
    return undefined;
  }
  return {
    useModelQueryFallback: candidate.useModelQueryFallback,
    model: typeof candidate.model === "string" ? candidate.model : "",
    systemPrompt: systemPrompt,
    userPrompt: userPrompt
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
      !isPrompt(systemPrompt) || !isPrompt(userPrompt)) {
    return undefined;
  }
  return {
    model,
    numSentences: numSentences as number,
    systemPrompt: systemPrompt,
    userPrompt: userPrompt,
    // Deliberately not required: an existing `config.json` written before this setting
    // existed must keep working, and a missing field here would discard the whole section.
    showBlissSentence: candidate.showBlissSentence !== false
  };
}

/**
 * Validate the `aboutMe` section, which configures "Suggest updates" in the About Me
 * dialog. Both prompts are required because there are no hardcoded fallback prompts. A
 * missing or malformed section returns `undefined`, which hides the button. A bad
 * `messagesPerRun` falls back to the default and keeps the rest of the section.
 * @param {unknown} section - The raw parsed section.
 * @returns {AboutMeConfigType | undefined}
 */
function parseAboutMe (section: unknown): AboutMeConfigType | undefined {
  const candidate = section as {
    model?: unknown, systemPrompt?: unknown, userPrompt?: unknown, messagesPerRun?: unknown
  } | undefined;
  if (!candidate) {
    return undefined;
  }
  const { model, systemPrompt, userPrompt, messagesPerRun } = candidate;
  // An empty `model` is valid and means the first model Ollama reports.
  if (typeof model !== "string" || !isPrompt(systemPrompt) || !isPrompt(userPrompt)) {
    return undefined;
  }
  return {
    model,
    systemPrompt: systemPrompt,
    userPrompt: userPrompt,
    messagesPerRun: isPositiveInteger(messagesPerRun) ? messagesPerRun as number : DEFAULT_MESSAGES_PER_RUN
  };
}

/**
 * Validate the top-level `maxRecalledRecords`, how many of the newest stored messages the app
 * reads back. Zero is valid and turns the history off entirely.
 * @param {unknown} value - The raw parsed value.
 * @returns {number}
 */
function parseMaxRecalledRecords (value: unknown): number {
  if (isPositiveInteger(value) || value === 0) {
    return value as number;
  }
  return DEFAULT_MAX_RECALLED_RECORDS;
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
    isPrompt(systemPrompt) && isPrompt(userPrompt)
    ? {
      enableModelQuery: candidate.enableModelQuery === true,
      model,
      systemPrompt: systemPrompt,
      userPrompt: userPrompt
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
 * Validate the `switchScanning` section. Scanning is on only when `enabled` is `true`. The two
 * keys must both look like `KeyboardEvent.code` values ("Space", "KeyA") and differ; otherwise
 * both fall back to Space and Enter. This catches a wrong case or stray space, not a misspelled
 * name such as "Spcae".
 * @param {unknown} section - The raw parsed section.
 * @returns {SwitchScanningConfigType}
 */
function parseSwitchScanning (section: unknown): SwitchScanningConfigType {
  const candidate = section as { enabled?: unknown, moveKey?: unknown, selectKey?: unknown } | undefined;
  const enabled = candidate?.enabled === true;
  const moveKey = candidate?.moveKey;
  const selectKey = candidate?.selectKey;
  if (isKeyCode(moveKey) && isKeyCode(selectKey) && moveKey !== selectKey) {
    return { enabled, moveKey: moveKey as string, selectKey: selectKey as string };
  }
  return { enabled, moveKey: "Space", selectKey: "Enter" };
}

/**
 * Fetch and validate `public/config.json`: the top-level `language` and `maxRecalledRecords`, and the
 * `indicatorLabelLookup`, `telegraphicTranslation`, `symbolSearch`, `svgBuilderString`,
 * `wordPrediction`, `aboutMe` and `switchScanning` sections.
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
      language: parseLanguage(parsed?.language) ?? "en",
      maxRecalledRecords: parseMaxRecalledRecords(parsed?.maxRecalledRecords),
      // Anything other than `false` leaves announcements on: a mistyped config must not
      // silently mute the palette.
      announceSymbolOnInput: typeof parsed?.announceSymbolOnInput === "boolean" ? parsed.announceSymbolOnInput : true,
      // Anything other than `false` leaves the marking on: a mistyped config must not quietly
      // stop telling the user which suggestions a model made.
      markAiSuggestions: typeof parsed?.markAiSuggestions === "boolean" ? parsed.markAiSuggestions : true,
      // Anything other than `false` leaves the shortcut on, as it was before the setting existed.
      backquoteGoesBack: typeof parsed?.backquoteGoesBack === "boolean" ? parsed.backquoteGoesBack : true,
      switchScanning: parseSwitchScanning(parsed?.switchScanning),
      indicatorLabelLookup: indicatorLabelLookup ?? makeDefaultConfig().indicatorLabelLookup,
      telegraphicTranslation: parseTelegraphicTranslation(parsed?.telegraphicTranslation),
      aboutMe: parseAboutMe(parsed?.aboutMe),
      symbolSearch: parseShowFlag(parsed?.symbolSearch, true),
      svgBuilderString: parseShowFlag(parsed?.svgBuilderString, false),
      wordPrediction: parseWordPrediction(parsed?.wordPrediction)
    };
  } catch {
    return makeDefaultConfig();
  }
}
