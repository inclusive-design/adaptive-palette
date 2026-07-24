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
import { getModelNames } from "./ollamaApi";
import { initIndicatorLabels } from "./IndicatorLabelsUtils";
import { initSvgCompositeDefinitions } from "./SvgUtils";
import type { ContentSignalDataType, BlissSymbolEntry, AdaptivePaletteConfigType } from "./index.d";

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
import { ActionTextCell } from "./ActionTextCell";
import { CommandClearEncoding } from "./CommandClearEncoding";
import { CommandCursorBackward } from "./CommandCursorBackward";
import { CommandCursorForward } from "./CommandCursorForward";
import { CommandDelLastEncoding } from "./CommandDelLastEncoding";
import { CommandGoBackCell } from "./CommandGoBackCell";
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
  "ActionTextCell": ActionTextCell,
  "CommandClearEncoding": CommandClearEncoding,
  "CommandCursorBackward": CommandCursorBackward,
  "CommandCursorForward": CommandCursorForward,
  "CommandDelLastEncoding": CommandDelLastEncoding,
  "CommandGoBackCell": CommandGoBackCell,
  "ContentEncoding": ContentEncoding,
};

export const SYSTEM_PROMPTS_KEY = "Telegraphic System Prompts";

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
  systemPrompts: {
    "What express": "What does this express? Give the top five answers.  Do not add a preamble like, 'Here are the top five answers.'",
    "Single Sentence": "Convert the telegraphic speech to a single sentence. Give the top five best answers.  Answer with a single grammatically correct sentence.  Number the five answers clearly.  Do not add a preamble like, 'Here are the top five answers.'",
    "Single Sentence Young": "Convert the telegraphic speech to a single sentence. Give the top five best answers.  Answer with a single grammatically correct sentence in the style of an elementary school aged child, using the first person singular.  Number the five answers clearly.  Do not add a preamble like, 'Here are the top five answers.'",
  },
  // `id` attribute of the HTML element area where the main palette is
  // displayed, set by initAdaptivePaletteGlobals().  It defaults to the empty
  // string and that identifies the `<body>` elements as a default.
  //
  mainPaletteContainerId: ""
};

/**
 * Fetch and validate `public/config.json`. Any failure -- missing file, missing
 * `indicatorLabelLookup` section, malformed JSON, failed fetch -- silently disables
 * the Ollama fallback tier; no user-facing error, per design.
 * @returns {Promise<AdaptivePaletteConfigType>}
 */
async function loadConfig (): Promise<AdaptivePaletteConfigType> {
  const disabled: AdaptivePaletteConfigType = {
    indicatorLabelLookup: { useModelQueryFallback: false, model: "" }
  };
  try {
    const response = await fetch("/config.json");
    if (!response.ok) {
      return disabled;
    }
    const parsed: unknown = await response.json();
    const section = (parsed as { indicatorLabelLookup?: unknown })?.indicatorLabelLookup as
      { useModelQueryFallback?: unknown; model?: unknown } | undefined;
    if (!section || typeof section.useModelQueryFallback !== "boolean") {
      return disabled;
    }
    return {
      indicatorLabelLookup: {
        useModelQueryFallback: section.useModelQueryFallback,
        model: typeof section.model === "string" ? section.model : ""
      }
    };
  } catch {
    return disabled;
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

  // Set up the system prompts.
  window.localStorage.setItem(
    SYSTEM_PROMPTS_KEY, JSON.stringify(adaptivePaletteGlobals.systemPrompts)
  );
}

/**
 * Signal for updating the contents of the ContentEncoding area.  The value
 * of the signal is the current array of SymbolEncodingType objects to display
 * in the ContentEncoding area and the position of the caret
 */
export const changeEncodingContents = signal<ContentSignalDataType>({
  payloads: [],
  caretPosition: -1,
});

/**
 * Signal for updating the contents of the SentenceCompletion area.  The value
 * of the signal is the current array of sentences that are offered as possible
 * completions.
 */
export const sentenceCompletionsSignal = signal<string[]>([]);
