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
 * The words the user saved to palettes with "Save new word".
 *
 * A cache filled from storage before the first palette loads, so each palette gets its saved
 * words as it loads. A word saved now goes into its palette at once and is stored behind it.
 *
 * Imports no globals: `PaletteStore` imports this module, and the globals import `PaletteStore`.
 */
import { signal } from "@preact/signals";
import { getStorage } from "./StorageBackend";
import type { JsonPaletteType, SavedWordType, SymbolCompositionType } from "../index.d";

let savedWords: SavedWordType[] = [];

/**
 * How many words have been saved since the page loaded. The palette on screen reads it so that
 * it draws again when a word is added to it.
 */
export const savedWordCount = signal(0);

const isSavedWord = (entry: unknown): entry is SavedWordType => {
  const word = entry as Record<string, unknown> | null;
  return typeof word === "object" && word !== null &&
    ["id", "paletteSet", "palette", "label"].every((key) => typeof word[key] === "string") &&
    (typeof word.composition === "number" || Array.isArray(word.composition));
};

/**
 * Fill the cache from storage. A store that cannot be read leaves no saved words.
 * @returns {Promise<void>}
 */
export async function hydrateSavedWords (): Promise<void> {
  try {
    savedWords = (await getStorage().readSavedWords()).filter(isSavedWord);
  } catch (error) {
    console.error(`Could not read the saved words: ${String(error)}`);
    savedWords = [];
  }
}

/**
 * Where a new cell goes at the end of a palette: after the last cell in the bottom row, or at the
 * start of a new row when that row is full.
 * @param {JsonPaletteType} palette - The palette.
 * @returns {{ rowStart: number, columnStart: number }}
 */
export function endOfPalette (palette: JsonPaletteType): { rowStart: number, columnStart: number } {
  // A cell with no options takes no room.
  const cells = Object.values(palette.cells).map((one) => one.options).filter((options) => options !== undefined);
  const numColumns = Math.max(1, ...cells.map((options) => options.columnStart + options.columnSpan - 1));
  const bottomRow = Math.max(1, ...cells.map((options) => options.rowStart + options.rowSpan - 1));
  const nextColumn = Math.max(1, ...cells
    .filter((options) => options.rowStart + options.rowSpan - 1 === bottomRow)
    .map((options) => options.columnStart + options.columnSpan));
  return nextColumn <= numColumns
    ? { rowStart: bottomRow, columnStart: nextColumn }
    : { rowStart: bottomRow + 1, columnStart: 1 };
}

const addCell = (palette: JsonPaletteType, word: SavedWordType): void => {
  palette.cells[word.id] = {
    type: "ActionCodeCell",
    options: { label: word.label, composition: word.composition, ...endOfPalette(palette), rowSpan: 1, columnSpan: 1 }
  };
};

/**
 * Add the words saved to a palette to it, in the order they were saved. Run once, on a palette
 * just loaded.
 * @param {JsonPaletteType} palette - The palette. Changed in place.
 * @param {string} paletteName - Its name in the palette set.
 * @param {string | undefined} paletteSet - The set's folder.
 * @returns {void}
 */
export function addSavedWordCells (palette: JsonPaletteType, paletteName: string, paletteSet: string | undefined): void {
  savedWords
    .filter((word) => word.paletteSet === paletteSet && word.palette === paletteName)
    .forEach((word) => addCell(palette, word));
}

/**
 * Store a word. A failed write is logged, and the word stays for the session.
 * @param {SavedWordType} word - The word.
 * @returns {Promise<void>}
 */
async function persist (word: SavedWordType): Promise<void> {
  try {
    await getStorage().addSavedWord(word);
  } catch (error) {
    console.error(`Could not save the word "${word.label}": ${String(error)}`);
  }
}

/**
 * Save a word to a palette: it is added at the palette's end at once, and stored behind it.
 * A word already saved to that palette, with the same name and composition, is not saved again.
 * @param {JsonPaletteType} palette - The palette. Changed in place.
 * @param {string} paletteName - Its name in the palette set.
 * @param {string} paletteSet - The set's folder.
 * @param {string} label - The word's name.
 * @param {SymbolCompositionType} composition - The word's composition.
 * @returns {void}
 */
export function saveWord (
  palette: JsonPaletteType, paletteName: string, paletteSet: string, label: string, composition: SymbolCompositionType
): void {
  const key = JSON.stringify(composition);
  if (savedWords.some((one) => one.paletteSet === paletteSet && one.palette === paletteName &&
    one.label === label && JSON.stringify(one.composition) === key)) {
    return;
  }
  const word: SavedWordType = { id: `saved-word-${crypto.randomUUID()}`, paletteSet, palette: paletteName, label, composition };
  savedWords.push(word);
  addCell(palette, word);
  savedWordCount.value += 1;
  void persist(word);
}
