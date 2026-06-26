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
import type { ContentSignalDataType, BlissSymbolEntry } from "./index.d";

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
import { CommandAddComposition } from "./CommandAddComposition";
import { CommandClearEncoding } from "./CommandClearEncoding";
import { CommandCursorBackward } from "./CommandCursorBackward";
import { CommandCursorForward } from "./CommandCursorForward";
import { CommandDelLastEncoding } from "./CommandDelLastEncoding";
import { CommandGoBackCell } from "./CommandGoBackCell";
import { ContentComposeWordsEntry } from "./ContentComposeWordsEntry";
import { ContentEncoding } from "./ContentEncoding";
import { PaletteStore } from "./PaletteStore";
import { NavigationStack } from "./NavigationStack";
import { ToggleMakeCombination } from "./ToggleMakeCombination";

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
  "CommandAddComposition": CommandAddComposition,
  "CommandClearEncoding": CommandClearEncoding,
  "CommandCursorBackward": CommandCursorBackward,
  "CommandCursorForward": CommandCursorForward,
  "CommandDelLastEncoding": CommandDelLastEncoding,
  "CommandGoBackCell": CommandGoBackCell,
  "ContentComposeWordsEntry": ContentComposeWordsEntry,
  "ContentEncoding": ContentEncoding,
  "ToggleMakeCombination": ToggleMakeCombination
};

export const SYSTEM_PROMPTS_KEY = "Telegraphic System Prompts";

/**
 * Load the map between the BCI-AV IDs and the code consumed by the Bliss SVG
 * and create the PaletterStore and NavigationStack objects.
 */
export const adaptivePaletteGlobals = {
  symbols: bliss_symbols as BlissSymbolEntry[],
  paletteStore: new PaletteStore(),
  navigationStack: new NavigationStack(),
  LLMs: [] as string[],
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
  adaptivePaletteGlobals.LLMs = await getModelNames();
  adaptivePaletteGlobals.mainPaletteContainerId = mainPaletteContainerId || "";

  // Set up the system prompts.
  window.localStorage.setItem(
    SYSTEM_PROMPTS_KEY, JSON.stringify(adaptivePaletteGlobals.systemPrompts)
  );
}

/**
 * Signal for updating the contents of the ContentEncoding area.  The value
 * of the signal is the current array of EncodingType objects to display in the
 * ContentEncoding area and the position of the caret
 */
export const changeEncodingContents = signal<ContentSignalDataType>({
  payloads: [],
  caretPosition: -1,
});

/**
 * Signals for tracking the contents of the word composition input area when
 * the user is composing a Bliss-word.  The contents signal has the same
 * structure as the `changeEncodingContents` above.  The isComposing is a state
 * to indicate whether the mode of the palette is for composing Bliss-words
 */
export const composeWordContents = signal<ContentSignalDataType>({
  payloads: [],
  caretPosition: -1,
});

/**
 * Some of the CommandXxx components use an `aria-controls` to associate them
 * with the element that they control.  For thes components, there is an
 * `ariaControls` field in the associated palette definition .json file.  The
 * follwoing map defines which content signal (see immediatly above) goes with
 * which aria controlled element.
 * TODO: add a type for the map in `index.d.ts`.
 */
export const INPUT_AREA_ID = "content-encoding-area";
export const COMPOSE_AREA_ID = "compose-words-entry";

export const contentSignalMap = {
  "content-encoding-area": changeEncodingContents,
  "compose-words-entry": composeWordContents
};
export const isComposing = signal(false);

/**
 * Signal for updating the contents of the SentenceCompletion area.  The value
 * of the signal is the current array of sentences that are offered as possible
 * completions.
 */
export const sentenceCompletionsSignal = signal<string[]>([]);
