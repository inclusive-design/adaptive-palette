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
import { PaletteStore, paletteSetPath, resolvePicturePath } from "./PaletteStore";

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

describe("PaletteStore palette sets and includes", (): void => {

  const cell = (type: string, options: object): object => ({
    type, options: { rowStart: 1, rowSpan: 1, columnStart: 1, columnSpan: 1, ...options }
  });

  // "Screen" includes "Header" twice; "Header" and "Loop" include each other.
  const FILES: Record<string, unknown> = {
    "/sets/palette_set.json": {
      formatVersion: 1,
      startPalette: "Screen",
      palettes: {
        "Screen": "screen.json",
        "Header": "parts/header.json",
        "Loop": "parts/loop.json"
      }
    },
    "/sets/future_set.json": { formatVersion: 2, startPalette: "Screen", palettes: {} },
    "/sets/screen.json": {
      name: "Screen",
      cells: {
        "header": cell("PaletteInclude", { palette: "Header" }),
        "again": cell("PaletteInclude", { palette: "Header", rowStart: 2 })
      }
    },
    "/sets/parts/header.json": {
      name: "Header", cells: { "loop": cell("PaletteInclude", { palette: "Loop" }) }
    },
    // This fixture's `name` deliberately differs from the "Loop" key it's included by, so the
    // store has to key it by the requested name, not by this field.
    "/sets/parts/loop.json": {
      name: "Loop palette", cells: { "back": cell("PaletteInclude", { palette: "Header" }) }
    },
    "/sets/picture_set.json": {
      formatVersion: 1,
      startPalette: "Pictures",
      palettes: { "Pictures": "palettes/pictures.json", "Colours": "palettes/colours.json" }
    },
    "/sets/palettes/colours.json": {
      name: "Colours",
      cells: {
        "pink": cell("ActionCodeCell", { label: "pink", backgroundColor: "#E86E9BFF", textColor: "white" }),
        "extra": cell("ActionCodeCell", {
          label: "extra", backgroundColor: "red; background-image: url(https://example.com/x.png)", textColor: 5
        })
      }
    },
    "/sets/palettes/pictures.json": {
      name: "Pictures",
      cells: {
        "bread": cell("ActionCodeCell", { label: "bread", picture: "../pictures/bread.jpg" }),
        "remote": cell("ActionCodeCell", { label: "remote", picture: "https://example.com/remote.jpg" }),
        "number": cell("ActionCodeCell", { label: "number", picture: 5 }),
        "back": cell("CommandGoBackCell", { label: "back", picture: "../pictures/back.jpg" })
      }
    }
  };

  const paletteStore = new PaletteStore();
  let fetched: string[];

  beforeEach((): void => {
    fetched = [];
    PaletteStore.paletteMap = {};
    PaletteStore.paletteFileMap = {};
    vi.stubGlobal("fetch", (filePath: string): Promise<Response> => {
      fetched.push(filePath);
      return Promise.resolve({
        ok: filePath in FILES,
        status: filePath in FILES ? 200 : 404,
        json: (): Promise<unknown> => Promise.resolve(FILES[filePath])
      } as Response);
    });
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  test("loadPaletteSet resolves paths against the set file and returns the start palette", async (): Promise<void> => {
    const startPalette = await paletteStore.loadPaletteSet("/sets/palette_set.json");

    expect(startPalette).toBe("Screen");
    expect(PaletteStore.paletteFileMap).toEqual({
      "Screen": "/sets/screen.json",
      "Header": "/sets/parts/header.json",
      "Loop": "/sets/parts/loop.json"
    });
  });

  test("loadPaletteSet throws for a format version it does not read", async (): Promise<void> => {
    await expect(paletteStore.loadPaletteSet("/sets/future_set.json")).rejects.toThrow("formatVersion");
  });

  test("loadPaletteSet throws when the file is missing", async (): Promise<void> => {
    await expect(paletteStore.loadPaletteSet("/sets/missing.json")).rejects.toThrow("Failed to load");
  });

  test("loading a palette loads what it includes, fetching each file once", async (): Promise<void> => {
    await paletteStore.loadPaletteSet("/sets/palette_set.json");

    const loaded = await paletteStore.getNamedPalette("Screen", true);

    expect(loaded?.name).toBe("Screen");
    expect(paletteStore.paletteList.sort()).toEqual(["Header", "Loop", "Screen"]);
    expect(fetched).toEqual([
      "/sets/palette_set.json", "/sets/screen.json", "/sets/parts/header.json", "/sets/parts/loop.json"
    ]);

    // Stored under the "Loop" key it was requested by, even though its own `name` field differs.
    const loopPalette = await paletteStore.getNamedPalette("Loop");
    expect(loopPalette?.name).toBe("Loop palette");
  });

  test("loading a palette resolves its pictures, and drops one outside the set or not a path", async (): Promise<void> => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await paletteStore.loadPaletteSet("/sets/picture_set.json");

    const loaded = await paletteStore.getNamedPalette("Pictures", true);

    expect(loaded?.cells["bread"].options).toMatchObject({ picture: "/sets/pictures/bread.jpg" });
    expect(loaded?.cells["remote"].options).not.toHaveProperty("picture");
    expect(loaded?.cells["number"].options).not.toHaveProperty("picture");
    expect(loaded?.cells["back"].options).not.toHaveProperty("picture");
    expect(errorSpy).toHaveBeenCalledTimes(3);
    errorSpy.mockRestore();
  });

  test("loading a palette drops a cell colour that is not a CSS colour", async (): Promise<void> => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await paletteStore.loadPaletteSet("/sets/picture_set.json");

    const loaded = await paletteStore.getNamedPalette("Colours", true);

    expect(loaded?.cells["pink"].options).toMatchObject({ backgroundColor: "#E86E9BFF", textColor: "white" });
    expect(loaded?.cells["extra"].options).not.toHaveProperty("backgroundColor");
    expect(loaded?.cells["extra"].options).not.toHaveProperty("textColor");
    expect(errorSpy).toHaveBeenCalledTimes(2);
    errorSpy.mockRestore();
  });
});

describe("paletteSetPath", (): void => {

  test("names the default set when the URL names none", (): void => {
    expect(paletteSetPath("")).toBe("/palette-sets/standardBlissChart/palette_set.json");
    expect(paletteSetPath("?other=1")).toBe("/palette-sets/standardBlissChart/palette_set.json");
  });

  test("names the set the URL names", (): void => {
    expect(paletteSetPath("?set=demo_1")).toBe("/palette-sets/demo_1/palette_set.json");
    expect(paletteSetPath("?set=my-demo")).toBe("/palette-sets/my-demo/palette_set.json");
  });

  test("throws for a name that is not a plain folder name", (): void => {
    ["?set=../x", "?set=a/b", "?set=%2E%2E", "?set="].forEach((search) => {
      expect(() => paletteSetPath(search), search).toThrow("Invalid palette set name");
    });
  });
});

describe("resolvePicturePath", (): void => {

  const paletteFileUrl = new URL("/palette-sets/demo/palettes/food.json", window.location.href);
  const setFolder = "/palette-sets/demo/";

  test("resolves a path relative to the palette file", (): void => {
    expect(resolvePicturePath("pictures/bread.jpg", paletteFileUrl, setFolder))
      .toBe("/palette-sets/demo/palettes/pictures/bread.jpg");
    expect(resolvePicturePath("../pictures/bread.jpg", paletteFileUrl, setFolder))
      .toBe("/palette-sets/demo/pictures/bread.jpg");
  });

  test("refuses a path that is absolute, names another site, or leaves the set's folder", (): void => {
    [
      "/palette-sets/demo/pictures/bread.jpg",
      "//example.com/bread.jpg",
      " //example.com/bread.jpg",
      "\t//example.com/bread.jpg",
      "https://example.com/bread.jpg",
      "data:image/png;base64,AAAA",
      "\\\\example.com\\bread.jpg",
      "../../other/bread.jpg",
      "%2e%2e/%2e%2e/other/bread.jpg",
      "pictures/..%2f..%2f..%2fother/bread.jpg",
      "pictures/..%5c..%5c..%5cother/bread.jpg"
    ].forEach((picture) => {
      expect(resolvePicturePath(picture, paletteFileUrl, setFolder), picture).toBeUndefined();
    });
  });
});
