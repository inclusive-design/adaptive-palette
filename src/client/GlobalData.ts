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
 * Populate and export global data
 */
import { signal } from "@preact/signals";
import { getModelNames } from "./OllamaApi";
import { initIndicatorLabels } from "./IndicatorLabelsUtils";
import { initSvgCompositeDefinitions } from "./SvgUtils";
import type {
  ContentSignalDataType, BlissSymbolEntry, AdaptivePaletteConfigType,
  IndicatorLabelLookupConfigType, TelegraphicTranslationConfigType, FeatureVisibilityConfigType
} from "./index.d";

// NOTE: this import causes a warning serving the application using the `vite`
// server.  The warning suggests to *not* use the `public` folder but to use
// the `src` folder instead.  However, this code is also served using node
// express and it is in the proper location for that envionment.  A copy of the
// warning follows:
// "Assets in public directory cannot be imported from JavaScript.
//  If you intend to import that asset, put the file in the src directory, and use /src/data/bliss_symbol_explanations.json instead of /public/data/bliss_symbol_explanations.json.
//  If you intend to use the URL of that asset, use /data/bliss_symbol_explanations.json?url.
//  Files in the public directory are served at the root path.
//  Instead of /public/data/bliss_symbol_explanations.json, use /data/bliss_symbol_explanations.json."
import bliss_symbols from "../../public/data/bliss_symbol_explanations.json";

// NOTE: This file doesn't import cell components to prevent circular dependencies.
// Those are imported in `cellTypeRegistry.ts`
import { PaletteStore } from "./PaletteStore";
import { NavigationStack } from "./NavigationStack";

export const NO_MODELS_MESSAGE = "No models available. Start Ollama to enable AI features.";

/**
 * Load the map between the BCI-AV IDs and the code consumed by the Bliss SVG
 * and create the PaletterStore and NavigationStack objects.
 */
export const adaptivePaletteGlobals = {
  symbols: bliss_symbols.data as BlissSymbolEntry[],
  paletteStore: new PaletteStore(),
  navigationStack: new NavigationStack(),
  models: [] as string[],
  config: {
    indicatorLabelLookup: { useModelQueryFallback: false, model: "", systemPrompt: "", userPrompt: "" },
    symbolSearch: { show: true },
    svgBuilderString: { show: false }
  } as AdaptivePaletteConfigType,
  indicatorLabels: {} as Record<string, string>,
  // `id` attribute of the HTML element area where the main palette is
  // displayed, set by initAdaptivePaletteGlobals().  It defaults to the empty
  // string and that identifies the `<body>` elements as a default.
  //
  mainPaletteContainerId: ""
};

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
  const isFilledString = (value: unknown): boolean => typeof value === "string" && value.trim().length > 0;
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
 * @param {unknown} section - The raw parsed section.
 * @returns {TelegraphicTranslationConfigType | undefined}
 */
function parseTelegraphicTranslation (section: unknown): TelegraphicTranslationConfigType | undefined {
  const candidate = section as {
    model?: unknown, numSentences?: unknown, maxStoredRecords?: unknown,
    systemPrompt?: unknown, userPrompt?: unknown
  } | undefined;
  if (!candidate) {
    return undefined;
  }
  const { model, numSentences, maxStoredRecords, systemPrompt, userPrompt } = candidate;
  const isFilledString = (value: unknown): boolean => typeof value === "string" && value.trim().length > 0;
  const isPositiveInteger = (value: unknown): boolean => Number.isInteger(value) && (value as number) > 0;

  // `maxStoredRecords: 0` is valid for keeping the feature while logging nothing
  // `numSentences: 0` is invalid because a query cannot return nothing.
  if (typeof model !== "string" || !isPositiveInteger(numSentences) ||
      !(isPositiveInteger(maxStoredRecords) || maxStoredRecords === 0) ||
      !isFilledString(systemPrompt) || !isFilledString(userPrompt)) {
    return undefined;
  }
  return {
    model,
    numSentences: numSentences as number,
    maxStoredRecords: maxStoredRecords as number,
    systemPrompt: systemPrompt as string,
    userPrompt: userPrompt as string
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
 * Fetch and validate `public/config.json`, its `indicatorLabelLookup`,
 * `telegraphicTranslation`, `symbolSearch`, and `svgBuilderString` sections.
 * @returns {Promise<AdaptivePaletteConfigType>}
 */
async function loadConfig (): Promise<AdaptivePaletteConfigType> {
  const disabledIndicatorLookup = { useModelQueryFallback: false, model: "", systemPrompt: "", userPrompt: "" };
  const fallbackConfig: AdaptivePaletteConfigType = {
    indicatorLabelLookup: disabledIndicatorLookup,
    symbolSearch: { show: true },
    svgBuilderString: { show: false }
  };
  try {
    const response = await fetch("/config.json");
    if (!response.ok) {
      return fallbackConfig;
    }
    const parsed = await response.json() as Record<string, unknown>;
    const indicatorLabelLookup = parseIndicatorLabelLookup(parsed?.indicatorLabelLookup);
    return {
      indicatorLabelLookup: indicatorLabelLookup ?? disabledIndicatorLookup,
      telegraphicTranslation: parseTelegraphicTranslation(parsed?.telegraphicTranslation),
      symbolSearch: parseShowFlag(parsed?.symbolSearch, true),
      svgBuilderString: parseShowFlag(parsed?.svgBuilderString, false)
    };
  } catch {
    return fallbackConfig;
  }
}

/**
 * Initialize the `adaptivePaletteGlobals` structure.
 * @param {HTMLElement} mainPaletteContainerId  - Optional argument specifying
 *                                                the id of a container element,
 *                                                e.g., a `<div>` element, to
 *                                                use for rendering the the
 *                                                main paletted Defaults to the
 *                                                empty string which denotes
 *                                                the `<body>delement.
 */
export async function initAdaptivePaletteGlobals (mainPaletteContainerId?:string): Promise<void> {
  initSvgCompositeDefinitions();
  adaptivePaletteGlobals.mainPaletteContainerId = mainPaletteContainerId || "";
  const [ models, config ] = await Promise.all([
    getModelNames(),
    loadConfig(),
    initIndicatorLabels()
  ]);
  adaptivePaletteGlobals.models = models;
  adaptivePaletteGlobals.config = config;

  // Clean up the system prompts left in local storage by earlier builds.
  window.localStorage.removeItem("Telegraphic System Prompts");
}

/**
 * Signal for updating the contents of the ContentEncoding area.  The value
 * of the signal is an array of SymbolEncodingType objects to display symbols
 * in the ContentEncoding area. It also tracks the position of the caret.
 */
export const changeEncodingContents = signal<ContentSignalDataType>({
  payloads: [],
  caretPosition: -1,
});

// Re-exported so consumers import navigation state from the same place as the other
// globals.  Declared in its own module to keep `NavigationStack` free of a cycle back
// into this file -- see NavigationSignals.ts.
export { navigationDepth } from "./NavigationSignals";
