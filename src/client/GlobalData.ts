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
import { BlissaryIdMap, MultiLangSymbolsDict, BciAvSymbolsDict } from "./index.d";

/**
 * Default language code for retrieving descriptions from glosses
 */
export const DEFAULT_LANG_CODE = "en";

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
import { CommandCursorBackward } from "./CommandCursorBackward";
import { CommandCursorForward } from "./CommandCursorForward";
import { CommandGoBackCell } from "./CommandGoBackCell";
import { ContentBmwEncoding } from "./ContentBmwEncoding";
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
  "CommandCursorBackward": CommandCursorBackward,
  "CommandCursorForward": CommandCursorForward,
  "CommandGoBackCell": CommandGoBackCell,
  "ContentBmwEncoding": ContentBmwEncoding,
  "CommandClearEncoding": CommandClearEncoding,
  "CommandDelLastEncoding": CommandDelLastEncoding
};

/**
 * Load the map between the BCI-AV IDs and the code consumed by the Bliss SVG
 * and create the PaletterStore and NavigationStack objects.
 */
interface AdaptivePaletteGlobals {
  blissaryIdMap: BlissaryIdMap | null;
  bciAvSymbols: BciAvSymbolsDict | null;
  paletteStore: PaletteStore;
  navigationStack: NavigationStack;
  mainPaletteContainerId: string;
};

const blissaryIdMapUrl: string = "https://raw.githubusercontent.com/hlridge/Bliss-Blissary-BCI-ID-Map/main/blissary_to_bci_mapping.json";
export const bciAvSymbolsDictUrl: string = "https://raw.githubusercontent.com/cindyli/adaptive-palette/refs/heads/feat/use-multi-lang-bliss-dict/public/data/bliss_dict_multi_langs.json";
// export const bciAvSymbolsDictUrl: string = "https://raw.githubusercontent.com/inclusive-design/adaptive-palette/main/public/data/bliss_dict_multi_langs.json";

export const adaptivePaletteGlobals: AdaptivePaletteGlobals = {
  // The map between the BCI-AV IDs and the code consumed by the Bliss SVG
  // builder.  The map itself is set asynchronously.
  blissaryIdMap: null,
  bciAvSymbols: null,
  paletteStore: new PaletteStore(),
  navigationStack: new NavigationStack(),

  // `id` attribute of the HTML element area where the main palette is
  // displayed, set by initAdaptivePaletteGlobals().  It defaults to the empty
  // string and that identifies the `<body>` elements as a default.
  //
  mainPaletteContainerId: ""
};

export async function loadDataFromUrl<T>(url: string): Promise<T> {
  const response = await fetch(url);
  return await response.json();
}

/**
 * Convert the new multi-language data structure to the old single-language format.
 * Transforms from: { bciAvId: { pos, explanation, isCharacter, description, ... } }
 * To: [{ id, description, pos, explanation, isCharacter, ... }]
 *
 * The description is extracted from the description using the DEFAULT_LANG_CODE.
 * If no description exists for the language code, the first available description is used.
 *
 * @param {MultiLangSymbolsDict} multiLangSymbolsDict - The multi-language data structure keyed by BCI AV ID
 * @return {Array} - Array of objects in the old format
 */
export function convertToSingleLangFormat (multiLangSymbolsDict: MultiLangSymbolsDict, langCode: string = DEFAULT_LANG_CODE): BciAvSymbolsDict {
  return Object.entries(multiLangSymbolsDict).map(([bciAvId, symbolData]) => {
    // Extract description from "description" using DEFAULT_LANG_CODE
    let description: string[] = [];
    if (symbolData.description && symbolData.description[langCode]) {
      // Get the first description for the language code
      description = symbolData.description[langCode] || [];
    } else if (symbolData.description) {
      // If the language code is not available, use the first available language
      const firstLangCode = Object.keys(symbolData.description)[0];
      if (firstLangCode && symbolData.description[firstLangCode].length > 0) {
        description = symbolData.description[firstLangCode];
      }
    }

    return {
      id: bciAvId,
      description: description.join(", "),
      pos: symbolData.pos,
      explanation: symbolData.explanation,
      isCharacter: symbolData.isCharacter,
      ...(symbolData.composition && { composition: symbolData.composition })
    };
  });
}

/**
 * Initialize the `adaptivePaletteGlobals` structure.
 * @param {HTMLElement} mainPaletteContainerId  - Optional argument specifying
 *                                                the id of a container element,
 *                                                e.g., a `<div>` element, to
 *                                                use for rendering the the
 *                                                main paletted Defaults to the
 *                                                empty string which denotes
 *                                                the `<body>` element.
 */
export async function initAdaptivePaletteGlobals (mainPaletteContainerId?:string): Promise<void> {
  adaptivePaletteGlobals.blissaryIdMap = await loadDataFromUrl<BlissaryIdMap>(blissaryIdMapUrl);
  const multiLangSymbolsDict = await loadDataFromUrl<MultiLangSymbolsDict>(bciAvSymbolsDictUrl);
  adaptivePaletteGlobals.bciAvSymbols = convertToSingleLangFormat(multiLangSymbolsDict);
  adaptivePaletteGlobals.mainPaletteContainerId = mainPaletteContainerId || "";
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
