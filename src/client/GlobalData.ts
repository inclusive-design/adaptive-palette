/*
 * Copyright 2023-2026 Inclusive Design Research Centre, OCAD University
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
// server.  The warning suggests to *not* us the `public` folder but to use
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
import { CommandAddComposition } from "./CommandAddComposition";
import { CommandCursorBackward } from "./CommandCursorBackward";
import { CommandCursorForward } from "./CommandCursorForward";
import { CommandGoBackCell } from "./CommandGoBackCell";
import { ContentBmwEncoding } from "./ContentBmwEncoding";
import { ContentComposeWordsEntry } from "./ContentComposeWordsEntry";
import { CommandClearEncoding } from "./CommandClearEncoding";
import { CommandDelLastEncoding } from "./CommandDelLastEncoding";
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
  "CommandAddComposition": CommandAddComposition,
  "CommandCursorBackward": CommandCursorBackward,
  "CommandCursorForward": CommandCursorForward,
  "CommandGoBackCell": CommandGoBackCell,
  "ContentBmwEncoding": ContentBmwEncoding,
  "ContentComposeWordsEntry": ContentComposeWordsEntry,
  "CommandClearEncoding": CommandClearEncoding,
  "CommandDelLastEncoding": CommandDelLastEncoding
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
}

/**
 * Global signals and map
 */

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
 * Signals for tracking the contents of the word composition input area when
 * the user is composing a Bliss-word.  The contents signal has the same
 * structure as the `changeEncodingContents` above.  The isComposing is a state
 * to indicate whether the mode of the palette is for composing Bliss-words
 */
export const composeWordContents = signal({
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
export const INPUT_AREA_ID = "bmw-encoding-area";
export const COMPOSE_AREA_ID = "compose-words-entry";

export const contentSignalMap = {
  "bmw-encoding-area": changeEncodingContents,
  "compose-words-entry": composeWordContents
};
export const isComposing = signal(false);

