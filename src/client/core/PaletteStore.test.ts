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
import { JsonPaletteType } from "../index.d";
import { PaletteStore } from "./PaletteStore";

describe("PaletteStore", (): void => {

  const dummyPalette1 = {
    "name": "dummyPalette1",
    "cells": {
      "cellOne": {
        "type": "cellOneType",
        "options": {
          "label": "Singer",
          "composition": 2411,
          "rowStart": 1,
          "rowSpan": 1,
          "columnStart": 1,
          "columnSpan": 1
        }
      },
      "cellTwo": {
        "type": "cellTwoType",
        "options": {
          "label": "Dancer",
          "composition": 513,
          "rowStart": 2,
          "rowSpan": 3,
          "columnStart": 4,
          "columnSpan": 5
        }
      }
    }
  };

  const dummyPalette2Name = "DummyPalette2";
  const dummyPalette2 = {
    "name": "DifferentName",
    "cells": {
      "dummyCell": {
        "type": "dummyCellType",
        "options": {
          "label": "Choreographer",
          "composition": 823,
          "rowStart": 2,
          "rowSpan": 2,
          "columnStart": 2,
          "columnSpan": 2
        }
      }
    }
  };

  const mockPalette = {
    "name": "mockPalette",
    "cells": {
      "dummyCell": {
        "type": "mockCellType",
        "options": {
          "label": "clown",
          "composition": 3738,
          "rowStart": 1,
          "rowSpan": 1024,
          "columnStart": 9,
          "columnSpan": 99
        }
      }
    }
  };

  // Mock-up of the store's palette file name map.
  const PALETTE_FILE_MAP = {
    "dummyPalette1": "./path/to/dummy_palette1.json",
    "DummyPalette2": "./path/to/dummy_palette2.json",
    "mockPalette": "./path/to/mock_palette.json"
  };

  // The store fetches palettes itself now, so the file contents are served by a stubbed
  // `fetch` rather than by a loader passed in at the call site.
  const FILE_PALETTE_MAP: Record<string, JsonPaletteType> = {
    "./path/to/dummy_palette1.json": dummyPalette1,
    "./path/to/dummy_palette2.json": dummyPalette2,
    "./path/to/mock_palette.json": mockPalette
  };

  beforeAll((): void => {
    vi.stubGlobal("fetch", (filePath: string): Promise<Response> => Promise.resolve({
      ok: filePath in FILE_PALETTE_MAP,
      json: (): Promise<JsonPaletteType> => Promise.resolve(FILE_PALETTE_MAP[filePath])
    } as Response));
  });

  afterAll((): void => {
    vi.unstubAllGlobals();
  });

  const paletteStore = new PaletteStore();
  // PaletteStore.paletteFileMap = PALETTE_FILE_MAP;
  PaletteStore.paletteFileMap = PALETTE_FILE_MAP;

  // Tests start here
  test("Empty PaletteStore", (): void => {
    expect(paletteStore.isEmpty()).toBe(true);
  });

  test("Non-empty PaletteStore", (): void => {
    paletteStore.addPalette(dummyPalette1);
    expect(paletteStore.isEmpty()).toBe(false);
    expect(paletteStore.numPalettes).toBe(1);
    expect(paletteStore.paletteList).toEqual(["dummyPalette1"]);
  });

  test("Add another palette", (): void  => {
    paletteStore.addPalette(dummyPalette2, dummyPalette2Name);
    expect(paletteStore.numPalettes).toBe(2);
    expect(paletteStore.paletteList).toEqual(["dummyPalette1", dummyPalette2Name]);
  });

  test("Retrieve a palette, with and without loading", async (): Promise<void> => {
    let retrievedPalette = await paletteStore.getNamedPalette(dummyPalette2Name);
    expect(retrievedPalette).toBe(dummyPalette2);

    // `mockPalette` should not be in the store. Ask for it with loading turned on.
    // It should be added to the store and returned.
    retrievedPalette = await paletteStore.getNamedPalette(mockPalette.name, true);
    expect(retrievedPalette).toBe(mockPalette);
    expect(paletteStore.numPalettes).toBe(3);
    expect(paletteStore.paletteList).toEqual(["dummyPalette1", dummyPalette2Name, "mockPalette"]);

    // `nonExistentPalette` is not in the store and the file name map does not name a file
    // for it, so there is nothing to load. The result is undefined and the store is
    // unchanged.
    retrievedPalette = await paletteStore.getNamedPalette("nonExistentPalette", true);
    expect(retrievedPalette).toBe(undefined);
    expect(paletteStore.numPalettes).toBe(3);
    expect(paletteStore.paletteList).toEqual(["dummyPalette1", dummyPalette2Name, "mockPalette"]);
  });

  test("Delete a palette", async (): Promise<void> => {
    const numPalettes = paletteStore.numPalettes;
    const removedPalette = paletteStore.removePalette(dummyPalette1.name);
    expect(removedPalette).toBe(dummyPalette1);
    expect(paletteStore.numPalettes).toBe(numPalettes - 1);
    const retrievedPalette = await paletteStore.getNamedPalette(dummyPalette1.name);
    expect(retrievedPalette).toBeUndefined();
  });
});
