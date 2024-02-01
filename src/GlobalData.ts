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
import { ContentBmwEncoding } from "./ContentBmwEncoding";
import { CommandClearEncoding } from "./CommandClearEncoding";
import { CommandDelLastEncoding } from "./CommandDelLastEncoding";

export const cellTypeRegistry = {
  "ActionBmwCodeCell": ActionBmwCodeCell,
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
  blissaryIdMap: null
};

export async function loadBlissaryIdMap () {
  const response = await fetch(adaptivePaletteGlobals.blissaryIdMapUrl);
  return await response.json();
}

export async function initAdaptivePaletteGlobals () {
  adaptivePaletteGlobals.blissaryIdMap = await loadBlissaryIdMap();
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
