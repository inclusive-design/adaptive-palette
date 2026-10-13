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
 * `modifiers.json` in the palette set is built from `public/data/modifiers.json`. This keeps the
 * two in step: every modifier appears once, in the data file's order, as a prefix or suffix cell
 * per its `position`, filling the rows below the header with no gaps. The header row is checked
 * for every palette by `PaletteSetConsistency.test.ts`.
 */
import { loadPaletteFromJsonFile } from "./PaletteStore";
import { BlissSymbolInfoType, JsonPaletteType, LayoutInfoType, SymbolCompositionType } from "../index.d";
import type { LabelType } from "../i18n/I18n";
import { findClassifierFromLeft } from "../utils/SvgUtils";

const PALETTE_PATH = "/palette-sets/standardBlissChart/palettes/modifiers.json";
const MODIFIERS_PATH = "/data/modifiers.json";

type ModifierEntry = {
  composition: SymbolCompositionType,
  group: string,
  gloss: LabelType,
  position: "prefix" | "suffix"
};

const CELL_TYPES = { prefix: "ActionPreModifierCell", suffix: "ActionPostModifierCell" };

type ModifierCell = {
  type: string,
  options: LayoutInfoType & Omit<BlissSymbolInfoType, "label"> & { label: LabelType }
};

describe("modifiers.json agrees with data/modifiers.json", (): void => {

  let palette: JsonPaletteType;
  let modifiers: ModifierEntry[];

  beforeAll(async (): Promise<void> => {
    const loaded = await loadPaletteFromJsonFile(PALETTE_PATH);
    if (!loaded) {
      throw new Error(`Could not load ${PALETTE_PATH}`);
    }
    palette = loaded;
    const response = await fetch(MODIFIERS_PATH);
    if (!response.ok) {
      throw new Error(`Could not load ${MODIFIERS_PATH}`);
    }
    modifiers = await response.json() as ModifierEntry[];
  });

  // The modifier cells in reading order: row by row, left to right.
  const modifierCells = (): ModifierCell[] =>
    (Object.values(palette.cells) as unknown as ModifierCell[])
      .filter((cell) => Object.values(CELL_TYPES).includes(cell.type))
      .sort((first, second) =>
        first.options.rowStart - second.options.rowStart || first.options.columnStart - second.options.columnStart);

  test("lists every modifier once, in the data file's order, with its type, label and composition", (): void => {
    expect(modifierCells().map((cell) => [cell.type, cell.options.label, cell.options.composition]))
      .toEqual(modifiers.map((modifier) => [CELL_TYPES[modifier.position], modifier.gloss, modifier.composition]));
  });

  // A symbol with no `modifierInfo`, such as a typed composition, has its prefix modifiers
  // skipped by `findClassifierFromLeft()`, so an indicator lands on the base symbol.
  test("findClassifierFromLeft() skips every prefix modifier whole", (): void => {
    const baseId = 382;
    modifiers
      .filter((modifier) => modifier.position === "prefix")
      .forEach((modifier) => {
        const prefix = Array.isArray(modifier.composition) ? modifier.composition : [modifier.composition];
        expect(findClassifierFromLeft([...prefix, "/", baseId]), JSON.stringify(modifier.gloss))
          .toBe(prefix.length + 1);
      });
  });

  test("fills the rows below the header with no gaps or headings", (): void => {
    // Modifiers per row: the width of the header.
    const columns = palette.cells["standard-header"].options.columnSpan;
    expect(Object.values(palette.cells).filter((cell) => cell.type === "ContentLabel")).toHaveLength(0);
    modifierCells().forEach(({ options }, index) => {
      expect([options.rowStart, options.columnStart], JSON.stringify(options.label))
        .toEqual([2 + Math.floor(index / columns), 1 + index % columns]);
    });
  });

});
