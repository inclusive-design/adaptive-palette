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
import { JsonPaletteType } from "./index.d";

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
function generateGridStyle(columnStart: number, columnSpan: number, rowStart: number, rowSpan: number): string {
  return `grid-column: ${columnStart} / span ${columnSpan};grid-row: ${rowStart} / span ${rowSpan};`;
}

/**
 * Use the text-to-speech to announce the given text. If the previous announcement is still going
 * on, cancel it.
 * @param {String} text - The text to be announced.
 */
function speak(text): void {
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
 * Load a palette from the given JSON file using `fetch()`. The location of the
 * JSON file is provided as a variable. If the loading fails, a console error with
 * detailed error message is reported.
 *
 * @param {String} jsonFilePath - Path of the JSON file to load, without the
 *                                ".json" extension (added herein).
 * @return {JsonPaletteType}    - The palette itself, or `null` if it could not be
 *                                loaded.
 */
async function loadPaletteFromJsonFile (jsonFilePath: string): Promise<JsonPaletteType> {
  try {
    console.log(`loadPaletteFromJsonFile(): file path is ${jsonFilePath}`);
    const response = await fetch(jsonFilePath);
    if (!response.ok) {
      console.error(`Error loading ${jsonFilePath}: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error loading ${jsonFilePath}:, ${error}`);
  }
}

export {
  generateGridStyle,
  speak,
  loadPaletteFromJsonFile
};
