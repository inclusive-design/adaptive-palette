/*
 * Copyright 2024 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

/**
 * Global Utility Functions
 */

/**
 * Generate the grid css.
 * @param {number} columnStart - The number of the column that the grid item will start from.
 * @param {number} columnSpan - The number of columns that the item will span across.
 * @param {number} rowStart - The number of the row that the grid item will start from.
 * @param {number} rowSpan - The number of rows that the item will span across.
 * @return {String} - The grid css.
 */
function generateGridStyle(columnStart: number, columnSpan: number, rowStart: number, rowSpan: number) {
  return `grid-column: ${columnStart} / span ${columnSpan};grid-row: ${rowStart} / span ${rowSpan};`;
}

/**
 * Use the text-to-speech to announce the given text. If the previous announcement is still going
 * on, cancel it.
 * @param {String} text - The text to be announced.
 */
function speak(text) {
  // If the text-to-speech feature is unavailable, do nothing. This happens when running node tests.
  if (!window.speechSynthesis) {
    return;
  }

  // Cancel the previous announcement
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
  }
  // Announce the current text
  const utterThis = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterThis);
}

/**
 * Import a palette from the given json file using dynamic `import()`.
 *
 * Note:  There are restrictions regarding the arguments to `import()`:
 * - the path must start with "./" or "../" and not be part of the argument,
 * - the path must end with "/" and not be part of the argument,
 * - the file name extension must be added here (not part of the argument)
 * See the following for more information:
 * https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
 *
 * @param {String} jsonFile  - Name of the JSON file to load, without the
 *                            ".json" extension (added herein).
 * @param {String} path      - Path to the file to without any leading nor
 *                             trailing "/".
 * @return {JsonPaletteType} - The palette itself, or `null` if it could not be
 *                             loaded.
 */
async function importPaletteFromJsonFile (jsonFile: string, path: string) {
  const paletteJson = await import(`./${path}/${jsonFile}.json`);
  return paletteJson;
}

export {
  generateGridStyle,
  speak,
  importPaletteFromJsonFile
};
