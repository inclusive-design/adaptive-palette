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

import { render } from "preact";
import { html } from "htm/preact";
import { PaletteCell } from "./PaletteCell";

/**
 * Given a palette defined in a json structure, compute the number of rows
 * and columns in that palette.
 *
 * @param {Object} paletteDefinition - An object that lists the positions,
 *                 heights and widths of the cells in the palette.
 * @return {Object} - The row and column counts: `{ numRows: ..., numColumns: ...}`.
 */
function countRowsColumns (paletteDefinition) {
  let rowCount = 0;
  let colCount = 0;
  let rightColumn = 0;
  let bottomRow = 0;
  const cellIds = Object.keys(paletteDefinition.cells);
  cellIds.forEach((id) => {
    const aCell = paletteDefinition.cells[id];
    rightColumn = aCell.columnStart + aCell.columnSpan;
    if (rightColumn > colCount) {
      colCount = rightColumn;
    }
    bottomRow = aCell.rowStart + aCell.rowSpan;
    if (bottomRow > rowCount) {
      rowCount = bottomRow;
    }
  });
  return { numRows: rowCount, numColumns: colCount };
}

export function Palette (props) {

  const paletteDefinition = props.json;
  const rowsCols = countRowsColumns(paletteDefinition);
  const cellIds = Object.keys(paletteDefinition.cells);

  // Loop to create an array of renderings for each cell
  const theCells = [];
  cellIds.forEach((id) => {
    const aCell = paletteDefinition.cells[id];
    const paletteCell = html`
      <${PaletteCell} id="${id}" labelText="${aCell.label}"
        columnStart="${aCell.columnStart}" columnSpan="${aCell.columnSpan}"
        rowStart="${aCell.rowStart}" rowSpan="${aCell.rowSpan}"
      />`;
    theCells.push(paletteCell);
  });

  render(html`
    <div
      class="paletteContainer"
      style="grid-template-columns: repeat(${rowsCols.numColumns}, auto);">
        ${theCells}
    </div>`, document.getElementById("paletteCell")
  );

}

import bmwJson from "./keyboards/bmw_keys.json";
render (html`<${Palette} json=${bmwJson}/>`, document.getElementById("paletteCell"));

