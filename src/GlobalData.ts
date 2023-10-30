/*
 * Copyright 2023 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

"use strict";

/**
 * Populate and export global data
 */

import { ActionBmwCodeCell } from "./ActionBmwCodeCell";

export const adaptivePaletteGlobals = {
  // The map between the BCI-AV IDs and the code consumed by the Bliss SVG
  // builder.  The map itself is set asynchronously.
  blissaryIdMapUrl: "https://raw.githubusercontent.com/hlridge/Bliss-Blissary-BCI-ID-Map/main/blissary_to_bci_mapping.json",
  blissaryIdMap: null
};

// For debugging
let fetchCount = 0;

export async function loadBlissaryIdMap () {
  const response = await fetch(adaptivePaletteGlobals.blissaryIdMapUrl);
  const idMap = await response.json();
  fetchCount++;
  console.debug(`loadBlissaryIdMap(): fetchCount = ${fetchCount}; idMap is ` + ( idMap === null ? "null": "not null"));
  return idMap;
}

export async function initAdaptivePaletteGlobals () {
  adaptivePaletteGlobals.blissaryIdMap = await loadBlissaryIdMap();
}

/**
 * The map between cell types (string) and actual components that render cells
 */
export const cellTypeRegistry = {
  "ActionBmwCodeCell": ActionBmwCodeCell
};
