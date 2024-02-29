/*
 * Copyright 2023-2024 Inclusive Design Research Centre, OCAD University
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

import { html } from "htm/preact";
import { createContext } from "preact";
import { useContext, useState } from "preact/hooks";
import { EncodingType } from "./index.d";

/**
 * The map between cell types (string) and actual components that render corresponding cells
 */
import { ActionBmwCodeCell } from "./ActionBmwCodeCell";
import { ActionBranchToPaletteCell } from "./ActionBranchToPaletteCell";
import { CommandGoBackCell } from "./CommandGoBackCell";
import { ContentBmwEncoding } from "./ContentBmwEncoding";
import { CommandClearEncoding } from "./CommandClearEncoding";
import { CommandDelLastEncoding } from "./CommandDelLastEncoding";
import { PaletteStore } from "./PaletteStore";
import { NavigationStack } from "./NavigationStack";

export const cellTypeRegistry = {
  "ActionBmwCodeCell": ActionBmwCodeCell,
  "ActionBranchToPaletteCell": ActionBranchToPaletteCell,
  "CommandGoBackCell": CommandGoBackCell,
  "ContentBmwEncoding": ContentBmwEncoding,
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
  paletteStore: new PaletteStore(),
  navigationStack: new NavigationStack(),

  // `id` attribute of the HTML element area where the main palette is
  // displayed, set by initAdaptivePaletteGlobals().  It defaults to the empty
  // string and that identifies the `<body>` elements as a default.
  //
  mainPaletteContainerId: ""
};

export async function loadBlissaryIdMap () {
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
export async function initAdaptivePaletteGlobals (mainPaletteContainerId?:string) {
  adaptivePaletteGlobals.blissaryIdMap = await loadBlissaryIdMap();
  adaptivePaletteGlobals.mainPaletteContainerId = mainPaletteContainerId || "";
}

/**
 * Import a palette from the given json file using dynamic `import()`.
 *
 * Note:  There are restrictions regarding the arguments to `import()`:
 * - the path must start with "./" or "../" and not be part of the argument,
 * - the path must end with "/" and not be part of the argument,
 * - the file name extension must be added here (not part of the argument)
 * See the following for more information:
 * https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
 *
 * @param {String} jsonFile  - Name of the JSON file to load, without the
 *                            ".json" extension (added herein).
 * @param {String} path      - Path to the file to without any leading nor
 *                             trailing "/".
 * @return {JsonPaletteType} - The palette itself, or `null` if it could not be
 *                             loaded.
 */
export async function importPaletteFromJsonFile (jsonFile: string, path: string) {
  const paletteJson = await import(`./${path}/${jsonFile}.json`);
  return paletteJson;
}

/**
 * Palette shared states
 */
// Create a context to pass the palette states to palette children components
type PaletteStateType = {
  fullEncoding: EncodingType[],
  setFullEncoding: (param: object[]) => void
};

const defaultPaletteStateContext = {
  fullEncoding: [],
  setFullEncoding: () => {}
};
const paletteStateContext = createContext<PaletteStateType>(defaultPaletteStateContext);

// Create a provider component that will wrap the components needing access to the global states
export function paletteStateProvider(props: {children}) {
  const [fullEncoding, setFullEncoding] = useState([]);

  return html`
    <${paletteStateContext.Provider} value=${{ fullEncoding, setFullEncoding }}>
      ${props.children}
    </${paletteStateContext.Provider}>
  `;
}

// Create a custom hook to easily access the global states within components
export function usePaletteState() {
  return useContext(paletteStateContext);
}
