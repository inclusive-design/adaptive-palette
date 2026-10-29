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


import { vi } from "vitest";
import type { JsonPaletteType } from "../index.d";
import { MemoryStorage } from "./MemoryStorage";
import { setStorage } from "./StorageBackend";
import { addSavedWordCells, endOfPalette, hydrateSavedWords, saveWord, savedWordCount } from "./SavedWords";

const cell = (columnStart: number, rowStart: number, columnSpan = 1) => ({
  type: "ActionCodeCell",
  options: { label: "x", composition: 126, columnStart, columnSpan, rowStart, rowSpan: 1 }
});
const paletteOf = (cells: ReturnType<typeof cell>[]): JsonPaletteType =>
  ({ name: "Test", cells: Object.fromEntries(cells.map((one, index) => [`cell-${index}`, one])) });
const labelsOf = (palette: JsonPaletteType): string[] =>
  Object.values(palette.cells).map((one) => (one.options as { label: string }).label);

describe("endOfPalette()", (): void => {

  test("is the next column in the bottom row", (): void => {
    expect(endOfPalette(paletteOf([cell(1, 1, 3), cell(1, 2), cell(2, 2)]))).toEqual({ rowStart: 2, columnStart: 3 });
  });

  test("is a new row when the bottom row is full", (): void => {
    expect(endOfPalette(paletteOf([cell(1, 1), cell(2, 1)]))).toEqual({ rowStart: 2, columnStart: 1 });
  });

  test("is the first cell of an empty palette", (): void => {
    expect(endOfPalette(paletteOf([]))).toEqual({ rowStart: 1, columnStart: 1 });
  });
});

describe("saveWord()", (): void => {

  let storage: MemoryStorage;

  beforeEach(async (): Promise<void> => {
    storage = new MemoryStorage();
    setStorage(storage);
    await hydrateSavedWords();
  });

  test("adds the word at the palette's end at once, and stores it", async (): Promise<void> => {
    const palette = paletteOf([cell(1, 1), cell(2, 1)]);
    const countBefore = savedWordCount.value;

    saveWord(palette, "man_woman", "/sets/a/", "female teacher", [710, "/", 949, "/", 412]);

    expect(Object.values(palette.cells).at(-1)).toEqual({
      type: "ActionCodeCell",
      options: {
        label: "female teacher", composition: [710, "/", 949, "/", 412],
        rowStart: 2, columnStart: 1, rowSpan: 1, columnSpan: 1
      }
    });
    expect(savedWordCount.value).toBe(countBefore + 1);
    await vi.waitFor(async () => expect(await storage.readSavedWords()).toHaveLength(1));
  });

  test("saving the same word to the same palette twice saves it once", async (): Promise<void> => {
    const palette = paletteOf([]);

    saveWord(palette, "man_woman", "/sets/a/", "female teacher", [710, "/", 949]);
    saveWord(palette, "man_woman", "/sets/a/", "female teacher", [710, "/", 949]);

    expect(labelsOf(palette)).toEqual(["female teacher"]);
    await vi.waitFor(async () => expect(await storage.readSavedWords()).toHaveLength(1));
  });

  test("a palette loaded later gets the words saved to it in its own set", async (): Promise<void> => {
    saveWord(paletteOf([]), "man_woman", "/sets/a/", "female teacher", [710]);
    saveWord(paletteOf([]), "food", "/sets/a/", "yogurt", [126]);
    saveWord(paletteOf([]), "man_woman", "/sets/b/", "other set", [126]);
    await vi.waitFor(async () => expect(await storage.readSavedWords()).toHaveLength(3));
    await hydrateSavedWords();

    const loaded = paletteOf([cell(1, 1)]);
    addSavedWordCells(loaded, "man_woman", "/sets/a/");

    expect(labelsOf(loaded)).toEqual(["x", "female teacher"]);
  });
});
