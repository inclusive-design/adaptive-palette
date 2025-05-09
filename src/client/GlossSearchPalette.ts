/*
 * Copyright 2025 Inclusive Design Research Centre, OCAD University
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
import { v4 as uuidv4 } from "uuid";

import { adaptivePaletteGlobals } from "./GlobalData";
import { Palette } from "./Palette";

export const GLOSS_MATCHES_PALETTE = "Gloss search";

// TODO: define this properly
//type GlossSearchPalettePropsType = {
//  matches: ???,
//  actualLabel: ???
//};

/**
 * Create a JsonPaletteType from an array of matches based on a gloss search.
 *
 * @param {Array} glossMatches - Array of Bliss symbol information objects whose
 *                               glass matches the search term.
 * @param {String} searchTerm - The search term used to find the matches. It is
 *                              used to prefix the label of each cell.
 * @param {String} paletteName - The name for the palette.
 * @param {number} startRow - The row index of the top left cell of the palette
 * @param {number} startColumn - The column index of the top left cell of the
 *                                palette
 * @return {JsonPaletteType} - a palette, in JSON form
 */
export function makeMatchesPalette (glossMatches, searchTerm, startRow, startCol) {
  const jsonPalette = {
    "name": GLOSS_MATCHES_PALETTE,
    "cells": {}
  };
  // Make the palette square, and at least one cell wide.
  const numCols = 5;
  //  const numCols = 1 + glossMatches.length / 3;
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
    jsonPalette.cells[`${match.label}-${uuidv4()}`] = cell;

    // Update rows, columns, etc.
    colIndex++;
    if (colIndex > numCols) {
      rowIndex++;
      colIndex = 0;
    }
  });
  return jsonPalette;
}

export function GlossSearchPalette (props): VNode {

  // Remove any existing gloss search palette from the store.
  adaptivePaletteGlobals.paletteStore.removePalette(GLOSS_MATCHES_PALETTE);

  const { matches, noSearchTerm, searchTerm } = props;

  if (noSearchTerm) {
    return html``;
  }
  else if (matches.length === 0) {
    return html`<p style="color: white;">No matches found</p>`;
  }
  else {
    const glossPalette = makeMatchesPalette(matches, searchTerm, 1, 1);
    return html`<${Palette} json=${glossPalette}/>`;
  }
}

