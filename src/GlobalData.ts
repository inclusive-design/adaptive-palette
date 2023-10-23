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

// For debugging
let fetchCount = 0;

async function loadBlissaryIdMap () {
  const response = await fetch("https://raw.githubusercontent.com/hlridge/Bliss-Blissary-BCI-ID-Map/main/blissary_to_bci_mapping.json");
  const idMap = await response.json();
  fetchCount++;
  console.debug(`loadBlissaryIdMap(): fetchCount = ${fetchCount}; idMap is ` + ( idMap === null ? "null": "not null"));
  return idMap;
}

/**
 * The map between the BCI-AV IDs and the code consumed by the Bliss SVG builder
 */
export const blissaryIdMap = await loadBlissaryIdMap();

/**
 * The map between cell types (string) and actual components that render cells
 */
export const cellTypeRegistry = {
  "ActionBmwCodeCell": ActionBmwCodeCell
};
