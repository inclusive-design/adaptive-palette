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

import { html } from "htm/preact";
import { JsonPaletteType } from "./index.d";
import { cellTypeRegistry } from "./GlobalData";
import "./Palette.scss";

type PalettePropsType = {
  json: JsonPaletteType
};

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
    const cellOptions = paletteDefinition.cells[id].options;
    rightColumn = cellOptions.columnStart + cellOptions.columnSpan;
    if (rightColumn > colCount) {
      colCount = rightColumn;
    }
    bottomRow = cellOptions.rowStart + cellOptions.rowSpan;
    if (bottomRow > rowCount) {
      rowCount = bottomRow;
    }
  });
  return { numRows: rowCount, numColumns: colCount };
}

export function Palette (props: PalettePropsType) {

  const paletteDefinition = props.json;
  const rowsCols = countRowsColumns(paletteDefinition);
  const cellIds = Object.keys(paletteDefinition.cells);

  // Loop to create an array of renderings for each cell
  const theCells = [];
  cellIds.forEach((id) => {
    const aCell = paletteDefinition.cells[id];
    const cellOptions = aCell.options;
    const cellComponent = cellTypeRegistry[aCell.type];
    if (!cellComponent) {
      console.error(`Error at rendering the cell type "${aCell.type}". Fix it by defining the render component for this cell type at GlobalData.ts -> cellTypeRegistry.`);
    } else {
      const paletteCell = html`
        <${cellComponent} id="${id}" options=${cellOptions} />
      `;
      theCells.push(paletteCell);
    }
  });
  return html`
    <div
      class="paletteContainer"
      style="grid-template-columns: repeat(${rowsCols.numColumns}, auto);">
        ${theCells}
    </div>
  `;
}
