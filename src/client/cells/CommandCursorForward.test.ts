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
import { CommandCursorForward } from "./CommandCursorForward";

describe("CommandCursorForward", (): void => {

  const TEST_CELL_ID = "command-cursor-forwards";
  const testCell = {
    options: {
      "label": "Forward",
      "composition": [ 335, ";", 907 ],   // IDsfor bciAvIds 14390, 24670
      "rowStart": 2,
      "rowSpan": 1,
      "columnStart": 12,
      "columnSpan": 1,
      "ariaControls": "test-encoding-area"
    }
  };

  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  });

  test("renders at its grid position", async (): Promise<void> => {

    renderCell(CommandCursorForward, TEST_CELL_ID, testCell.options);

    const button = await expectCellRendered(TEST_CELL_ID, testCell.options, "btn-command");

    // Check aria-controls
    expect(button.getAttribute("aria-controls")).toBe(testCell.options.ariaControls);

    // Check disabled state (should be enabled)
    expect(button.getAttribute("disabled")).toBe(null);
  });

});
