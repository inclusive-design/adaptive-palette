/*
 * Copyright 2025-2026 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { VNode } from "preact";
import { html } from "htm/preact";
import { useEffect, useMemo } from "preact/hooks";

import { adaptivePaletteGlobals } from "./GlobalData";
import { MatchType, JsonPaletteType } from "./index.d"; 
import { Palette } from "./Palette";

export const GLOSS_MATCHES_PALETTE = "Gloss search";
const MAXIMUM_COLUMNS = 5;

type GlossSearchPaletteProps = {
  matches: MatchType[],
  noSearchTerm: boolean,
  searchTerm: string
};

/**
 * Create a JsonPaletteType from an array of matches based on a gloss search.
 *
 * @param {MatchType[]} glossMatches - Array of Bliss symbol information objects whose
 *                               gloss matches the search term.
 * @param {String} searchTerm - The search term used to find the matches. It is
 *                              used to prefix the label of each cell.
 * @param {number} startRow - The row index of the top left cell of the palette
 * @param {number} startCol - The column index of the top left cell of the palette
 * @return {JsonPaletteType} - a palette, in JSON form
 */
export function makeMatchesPalette (
  glossMatches: MatchType[], 
  searchTerm: string, 
  startRow: number, 
  startCol: number
): JsonPaletteType {
  const jsonPalette: JsonPaletteType = {
    name: GLOSS_MATCHES_PALETTE,
    cells: {}
  };
  // Make the palette at most MAXIMUM_COLUMNS wide.
  const numCols = Math.min(glossMatches.length, MAXIMUM_COLUMNS);
  let rowIndex = 0;
  let colIndex = 0;

  glossMatches.forEach((match) => {
    const currentRow = startRow + rowIndex;
    const currentCol = startCol + colIndex;

    // Create a cell object for the current `match`.
    const cell = {
      type: "ActionGlossSearchCell",
      options: {
        label: `${searchTerm}: ${match.label}`,
        bciAvId: match.bciAvId,
        rowStart: currentRow,
        rowSpan: 1,
        columnStart: currentCol,
        columnSpan: 1
      }
    };
    jsonPalette.cells[`${match.label}-${match.bciAvId}`] = cell;

    // Update rows, columns, etc.
    colIndex++;
    if (colIndex >= numCols) {
      rowIndex++;
      colIndex = 0;
    }
  });
  return jsonPalette;
}

export function GlossSearchPalette (props: GlossSearchPaletteProps): VNode | null {
  const { matches, noSearchTerm, searchTerm } = props;

  // Cleans up the palette from the global store whenever the component unmounts.
  useEffect(() => {
    return () => {
      adaptivePaletteGlobals.paletteStore.removePalette(GLOSS_MATCHES_PALETTE);
    };
  }, []);

  // Memoize the palette generation so it doesn't rebuild on unrelated re-renders
  const glossPalette = useMemo(() => {
    if (noSearchTerm || matches.length === 0) return null;
    return makeMatchesPalette(matches, searchTerm, 1, 1);
  }, [matches, searchTerm, noSearchTerm]);

  if (noSearchTerm) {
    return null;
  }
  
  if (matches.length === 0) {
    return html`<p role="status">No matches found</p>`;
  }
  
  return html`<${Palette} json=${glossPalette} />`;
}
