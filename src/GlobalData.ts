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

/**
 * The map between cell types (string) and actual components that render corresponding cells
 */
import { ActionBmwCodeCell } from "./ActionBmwCodeCell";
import { ActionBranchToPalette } from "./ActionBranchToPalette";
import { ContentBmwEncoding } from "./ContentBmwEncoding";
import { CommandClearEncoding } from "./CommandClearEncoding";
import { CommandDelLastEncoding } from "./CommandDelLastEncoding";
import { PaletteStore } from "./PaletteStore";

export const cellTypeRegistry = {
  "ActionBmwCodeCell": ActionBmwCodeCell,
  "ActionBranchToPalette": ActionBranchToPalette,
  "ContentBmwEncoding": ContentBmwEncoding,
  "CommandClearEncoding": CommandClearEncoding,
  "CommandDelLastEncoding": CommandDelLastEncoding
};

/**
 * Load the map between the BCI-AV IDs and the code consumed by the Bliss SVG builder
 */
export const adaptivePaletteGlobals = {
  // The map between the BCI-AV IDs and the code consumed by the Bliss SVG
  // builder.  The map itself is set asynchronously.
  blissaryIdMapUrl: "https://raw.githubusercontent.com/hlridge/Bliss-Blissary-BCI-ID-Map/main/blissary_to_bci_mapping.json",
  blissaryIdMap: null,
  paletteStore: new PaletteStore()
};

export async function loadBlissaryIdMap () {
  const response = await fetch(adaptivePaletteGlobals.blissaryIdMapUrl);
  return await response.json();
}

export async function initAdaptivePaletteGlobals () {
  adaptivePaletteGlobals.blissaryIdMap = await loadBlissaryIdMap();
}

// TODO: possibly move this function into the PaletteStore object, OR just
// use "import path/to/json/file.json".
export async function getPaletteJson (jsonFile) {
  const response = await fetch(jsonFile);
  console.debug("response is '" + ( response ? "non-null" : "null" ));
  const paletteJson = await response.json();
  console.debug("paletteJson is '" + ( paletteJson ? "non-null" : "null" ));
  return paletteJson;
}

/**
 * Palette shared states
 */
// Create a context to pass the palette states to palette children components
const paletteStateContext = createContext(null);

// Create a provider component that will wrap the components needing access to the global states
export function paletteStateProvider({ children }) {
  const [fullEncoding, setFullEncoding] = useState([]);

  return html`
    <${paletteStateContext.Provider} value=${{ fullEncoding, setFullEncoding }}>
      ${children}
    </${paletteStateContext.Provider}>
  `;
}

// Create a custom hook to easily access the global states within components
export function usePaletteState() {
  return useContext(paletteStateContext);
}
