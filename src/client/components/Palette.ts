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
import { Language, LabelType, parseLanguage, resolveLabel } from "../i18n/I18n";
import "./Palette.scss";

type PalettePropsType = {
  json: JsonPaletteType,
  // The chain of nested palettes: starting from the outermost then move inwards.
  includeChain?: JsonPaletteType[],
  // True for the palette `CurrentPalette` draws: the whole screen below the top bar.
  isScreen?: boolean,
  // True for a palette the screen includes directly: the screen draws its sentence cell.
  inScreen?: boolean
};

// The cell the screen palette draws as the sentence layer.
const SENTENCE_CHOICES_TYPE = "ContentSentenceChoices";

type PaletteCellsType = {
  cells: VNode[],
  // The columns a drawn cell occupies.
  renderedColumns: Set<number>,
  // The columns an unavailable cell would have occupied.
  skippedColumns: Set<number>,
  // The languages the drawn cells' labels are shown in.
  labelLanguages: Set<Language>
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
 * A column's minimum is 0, not its content's width: a plain `1fr` cannot shrink below its
 * content, so a row of many cells ran off the right of a tablet screen.
 *
 * @param {number} numColumns - The number of columns in the palette.
 * @param {Set<number>} emptyColumns - The columns no rendered cell occupies.
 * @return {string} - The CSS value.
 */
function gridTemplateColumns (numColumns: number, emptyColumns: Set<number>): string {
  if (emptyColumns.size === 0) {
    return `repeat(${numColumns}, minmax(0, 1fr))`;
  }
  const tracks = [];
  for (let column = 1; column <= numColumns; column++) {
    tracks.push(emptyColumns.has(column) ? "0fr" : "minmax(0, 1fr)");
  }
  return tracks.join(" ");
}

/**
 * The `grid-template-rows` value for the screen palette. A row holding only included palettes,
 * such as the header, takes its content's height: the bands in it have fixed heights. Every
 * other row shares what is left, down to 64px, the smallest vocabulary target.
 *
 * @param {JsonPaletteType} paletteDefinition - The screen palette.
 * @param {number} numRows - The number of rows in it.
 * @return {string} - The CSS value.
 */
function gridTemplateRows (paletteDefinition: JsonPaletteType, numRows: number): string {
  const cells = Object.values(paletteDefinition.cells);
  const tracks: string[] = [];
  for (let row = 1; row <= numRows; row++) {
    const inRow = cells.filter(({ options }) => options.rowStart <= row && row < options.rowStart + options.rowSpan);
    const onlyIncludes = inRow.length > 0 && inRow.every((cell) => cell.type === PALETTE_INCLUDE_TYPE);
    tracks.push(onlyIncludes ? "auto" : "minmax(64px, 1fr)");
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
 * @param {JsonPaletteType[]} includeChain - The palettes this one is drawn inside.
 * @param {boolean} isScreen - Whether this palette is the screen.
 * @param {boolean} inScreen - Whether the screen includes this palette directly.
 * @return {PaletteCellsType} - The cells, and the columns rendered and skipped.
 */
function renderCells (
  paletteDefinition: JsonPaletteType, includeChain: JsonPaletteType[], isScreen: boolean, inScreen: boolean
): PaletteCellsType {
  // A language the app does not know falls back to English.
  const paletteLanguage = parseLanguage(paletteDefinition.language) ?? "en";
  const result: PaletteCellsType = { cells: [], renderedColumns: new Set(), skippedColumns: new Set(), labelLanguages: new Set() };
  Object.keys(paletteDefinition.cells).forEach((id) => {
    const aCell = paletteDefinition.cells[id];
    const cellOptions = aCell.options;
    // The screen palette draws this cell itself, as the sentence layer, when the palette holding
    // it is included directly by the screen. Anywhere else it is drawn here as usual.
    if (inScreen && aCell.type === SENTENCE_CHOICES_TYPE) {
      return;
    }
    if (!isAvailable(cellOptions)) {
      columnsOf(cellOptions).forEach((column) => result.skippedColumns.add(column));
      return;
    }
    if (aCell.type === PALETTE_INCLUDE_TYPE) {
      const include = renderInclude(id, cellOptions as PaletteIncludeType, [...includeChain, paletteDefinition], isScreen);
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
      // The cell gets its label as a string in one language, that language to speak it in,
      // and the label in every language.
      let options = cellOptions;
      const label = (cellOptions as { label?: LabelType }).label;
      if (label !== undefined) {
        const resolved = resolveLabel(label, paletteLanguage);
        options = {
          ...cellOptions, label: resolved.text, labelLanguage: resolved.language, labels: label
        };
        result.labelLanguages.add(resolved.language);
      }
      result.cells.push(html`
        <${cellComponent} key=${id} id="${id}" options=${options} />
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
 * @param {JsonPaletteType[]} includeChain - The palettes the included one is drawn inside, ending
 *                                          with the palette that holds this cell.
 * @param {boolean} inScreen - Whether the palette that holds this cell is the screen.
 * @return {VNode | null} - The include cell, or `null` when it cannot be drawn.
 */
function renderInclude (
  id: string, options: PaletteIncludeType, includeChain: JsonPaletteType[], inScreen: boolean
): VNode | null {
  const included = PaletteStore.paletteMap[options.palette];
  if (!included) {
    console.error(`PaletteInclude "${id}": palette "${options.palette}" is not loaded.`);
    return null;
  }
  // The palettes are compared by reference: a palette may be stored under a key that differs
  // from its `name`, so matching on either one would miss a cycle.
  if (includeChain.includes(included)) {
    const chainNames = includeChain.map((palette) => palette.name).join(" > ");
    console.error(`PaletteInclude "${id}": "${options.palette}" would be drawn inside itself (${chainNames}).`);
    return null;
  }
  const gridStyle = generateGridStyle(options.columnStart, options.columnSpan, options.rowStart, options.rowSpan);
  return html`
    <div key=${id} class="paletteInclude" style="${gridStyle}">
      <${Palette} json=${included} includeChain=${includeChain} inScreen=${inScreen} />
    </div>
  `;
}

/**
 * The sentence layer: the `ContentSentenceChoices` cell of a palette the screen includes, such
 * as the header, drawn in the screen's own grid over every row below that include. The grid
 * sizes it, so it always matches the vocabulary area.
 *
 * Nothing is drawn when no included palette has the cell. Nothing is drawn, and an error is
 * logged, when no rows are below the include.
 *
 * @param {JsonPaletteType} paletteDefinition - The screen palette.
 * @param {Record<string, number>} rowsCols - Its row and column counts.
 * @return {VNode | null}
 */
function renderSentenceLayer (paletteDefinition: JsonPaletteType, rowsCols: Record<string, number>): VNode | null {
  for (const cell of Object.values(paletteDefinition.cells)) {
    if (cell.type !== PALETTE_INCLUDE_TYPE || !isAvailable(cell.options)) {
      continue;
    }
    const include = cell.options as PaletteIncludeType;
    const entry = Object.entries(PaletteStore.paletteMap[include.palette]?.cells ?? {})
      .find(([, includedCell]) => includedCell.type === SENTENCE_CHOICES_TYPE);
    if (!entry) {
      continue;
    }
    const [id, sentenceCell] = entry;
    if (!isAvailable(sentenceCell.options)) {
      return null;
    }
    const rowStart = include.rowStart + include.rowSpan;
    if (rowStart > rowsCols.numRows) {
      console.error(`Palette "${paletteDefinition.name}": no rows below "${include.palette}" for the sentence layer.`);
      return null;
    }
    const options = {
      rowStart, rowSpan: rowsCols.numRows - rowStart + 1, columnStart: 1, columnSpan: rowsCols.numColumns
    };
    return html`<${cellTypeRegistry[SENTENCE_CHOICES_TYPE]} key=${id} id=${id} options=${options} />`;
  }
  return null;
}

export function Palette (props: PalettePropsType): VNode {

  const paletteDefinition = props.json;
  const rowsCols = countRowsColumns(paletteDefinition);
  const { cells, renderedColumns, skippedColumns, labelLanguages } = renderCells(
    paletteDefinition, props.includeChain ?? [], !!props.isScreen, !!props.inScreen
  );

  const emptyColumns = new Set(
    [...skippedColumns].filter((column) => !renderedColumns.has(column))
  );

  // A screen reader reads the labels in their own language. A palette whose labels are in more
  // than one language, or that has none, takes the page's.
  // ponytail: a palette with labels in two languages leaves its fallback labels in the page's
  // language for a screen reader; give each cell its own lang (e.g. on BlissSymbol) if that matters.
  const paletteLang = labelLanguages.size === 1 ? [...labelLanguages][0] : undefined;

  const layer = props.isScreen ? renderSentenceLayer(paletteDefinition, rowsCols) : null;
  const rowsStyle = props.isScreen
    ? ` grid-template-rows: ${gridTemplateRows(paletteDefinition, rowsCols.numRows)};`
    : "";

  return html`
    <div
      data-palettename="${paletteDefinition.name}"
      class=${props.isScreen ? "paletteContainer screenPalette" : "paletteContainer"}
      lang=${paletteLang}
      style="grid-template-columns: ${gridTemplateColumns(rowsCols.numColumns, emptyColumns)};${rowsStyle}">
        ${cells}
        ${layer}
    </div>
  `;
}
