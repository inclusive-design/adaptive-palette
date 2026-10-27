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

/**
 * Helper function to construct a single grid property rule.
 */
function buildGridProperty(property: string, start?: number, span?: number): string {
  const value = [start, span !== undefined ? `span ${span}` : undefined]
    .filter(val => val !== undefined)
    .join(" / ");

  return value ? `${property}: ${value};` : "";
}

/**
 * Generate the grid css.
 * @param {number} columnStart - The number of the column that the grid item will start from.
 * @param {number} columnSpan - The number of columns that the item will span across.
 * @param {number} rowStart - The number of the row that the grid item will start from.
 * @param {number} rowSpan - The number of rows that the item will span across.
 * @return {String} - The grid css.
 */
export function generateGridStyle(columnStart?: number, columnSpan?: number, rowStart?: number, rowSpan?: number): string {
  const colStyle = buildGridProperty("grid-column", columnStart, columnSpan);
  const rowStyle = buildGridProperty("grid-row", rowStart, rowSpan);

  return colStyle + rowStyle;
}

/**
 * The inline style for a cell's `backgroundColor` and `textColor` options. `PaletteStore` drops a
 * value that is not a CSS colour when it loads the palette.
 * @param {string} [backgroundColor] - A CSS colour, such as "#E86E9BFF".
 * @param {string} [textColor] - A CSS colour for the label and the Bliss symbol.
 * @returns {string} - "" when there is neither.
 */
export function colorStyle (backgroundColor?: string, textColor?: string): string {
  return (backgroundColor ? `background-color: ${backgroundColor};` : "") + (textColor ? `color: ${textColor};` : "");
}
