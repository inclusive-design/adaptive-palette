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
import { effect, signal } from "@preact/signals";
import { getModelNames } from "./ollamaApi";
import { initIndicatorLabels } from "./IndicatorLabelsUtils";
import { initSvgCompositeDefinitions } from "./SvgUtils";
import type {
  ContentSignalDataType, BlissSymbolEntry, AdaptivePaletteConfigType,
  IndicatorLabelLookupConfigType, TelegraphicTranslationConfigType, SentenceCompletionsStateType
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

/**
 * The map between cell types (string) and actual components that render corresponding cells
 */
import { ActionCodeCell } from "./ActionCodeCell";
import { ActionBranchToPaletteCell } from "./ActionBranchToPaletteCell";
import { ActionGlossSearchCell } from "./ActionGlossSearchCell";
import { ActionIndicatorCell } from "./ActionIndicatorCell";
import { ActionPreModifierCell } from "./ActionPreModifierCell";
import { ActionPostModifierCell } from "./ActionPostModifierCell";
import { ActionRemoveIndicatorCell } from "./ActionRemoveIndicatorCell";
import { ActionRemoveModifierCell } from "./ActionRemoveModifierCell";
import { CommandClearEncoding } from "./CommandClearEncoding";
import { CommandCursorBackward } from "./CommandCursorBackward";
import { CommandCursorForward } from "./CommandCursorForward";
import { CommandDelLastEncoding } from "./CommandDelLastEncoding";
import { CommandGoBackCell } from "./CommandGoBackCell";
import { CommandMakeSentence } from "./CommandMakeSentence";
import { ContentEncoding } from "./ContentEncoding";
import { PaletteStore } from "./PaletteStore";
import { NavigationStack } from "./NavigationStack";

export const cellTypeRegistry = {
  "ActionCodeCell": ActionCodeCell,
  "ActionBranchToPaletteCell": ActionBranchToPaletteCell,
  "ActionGlossSearchCell": ActionGlossSearchCell,
  "ActionIndicatorCell": ActionIndicatorCell,
  "ActionPreModifierCell": ActionPreModifierCell,
  "ActionPostModifierCell": ActionPostModifierCell,
  "ActionRemoveIndicatorCell": ActionRemoveIndicatorCell,
  "ActionRemoveModifierCell": ActionRemoveModifierCell,
  "CommandClearEncoding": CommandClearEncoding,
  "CommandCursorBackward": CommandCursorBackward,
  "CommandCursorForward": CommandCursorForward,
  "CommandDelLastEncoding": CommandDelLastEncoding,
  "CommandGoBackCell": CommandGoBackCell,
  "CommandMakeSentence": CommandMakeSentence,
  "ContentEncoding": ContentEncoding,
};

export const NO_MODELS_MESSAGE = "No models available. Start Ollama to enable AI features.";

/**
 * Load the map between the BCI-AV IDs and the code consumed by the Bliss SVG
 * and create the PaletterStore and NavigationStack objects.
 */
export const adaptivePaletteGlobals = {
  symbols: bliss_symbols.data as BlissSymbolEntry[],
  paletteStore: new PaletteStore(),
  navigationStack: new NavigationStack(),
  LLMs: [] as string[],
  config: { indicatorLabelLookup: { useModelQueryFallback: false, model: "" } } as AdaptivePaletteConfigType,
  indicatorLabels: {} as Record<string, string>,
  // `id` attribute of the HTML element area where the main palette is
  // displayed, set by initAdaptivePaletteGlobals().  It defaults to the empty
  // string and that identifies the `<body>` elements as a default.
  //
  mainPaletteContainerId: ""
};

/**
 * Validate the `indicatorLabelLookup` section of the config. Returns `undefined` when
 * the section is missing or malformed, which disables the Ollama fallback tier.
 * @param {unknown} section - The raw parsed section.
 * @returns {IndicatorLabelLookupConfigType | undefined}
 */
function parseIndicatorLabelLookup (section: unknown): IndicatorLabelLookupConfigType | undefined {
  const candidate = section as { useModelQueryFallback?: unknown, model?: unknown } | undefined;
  if (!candidate || typeof candidate.useModelQueryFallback !== "boolean") {
    return undefined;
  }
  return {
    useModelQueryFallback: candidate.useModelQueryFallback,
    model: typeof candidate.model === "string" ? candidate.model : ""
  };
}

/* 
 * Validates the `telegraphicTranslation` configuration section:
 * 1. Prompt fields are required because there are no hardcoded fallback prompts. 
 * 2. A partially configured section is treated as completely missing, causing the feature 
 * to report as unconfigured rather than executing with empty prompts. 
 * 3.The `model` field may be an empty string, which indicates it should use Ollama's first
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
 * Fetch and validate `public/config.json`, `indicatorLabelLookup` section.
 * @returns {Promise<AdaptivePaletteConfigType>}
 */
async function loadConfig (): Promise<AdaptivePaletteConfigType> {
  const disabledIndicatorLookup = { useModelQueryFallback: false, model: "" };
  try {
    const response = await fetch("/config.json");
    if (!response.ok) {
      return { indicatorLabelLookup: disabledIndicatorLookup };
    }
    const parsed = await response.json() as Record<string, unknown>;
    return {
      indicatorLabelLookup: parseIndicatorLabelLookup(parsed?.indicatorLabelLookup) ?? disabledIndicatorLookup,
      telegraphicTranslation: parseTelegraphicTranslation(parsed?.telegraphicTranslation)
    };
  } catch {
    return { indicatorLabelLookup: disabledIndicatorLookup };
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
  const [ llms, config ] = await Promise.all([
    getModelNames(),
    loadConfig(),
    initIndicatorLabels()
  ]);
  adaptivePaletteGlobals.LLMs = llms;
  adaptivePaletteGlobals.config = config;
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

/**
 * Signal driving the sentence-translation area below the input palette. `idle` renders
 * nothing; `working` and `error` render a single message; `ready` renders the choices,
 * and carries the message and model that produced them so a log record can still be
 * written after the input area has moved on.
 */
export const sentenceCompletionsSignal = signal<SentenceCompletionsStateType>({ status: "idle" });

/**
 * Discard the message in the input area together with any sentences made from it.
 * @returns {void}
 */
export function clearMessageAndChoices (): void {
  changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  sentenceCompletionsSignal.value = { status: "idle" };
}

/**
 * The message currently in the input area: the labels of its symbols, space separated.
 * @returns {string}
 */
export function currentTelegraphicMessage (): string {
  return changeEncodingContents.value.payloads.map((payload) => payload.label).join(" ");
}

// If the user edits the message, sentences belong to that become stale. Discard them.
effect((): void => {
  const message = currentTelegraphicMessage();
  const state = sentenceCompletionsSignal.peek();
  if ((state.status === "working" || state.status === "ready") &&
      state.telegraphicMessage !== message) {
    sentenceCompletionsSignal.value = { status: "idle" };
  }
});
