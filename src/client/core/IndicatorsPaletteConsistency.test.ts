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
 * `indicators.json` in the palette set is written by hand from `public/data/indicators.json`.
 * This keeps the two in step: every indicator appears once, in the data file's order, filling the
 * rows below the header with no gaps. Labels and the header row are checked for every palette by
 * `PaletteSetConsistency.test.ts`.
 */
import { loadPaletteFromJsonFile } from "./PaletteStore";
import { JsonPaletteType, LayoutInfoType } from "../index.d";
import type { IndicatorInfoEntry } from "../utils/IndicatorLabelsUtils";

const PALETTE_PATH = "/palette-sets/standardBlissChart/palettes/indicators.json";
const COMMAND_BAR_PATH = "/palette-sets/standardBlissChart/palettes/command_bar.json";

// Indicators per row: the width of the header.
const COLUMNS = 9;

describe("indicators.json agrees with data/indicators.json", (): void => {

  let palette: JsonPaletteType;
  let indicators: IndicatorInfoEntry[];

  beforeAll(async (): Promise<void> => {
    const loaded = await loadPaletteFromJsonFile(PALETTE_PATH);
    if (!loaded) {
      throw new Error(`Could not load ${PALETTE_PATH}`);
    }
    palette = loaded;
    indicators = await (await fetch("/data/indicators.json")).json() as IndicatorInfoEntry[];
  });

  // The indicator cells in reading order: row by row, left to right.
  const indicatorCells = (): (LayoutInfoType & { composition: number })[] =>
    Object.values(palette.cells)
      .filter((cell) => cell.type === "ActionIndicatorCell")
      .map((cell) => cell.options as LayoutInfoType & { composition: number })
      .sort((first, second) => first.rowStart - second.rowStart || first.columnStart - second.columnStart);

  test("lists every indicator once, in the data file's order", (): void => {
    expect(indicatorCells().map((options) => options.composition))
      .toEqual(indicators.map((indicator) => indicator.id));
  });

  test("fills the rows below the header with no gaps or headings", (): void => {
    expect(Object.values(palette.cells).filter((cell) => cell.type === "ContentLabel")).toHaveLength(0);
    indicatorCells().forEach((options, index) => {
      expect([options.rowStart, options.columnStart], `indicator ${options.composition}`)
        .toEqual([2 + Math.floor(index / COLUMNS), 1 + index % COLUMNS]);
    });
  });

  test("leaves the remove indicator button to the command bar", async (): Promise<void> => {
    const commandBar = await loadPaletteFromJsonFile(COMMAND_BAR_PATH);
    const removeCells = (cells: JsonPaletteType["cells"]) =>
      Object.values(cells).filter((cell) => cell.type === "ActionRemoveIndicatorCell");

    expect(removeCells(palette.cells)).toHaveLength(0);
    expect(removeCells(commandBar?.cells ?? {})).toHaveLength(1);
  });
});
