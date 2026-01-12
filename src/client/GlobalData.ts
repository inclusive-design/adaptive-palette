/*
 * Copyright 2023-2025 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
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
import { ActionBmwCodeCell } from "./ActionBmwCodeCell";
import { ActionBranchToPaletteCell } from "./ActionBranchToPaletteCell";
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
import { ContentBmwEncoding } from "./ContentBmwEncoding";
import { PaletteStore } from "./PaletteStore";
import { NavigationStack } from "./NavigationStack";

export const cellTypeRegistry = {
  "ActionBmwCodeCell": ActionBmwCodeCell,
  "ActionBranchToPaletteCell": ActionBranchToPaletteCell,
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
  "ContentBmwEncoding": ContentBmwEncoding,
};

/**
 * Load the map between the BCI-AV IDs and the code consumed by the Bliss SVG
 * and create the PaletterStore and NavigationStack objects.
 */
export const adaptivePaletteGlobals = {
  // The map between the BCI-AV IDs and the code consumed by the Bliss SVG
  // builder.  The map itself is set asynchronously.
  blissaryIdMapUrl: "https://raw.githubusercontent.com/hlridge/Bliss-Blissary-BCI-ID-Map/main/blissary_to_bci_mapping.json",
  blissaryIdMap: null,
  bciAvSymbols: bliss_symbols,
  paletteStore: new PaletteStore(),
  navigationStack: new NavigationStack(),
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

export async function loadBlissaryIdMap (): Promise<object> {
  const response = await fetch(adaptivePaletteGlobals.blissaryIdMapUrl);
  return await response.json();
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
  adaptivePaletteGlobals.blissaryIdMap = await loadBlissaryIdMap();
  adaptivePaletteGlobals.mainPaletteContainerId = mainPaletteContainerId || "";

  // Set up the system prompts.
  Object.keys(adaptivePaletteGlobals.systemPrompts).forEach( (key) => {
    window.localStorage.setItem(key, adaptivePaletteGlobals.systemPrompts[key]);
  });
}

/**
 * Signal for updating the contents of the ContentBmwEncoding area.  The value
 * of the signal is the current array of EncodingType objects to display in the
 * ContentBmwEncoding area and the position of the caret
 */
export const changeEncodingContents = signal({
  payloads: [],
  caretPosition: -1,
});

/**
 * Signal for updating the contents of the SentenceCompletion area.  The value
 * of the signal is the current array of sentences that are offered as possible
 * completions.
 */
export const sentenceCompletionsSignal = signal([]);
