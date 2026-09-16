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
import { JsonPaletteType, LayoutInfoType, PaletteIncludeType } from "../index.d";
import { adaptivePaletteGlobals } from "../state/GlobalData";
import { cellTypeRegistry } from "../core/CellTypeRegistry";
import { PALETTE_INCLUDE_TYPE, PaletteStore } from "../core/PaletteStore";
import { generateGridStyle } from "../utils/GridUtils";
import "./Palette.scss";

type PalettePropsType = {
  json: JsonPaletteType,
  // The names of the palettes this one is drawn inside, outermost first.
  includeChain?: string[]
};

type PaletteCellsType = {
  cells: VNode[],
  // The columns a drawn cell occupies.
  renderedColumns: Set<number>,
  // The columns an unavailable cell would have occupied.
  skippedColumns: Set<number>
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

/**
 * Render a palette's cells, and report the columns they occupy.  A cell whose feature is
 * unavailable -- no model, or no configuration for it -- is left out.  Each cell is keyed by its
 * id, so a cell with the same id on the next palette keeps its element.
 *
 * @param {JsonPaletteType} paletteDefinition - The palette whose cells to render.
 * @param {string[]} includeChain - The names of the palettes this one is drawn inside.
 * @return {PaletteCellsType} - The cells, and the columns rendered and skipped.
 */
function renderCells (paletteDefinition: JsonPaletteType, includeChain: string[]): PaletteCellsType {
  const result: PaletteCellsType = { cells: [], renderedColumns: new Set(), skippedColumns: new Set() };
  Object.keys(paletteDefinition.cells).forEach((id) => {
    const aCell = paletteDefinition.cells[id];
    const cellOptions = aCell.options;
    if (!isAvailable(cellOptions)) {
      columnsOf(cellOptions).forEach((column) => result.skippedColumns.add(column));
      return;
    }
    if (aCell.type === PALETTE_INCLUDE_TYPE) {
      const include = renderInclude(id, cellOptions as PaletteIncludeType, [...includeChain, paletteDefinition.name]);
      if (include) {
        columnsOf(cellOptions).forEach((column) => result.renderedColumns.add(column));
        result.cells.push(include);
      }
      return;
    }
    columnsOf(cellOptions).forEach((column) => result.renderedColumns.add(column));
    const cellComponent = cellTypeRegistry[aCell.type as keyof typeof cellTypeRegistry];
    if (!cellComponent) {
      console.error(`Error at rendering the cell type "${aCell.type}". Fix it by defining the render component for this cell type at CellTypeRegistry.ts -> cellTypeRegistry.`);
    } else {
      result.cells.push(html`
        <${cellComponent} key=${id} id="${id}" options=${cellOptions} />
      `);
    }
  });
  return result;
}

/**
 * Render a `PaletteInclude` cell: the included palette is drawn inside the span, with rows and
 * columns of its own.  Nothing is rendered, and an error is logged, when the included palette is
 * not loaded or would be drawn inside itself.
 *
 * @param {string} id - The include cell's id.
 * @param {PaletteIncludeType} options - The include cell's options.
 * @param {string[]} includeChain - The names of the palettes the included one is drawn inside,
 *                                  ending with the palette that holds this cell.
 * @return {VNode | null} - The include cell, or `null` when it cannot be drawn.
 */
function renderInclude (id: string, options: PaletteIncludeType, includeChain: string[]): VNode | null {
  const included = PaletteStore.paletteMap[options.palette];
  if (!included) {
    console.error(`PaletteInclude "${id}": palette "${options.palette}" is not loaded.`);
    return null;
  }
  if (includeChain.includes(options.palette)) {
    console.error(`PaletteInclude "${id}": "${options.palette}" would be drawn inside itself (${includeChain.join(" > ")}).`);
    return null;
  }
  const gridStyle = generateGridStyle(options.columnStart, options.columnSpan, options.rowStart, options.rowSpan);
  return html`
    <div key=${id} class="paletteInclude" style="${gridStyle}">
      <${Palette} json=${included} includeChain=${includeChain} />
    </div>
  `;
}

export function Palette (props: PalettePropsType): VNode {

  const { paletteStore } = adaptivePaletteGlobals;
  const paletteDefinition = props.json;
  const rowsCols = countRowsColumns(paletteDefinition);
  const { cells, renderedColumns, skippedColumns } = renderCells(paletteDefinition, props.includeChain ?? []);
  paletteStore.addPalette(paletteDefinition);

  const emptyColumns = new Set(
    [...skippedColumns].filter((column) => !renderedColumns.has(column))
  );

  return html`
    <div
      data-palettename="${paletteDefinition.name}"
      class="paletteContainer"
      style="grid-template-columns: ${gridTemplateColumns(rowsCols.numColumns, emptyColumns)};">
        ${cells}
    </div>
  `;
}
