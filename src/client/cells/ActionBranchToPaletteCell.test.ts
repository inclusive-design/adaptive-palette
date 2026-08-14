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


import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { renderCell, expectCellRendered } from "../testUtils/CellTestUtils";
import { ActionBranchToPaletteCell } from "./ActionBranchToPaletteCell";

describe("ActionBranchToPaletteCell", (): void => {

  const TEST_CELL_ID = "uuid-of-some-kind";
  const goToPaletteCell = {
    options: {
      "label": "Animals",
      "branchTo": "Animals",
      "rowStart": 100,
      "rowSpan": 12,
      "columnStart": 33,
      "columnSpan": 11,
      "composition": [ 513, "/", 99 ]   // IDsfor bciAvIds 16161, 9011
    }
  };

  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  });

  test("renders at its grid position", async (): Promise<void> => {

    renderCell(ActionBranchToPaletteCell, TEST_CELL_ID, goToPaletteCell.options);

    const button = await expectCellRendered(
      TEST_CELL_ID, goToPaletteCell.options, "actionBranchToPaletteCell foldedCorner"
    );

    // Check disabled state (should be enabled)
    expect(button.getAttribute("disabled")).toBe(null);
  });
});
