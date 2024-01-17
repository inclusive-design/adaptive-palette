/*
 * Copyright 2023 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { PaletteStore } from "./PaletteStore";

describe("PaletteStore module", () => {

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

  const paletteStore = new PaletteStore();

  test("Empty PaletteStore", () => {
    expect(paletteStore.isEmpty()).toBe(true);
  });

  test("Non-empty PaletteStore", () => {
    paletteStore.addPalette(dummyPalette1);
    expect(paletteStore.isEmpty()).toBe(false);
    expect(paletteStore.numPalettes).toBe(1);
    expect(paletteStore.paletteList).toEqual(["dummyPalette1"]);
  });

  test("Add another palette", () => {
    paletteStore.addPalette(dummyPalette2, dummyPalette2Name);
    expect(paletteStore.numPalettes).toBe(2);
    expect(paletteStore.paletteList).toEqual(["dummyPalette1", dummyPalette2Name]);
  });

  test("Retrieve a palette", () => {
    const retrievedPalette = paletteStore.getNamedPalette(dummyPalette2Name);
    expect(retrievedPalette).toBe(dummyPalette2);
  });

  test("Delete a palette", () => {
    const numPalettes = paletteStore.numPalettes;
    const removedPalette = paletteStore.removePalette(dummyPalette1.name);
    expect(removedPalette).toBe(dummyPalette1);
    expect(paletteStore.numPalettes).toBe(numPalettes - 1);
    expect(paletteStore.getNamedPalette(dummyPalette1.name)).toBeUndefined();
  });
});
