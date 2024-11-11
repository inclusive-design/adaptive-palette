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

import { signal } from "@preact/signals";

/**
 * The map between cell types (string) and actual components that render corresponding cells
 */
import { ActionBmwCodeCell } from "./ActionBmwCodeCell";
import { ActionBranchToPaletteCell } from "./ActionBranchToPaletteCell";
import { ActionIndicatorCell } from "./ActionIndicatorCell";
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

export async function loadBlissaryIdMap (): Promise<object> {
  const response = await fetch(adaptivePaletteGlobals.blissaryIdMapUrl);
  return await response.json();
}

// Ranges and list for all the indicator sybmols.  The range values are the
// minimum and maximum BCI AV ID.
export const indicatorIds = {
  range1: [8993, 9011],
  range2: [24667, 24679],
  range3: [28043, 28046],
  list: [24665, 24807, 25458]
};

/*
 * Evaluate if the given integer matches the BCI AV ID of one of hte indicator
 * symbols.
 * @param {number} bciAvId - The number form of a BciAvIdType
 * @return {boolean}
 */
function isIndicatorId (bciAvId: number): boolean {
  return (
    (bciAvId >= indicatorIds.range1[0] && bciAvId <= indicatorIds.range1[1]) ||
    (bciAvId >= indicatorIds.range2[0] && bciAvId <= indicatorIds.range2[1]) ||
    (bciAvId >= indicatorIds.range3[0] && bciAvId <= indicatorIds.range3[1]) ||
    indicatorIds.list.includes(bciAvId)
  );
}

/*
 * Function to check for one or more indicators in the array form of a
 * BciAvIdType.
 * @param {Array} bciAvId - The array form of a BciAvIdType, a mixture of
 *                          integers and strings.
 * @return {Array} - the positions of the indicator(s).  An empty array is
 *                   returned if there are no indicators.
 */
export function findIndicators (bciAvId: (string|number)[]): number[] {
  const positions = [];
  bciAvId.forEach((item, index) => {
    if (typeof item === "number") {
      if (isIndicatorId(item)) {
        positions.push(index);
      }
    }
  });
  return positions;
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
 * Signal for updating the contents of the ContentBmwEncoding area.  The value
 * of the signal is the current array of EncodingType objects to display in the
 * ContentBmwEncoding area, an empty array to begin with.
 */
export const changeEncodingContents = signal([]);
