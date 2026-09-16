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

import { BranchToInfoType, JsonPaletteType, PaletteIncludeType } from "../index.d";
import { PALETTE_INCLUDE_TYPE, PaletteStore } from "./PaletteStore";

const PALETTE_SET_PATH = "/palette-sets/standardBlissChart/palette_set.json";

// Palettes that are parts of a screen rather than screens.
const SCREEN_PARTS = ["Standard Header", "Input Area", "Command Bar"];

describe("the shipped palette set", (): void => {

  const paletteStore = new PaletteStore();
  const palettes: Record<string, JsonPaletteType> = {};
  let startPaletteName: string;

  beforeAll(async (): Promise<void> => {
    startPaletteName = await paletteStore.loadPaletteSet(PALETTE_SET_PATH);
    for (const name of Object.keys(PaletteStore.paletteFileMap)) {
      const palette = await paletteStore.getNamedPalette(name, true);
      if (!palette) {
        throw new Error(`Palette "${name}" did not load`);
      }
      palettes[name] = palette;
    }
  });

  test("the start palette is in the set", (): void => {
    expect(Object.keys(palettes)).toContain(startPaletteName);
  });

  test("every palette's name is the name the set gives it", (): void => {
    Object.entries(palettes).forEach(([name, palette]) => {
      expect(palette.name).toBe(name);
    });
  });

  test("every include and branch names a palette in the set", (): void => {
    Object.entries(palettes).forEach(([name, palette]) => {
      Object.entries(palette.cells).forEach(([id, cell]) => {
        const options = cell.options as Partial<PaletteIncludeType & BranchToInfoType>;
        const target = cell.type === PALETTE_INCLUDE_TYPE ? options.palette : options.branchTo;
        if (target !== undefined) {
          expect(palettes, `${name} > ${id}`).toHaveProperty([target]);
        }
      });
    });
  });

  // The header first keeps its elements, and so focus and typed text, across navigation.
  test("every screen starts with the Standard Header across all its columns, above its other cells", (): void => {
    Object.values(palettes)
      .filter((palette) => !SCREEN_PARTS.includes(palette.name))
      .forEach((palette) => {
        const [firstId, firstCell] = Object.entries(palette.cells)[0];
        // The header is left out, so a header wider than the palette is caught.
        const otherCells = Object.entries(palette.cells).filter(([id]) => id !== "standard-header");
        const numColumns = Math.max(...otherCells
          .map(([, { options }]) => options.columnStart + options.columnSpan - 1));

        expect(firstId, palette.name).toBe("standard-header");
        expect(firstCell.type, palette.name).toBe(PALETTE_INCLUDE_TYPE);
        expect(firstCell.options, palette.name).toMatchObject({
          palette: "Standard Header", rowStart: 1, rowSpan: 1, columnStart: 1, columnSpan: numColumns
        });
        otherCells.forEach(([id, { options }]) => {
          expect(options.rowStart, `${palette.name} > ${id}`).toBeGreaterThanOrEqual(2);
        });
      });
  });
});
