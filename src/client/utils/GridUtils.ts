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
 * The inline style for a cell's `backgroundColor` option.
 * @param {string} [color] - A CSS colour, such as "#E86E9BFF".
 * @returns {string} - "" when there is no colour. A value that is not a colour is also "", with an
 *                     error logged, so that a palette cannot add other properties through it.
 */
export function backgroundColorStyle (color?: string): string {
  if (color === undefined) {
    return "";
  }
  if (!CSS.supports("color", color)) {
    console.error(`backgroundColorStyle(): "${color}" is not a CSS colour`);
    return "";
  }
  return `background-color: ${color};`;
}
