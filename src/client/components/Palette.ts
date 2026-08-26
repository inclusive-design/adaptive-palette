/*
 * Copyright The Adaptive Palette copyright holders
 * See the AUTHORS.md file at the top-level directory of this distribution and at
 * https://github.com/inclusive-design/adaptive-palette/raw/main/AUTHORS.md.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { VNode } from "preact";
import { html } from "htm/preact";
import { JsonPaletteType, LayoutInfoType } from "../index.d";
import { adaptivePaletteGlobals } from "../state/GlobalData";
import { cellTypeRegistry } from "../core/CellTypeRegistry";
import "./Palette.scss";

type PalettePropsType = {
  json: JsonPaletteType
};

/**
 * Given a palette defined in a json structure, compute the number of rows
 * and columns in that palette.
 *
 * @param {JsonPaletteType} paletteDefinition - A JSON palette object that
 * lists the positions, heights and widths of the cells in the palette.
 * @return {Object} - The row and column counts: `{ numRows: ..., numColumns: ...}`.
 */
function countRowsColumns (paletteDefinition: JsonPaletteType): Record<string, number> {
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
  return { numRows: rowCount-1, numColumns: colCount-1 };
}

/**
 * The grid columns a cell occupies.
 *
 * @param {LayoutInfoType} options - The cell's layout options.
 * @return {number[]} - The column numbers, 1-based.
 */
function columnsOf (options: LayoutInfoType): number[] {
  return Array.from({ length: options.columnSpan }, (unused, index) => options.columnStart + index);
}

/**
 * The `grid-template-columns` value for a palette: every column an equal fraction of the width,
 * except a column left empty by a cell that was not rendered.  That one collapses, so the cells
 * beside it spread over the space instead of leaving a hole in the row.
 *
 * @param {number} numColumns - The number of columns in the palette.
 * @param {Set<number>} emptyColumns - The columns no rendered cell occupies.
 * @return {string} - The CSS value.
 */
function gridTemplateColumns (numColumns: number, emptyColumns: Set<number>): string {
  if (emptyColumns.size === 0) {
    return `repeat(${numColumns}, 1fr)`;
  }
  const tracks = [];
  for (let column = 1; column <= numColumns; column++) {
    tracks.push(emptyColumns.has(column) ? "0fr" : "1fr");
  }
  return tracks.join(" ");
}

/**
 * Whether a cell's feature is available: it needs a model, or a `config.json` section, or
 * neither.  An unavailable cell is left out of the palette.
 *
 * @param {LayoutInfoType} options - The cell's layout options.
 * @return {boolean} - `true` when the cell can be rendered.
 */
function isAvailable (options: LayoutInfoType): boolean {
  const { models, config } = adaptivePaletteGlobals;
  const hasModel = !options.requiresModel || models.length > 0;
  const isConfigured = !options.requiresConfig || !!config[options.requiresConfig];
  return hasModel && isConfigured;
}

export function Palette (props: PalettePropsType): VNode {

  const { paletteStore } = adaptivePaletteGlobals;
  const paletteDefinition = props.json;
  const rowsCols = countRowsColumns(paletteDefinition);
  const cellIds = Object.keys(paletteDefinition.cells);

  // Loop to create an array of renderings for each cell.  A cell whose feature is unavailable
  // -- no model, or no configuration for it -- is left out.
  const theCells: VNode[] = [];
  const skippedColumns = new Set<number>();
  const renderedColumns = new Set<number>();
  cellIds.forEach((id) => {
    const aCell = paletteDefinition.cells[id];
    const cellOptions = aCell.options;
    if (!isAvailable(cellOptions)) {
      columnsOf(cellOptions).forEach((column) => skippedColumns.add(column));
      return;
    }
    columnsOf(cellOptions).forEach((column) => renderedColumns.add(column));
    const cellComponent = cellTypeRegistry[aCell.type as keyof typeof cellTypeRegistry];
    if (!cellComponent) {
      console.error(`Error at rendering the cell type "${aCell.type}". Fix it by defining the render component for this cell type at CellTypeRegistry.ts -> cellTypeRegistry.`);
    } else {
      const paletteCell = html`
        <${cellComponent} id="${id}" options=${cellOptions} />
      `;
      theCells.push(paletteCell);
    }
  });
  paletteStore.addPalette(paletteDefinition);

  const emptyColumns = new Set(
    [...skippedColumns].filter((column) => !renderedColumns.has(column))
  );

  return html`
    <div
      data-palettename="${paletteDefinition.name}"
      class="paletteContainer"
      style="grid-template-columns: ${gridTemplateColumns(rowsCols.numColumns, emptyColumns)};">
        ${theCells}
    </div>
  `;
}
