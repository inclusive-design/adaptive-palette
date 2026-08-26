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
 * Nothing ties together `public/palettes/attributes.json`'s row labels, its cells' `category`
 * fields, and `CATEGORY_ORDER` in `MessageAttributesState.ts` -- three places that have to be
 * kept in sync by hand, and a rename that misses one leaves the row heading, the announcement,
 * and the model prompt disagreeing with each other silently.
 *
 * `CATEGORY_ORDER` stays module-private, so this checks the agreement through behaviour: load
 * the real palette file, confirm every `ActionAttributeCell`'s category matches the label of
 * the `ContentLabel` heading its row, then confirm selecting one attribute per category reports
 * them in the same row order the palette displays -- which only holds if `CATEGORY_ORDER`
 * matches the palette's row order too.
 *
 * Lives in this feature's own folder rather than under `components/` or `core/`: the thing
 * being guarded is owned by message-attributes (its state module and its palette data), not by
 * the generic palette-rendering machinery `Palette.integration.test.ts` already covers.
 */
import { loadPaletteFromJsonFile } from "../../core/PaletteStore";
import { AttributeCellType, ContentLabelType, JsonPaletteType } from "../../index.d";
import { clearAttributes, toggleAttribute, attributesPromptText } from "./MessageAttributesState";

describe("attributes.json agrees with MessageAttributesState on category names and order", (): void => {

  let palette: JsonPaletteType;

  beforeAll(async (): Promise<void> => {
    const loaded = await loadPaletteFromJsonFile("/palettes/attributes.json");
    if (!loaded) {
      throw new Error("Could not load /palettes/attributes.json");
    }
    palette = loaded;
  });

  beforeEach((): void => {
    clearAttributes();
  });

  test("every attribute cell's category matches the ContentLabel heading its row", (): void => {
    const cells = Object.values(palette.cells);

    const rowLabel: Record<number, string> = {};
    cells
      .filter((cell) => cell.type === "ContentLabel")
      .forEach((cell) => {
        const options = cell.options as ContentLabelType;
        rowLabel[options.rowStart] = options.label;
      });

    const attributeCells = cells.filter((cell) => cell.type === "ActionAttributeCell");
    expect(attributeCells.length).toBeGreaterThan(0);

    attributeCells.forEach((cell) => {
      const options = cell.options as AttributeCellType;
      expect(options.category).toBe(rowLabel[options.rowStart]);
    });
  });

  test("selecting one attribute per category reports them in the palette's row order", (): void => {
    const cells = Object.values(palette.cells);

    const rowsInOrder = cells
      .filter((cell) => cell.type === "ContentLabel")
      .map((cell) => (cell.options as ContentLabelType))
      .sort((first, second) => first.rowStart - second.rowStart);

    const oneAttributePerCategory = rowsInOrder.map((row) => {
      const cell = cells.find((candidate) =>
        candidate.type === "ActionAttributeCell" &&
        (candidate.options as AttributeCellType).category === row.label
      );
      if (!cell) {
        throw new Error(`No attribute cell found for category "${row.label}"`);
      }
      return cell.options as AttributeCellType;
    });

    // Select out of palette row order, to prove the reported order comes from CATEGORY_ORDER
    // agreeing with the palette, not from selection order.
    [...oneAttributePerCategory].reverse().forEach((attribute) => {
      toggleAttribute({
        category: attribute.category, label: attribute.label, composition: attribute.composition
      });
    });

    const expected = oneAttributePerCategory
      .map((attribute) => `${attribute.category}: ${attribute.label}`)
      .join("; ");
    expect(attributesPromptText()).toBe(expected);
  });
});
