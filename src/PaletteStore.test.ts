/*
 * Copyright 2023-2024 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { JsonPaletteType } from "./index.d";
import { PaletteStore } from "./PaletteStore";

describe("PaletteStore module", (): void => {

  const dummyPalette1 = {
    "name": "dummyPalette1",
    "cells": {
      "cellOne": {
        "type": "cellOneType",
        "options": {
          "label": "Singer",
          "bciAvId": 16991,
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
          "bciAvId": 19961,
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
          "bciAvId": 666,
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
          "bciAvId": 23443,
          "rowStart": 1,
          "rowSpan": 1024,
          "columnStart": 9,
          "columnSpan": 99
        }
      }
    }
  };

  // Mock-ups of the store's palette file name map and a mock load function.
  const PALETTE_FILE_MAP = {
    "path": "path/to",
    "dummyPalette1": "dummy_palette1",
    "DummyPalette2": "dummy_palette2",
    "mockPalette": "mock_palette"
  };

  const FILE_PALETTE_MAP = {
    "./path/to/dummy_palette1.json": dummyPalette1,
    "./path/to/dummy_palette2.json": dummyPalette2,
    "./path/to/mock_palette.json": mockPalette
  };

  const loadPalette = async (file:string, path:string): Promise<JsonPaletteType> => {
    return FILE_PALETTE_MAP[`./${path}/${file}.json`];
  };

  const paletteStore = new PaletteStore();
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

  test("Retrieve a palette, with and without a load function", async (): Promise<void> => {
    let retrievedPalette = await paletteStore.getNamedPalette(dummyPalette2Name);
    expect(retrievedPalette).toBe(dummyPalette2);

    // `mockPalette` should not be in the store. Ask for it and provide a
    // a loader for it.  It should be added to the store and returned.
    retrievedPalette = await paletteStore.getNamedPalette(mockPalette.name, loadPalette);
    expect(retrievedPalette).toBe(mockPalette);
    expect(paletteStore.numPalettes).toBe(3);
    expect(paletteStore.paletteList).toEqual(["dummyPalette1", dummyPalette2Name, "mockPalette"]);

    // `nonExistentPalette` should not be in the store, and should not be
    // referenced by the store's file name map. Asking for it to be loaded
    // should give a "no such palette" result (undefined).  The store should be
    // unchanged.
    retrievedPalette = await paletteStore.getNamedPalette("nonExistentPalette", loadPalette);
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
