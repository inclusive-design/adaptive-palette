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

import { screen, fireEvent } from "@testing-library/preact";

import { changeEncodingContents } from "../state/GlobalData";
import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { renderCell, expectCellRendered } from "../testUtils/CellTestUtils";
import { ActionPostModifierCell } from "./ActionPostModifierCell";

describe("ActionPostModifierCell", (): void => {

  const TEST_CELL_ID = "uuid-for-postmodifier-cell";
  const testCell = {
    options: {
      "label": "intensity",
      "rowStart": 3,
      "rowSpan": 2,
      "columnStart": 2,
      "columnSpan": 1,
      "composition": 401
    }
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  test("is unavailable while the input area is empty", async (): Promise<void> => {

    renderCell(ActionPostModifierCell, TEST_CELL_ID, testCell.options);

    const button = await expectCellRendered(TEST_CELL_ID, testCell.options, "actionModifierCell");

    // Check disabled state. `changeEncodingContents` is initialized
    // with an empty array, hence there should be an `aria-disabled` attribute.
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  test("is available with a symbol at the caret, and unavailable once the caret moves off it", async (): Promise<void> => {

    // Put a symbol into the `changeEncodingContents` (the value of the symbol
    // entry area in the palette display) so the modifier cells will not be
    // disabled when rendered.  All the other properties are tested to make sure
    // that an enabled ActionPostModifierCell otherwise has the same output.
    changeEncodingContents.value = {
      payloads: [{
        label: "speak",
        composition: [ 457, ";", 81 ],
      }],
      caretPosition: 0
    };
    renderCell(ActionPostModifierCell, TEST_CELL_ID, testCell.options);

    let button = await expectCellRendered(TEST_CELL_ID, testCell.options, "actionModifierCell");

    // Check disabled state.  `changeEncodingContents` is initialized
    // with a symbol, hence there should be an `aria-disabled` attribute.
    expect(button).toHaveAttribute("aria-disabled", "false");

    // Move the caret to the beginning of th input.  The ActionPostModifierCell
    // should become disabled.
    changeEncodingContents.value = { ...changeEncodingContents.value, caretPosition: -1 };
    button = await screen.findByRole("button", {name: testCell.options.label});
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  test("applying a post modifier appends its text to the label, not prepends", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [{
        label: "speak",
        composition: 457
      }],
      caretPosition: 0
    };
    renderCell(ActionPostModifierCell, TEST_CELL_ID, testCell.options);
    const button = await screen.findByRole("button", {name: testCell.options.label});
    fireEvent.click(button);

    expect(changeEncodingContents.value.payloads[0].label).toBe("speak intensity");
  });

  // Clicking while unavailable is covered in `ActionPreModifierCell.test.ts`: both cells
  // route through the same guard in `ActionModifierCellCommon`.

  // The model's text is still in the label -- "walked" is still in "walked intensity" -- so the mark stays.
  // The pre-modifier direction needs no twin test: the flag is carried outside the prepend/append
  // branch in `ActionModifierCellCommon`, so both cells route through the same line.
  test("keeps the AI mark when a modifier is added", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [{
        label: "walked",
        baseLabel: "walk",
        baseModifierCount: 0,
        composition: [ 382, ";", 97 ],
        indicatorId: 97,
        userSelectedSymbolId: 382,
        isAiLabel: true
      }],
      caretPosition: 0
    };
    renderCell(ActionPostModifierCell, TEST_CELL_ID, testCell.options);
    fireEvent.click(await screen.findByRole("button", { name: testCell.options.label }));

    const updated = changeEncodingContents.value.payloads[0];
    expect(updated.label).toBe("walked intensity");
    expect(updated.isAiLabel).toBe(true);
  });
});
