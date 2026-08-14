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
import { screen, fireEvent } from "@testing-library/preact";

import { changeEncodingContents } from "../state/GlobalData";
import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { renderCell, expectCellRendered } from "../testUtils/CellTestUtils";
import { ActionRemoveIndicatorCell } from "./ActionRemoveIndicatorCell";
import { mockedSpeakUnavailable } from "../testUtils/SpeechUtilsMock";

vi.mock("../utils/SpeechUtils");

describe("ActionRemoveIndicatorCell", (): void => {

  const TEST_CELL_ID = "uuid-remove-indicator-cell";
  const testCell = {
    options: {
      "label": "remove indicator",
      "rowStart": 3,
      "rowSpan": 2,
      "columnStart": 2,
      "columnSpan": 1,
      "composition": [ 2505, "//", 348, "/", 81,  "/", 86 ]
    }
  };

  // The structure of these objects is what is added to or removed from the
  // `changeEncodingContents` signal value
  const blissWordNoIndicator = {
    label: "opposite",
    composition: 486     // ID for bciAvId 15927 (opposite)
  };
  const blissWordWithIndicator = {
    label: "don't know",
    composition: [ 412, ";", 81, "/", 2088 ]   // IDs for bciAvId 15162, 8993, 15733
  };
  const compositionAfterIndicatorRemoval = [ 412, "/", 2088 ];  // IDs for bciAvId 15162, 15733
  const blissWordWithIndicatorAndBaseLabel = {
    label: "helper",
    baseLabel: "help",
    composition: [ 382, ";", 97 ],
    indicatorId: 97,
    userSelectedSymbolId: 382
  };
  const blissWordIndicatorThenModifier = {
    label: "big walked",
    baseLabel: "walk",
    baseModifierCount: 0,
    composition: [ 368, "/", 382, ";", 97 ],
    indicatorId: 97,
    modifierInfo: [{ modifierId: [368], modifierGloss: "big", isPrepended: true }],
    userSelectedSymbolId: 382
  };
  const blissWordModifierThenIndicator = {
    label: "big walked",
    baseLabel: "big walk",
    baseModifierCount: 1,
    composition: [ 368, "/", 382, ";", 97 ],
    indicatorId: 97,
    modifierInfo: [{ modifierId: [368], modifierGloss: "big", isPrepended: true }],
    userSelectedSymbolId: 382
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  test("is unavailable while the input area is empty", async (): Promise<void> => {

    renderCell(ActionRemoveIndicatorCell, TEST_CELL_ID, testCell.options);

    const removeIndicatorButton = await expectCellRendered(TEST_CELL_ID, testCell.options, "btn-command");

    // Check disabled state.  `changeEncodingContents` is initialized
    // with an empty array, hence there should be an `aria-disabled` attribute.
    expect(removeIndicatorButton).toHaveAttribute("aria-disabled", "true");
  });

  test("stays unavailable when the symbol has no indicator", async (): Promise<void> => {

    // Put a symbol into the `changeEncodingContents` that has no
    // indicator.  The rendered `ActionRemoveIndicatorCell` should remain
    // disabled since there is no indicator to remove.
    changeEncodingContents.value = {
      payloads: [blissWordNoIndicator],
      caretPosition: 0
    };
    renderCell(ActionRemoveIndicatorCell, TEST_CELL_ID, testCell.options);
    const removeIndicatorButton = await screen.findByRole("button", {name: testCell.options.label});
    expect(removeIndicatorButton).toBeVisible();
    expect(removeIndicatorButton).toBeValid();
    expect(removeIndicatorButton.id).toBe(TEST_CELL_ID);
    expect(removeIndicatorButton).toHaveAttribute("aria-disabled", "true");
  });

  test("becomes available once the symbol has an indicator", async (): Promise<void> => {

    // Add a symbol *with* an indicator and render the ActionIndicatorCell.
    const contentsToModify = changeEncodingContents.value.payloads;
    contentsToModify.push(blissWordWithIndicator);
    changeEncodingContents.value = {
      payloads: contentsToModify,
      caretPosition: changeEncodingContents.value.caretPosition+1
    };
    renderCell(ActionRemoveIndicatorCell, TEST_CELL_ID, testCell.options);
    // Check that the ActionIndicatorCell/button is now enabled
    // since the last symbol in the encoding array has an indicator.
    const removeIndicatorButton = await screen.findByRole("button", {name: testCell.options.label});
    expect(removeIndicatorButton).toBeVisible();
    expect(removeIndicatorButton).toBeValid();
    expect(removeIndicatorButton.id).toBe(TEST_CELL_ID);
    expect(removeIndicatorButton).toHaveAttribute("aria-disabled", "false");
  });

  test("goes back to unavailable once the indicator is removed", async (): Promise<void> => {

    // Add two symbols, the last one with an indicator and render the
    // ActionIndicatorCell.
    const contentsToModify = changeEncodingContents.value.payloads;
    contentsToModify.push(blissWordNoIndicator);
    contentsToModify.push(blissWordWithIndicator);
    changeEncodingContents.value = {
      payloads: contentsToModify,
      caretPosition: contentsToModify.length - 1
    };
    renderCell(ActionRemoveIndicatorCell, TEST_CELL_ID, testCell.options);

    // Check that the ActionIndicatorCell/button is now enabled since the last
    // symbol in the encoding array has an indicator.
    const removeIndicatorButton = await screen.findByRole("button", {name: testCell.options.label});
    expect(removeIndicatorButton).toHaveAttribute("aria-disabled", "false");

    // Remove the indicator from the last bliss-word and check that the
    // `ActionIndicatorCell` is now disabled, and that the last symbol no longer
    // has an indicator.
    fireEvent.click(removeIndicatorButton);
    expect(removeIndicatorButton).toHaveAttribute("aria-disabled", "true");
    const lastSymbol = changeEncodingContents.value.payloads[changeEncodingContents.value.payloads.length-1];
    expect(lastSymbol.composition).toStrictEqual(compositionAfterIndicatorRemoval);
  });

  test("restores the label from baseLabel and clears baseLabel and indicatorId", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [blissWordWithIndicatorAndBaseLabel],
      caretPosition: 0
    };
    renderCell(ActionRemoveIndicatorCell, TEST_CELL_ID, testCell.options);
    const removeIndicatorButton = await screen.findByRole("button", {name: testCell.options.label});
    expect(removeIndicatorButton).toHaveAttribute("aria-disabled", "false");

    fireEvent.click(removeIndicatorButton);

    const restored = changeEncodingContents.value.payloads[0];
    expect(restored.label).toBe("help");
    expect(restored.baseLabel).toBeUndefined();
    expect(restored.indicatorId).toBeUndefined();
    expect(restored.userSelectedSymbolId).toBe(382);
  });

  test("keeps a modifier applied after the indicator when restoring baseLabel", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [blissWordIndicatorThenModifier],
      caretPosition: 0
    };
    renderCell(ActionRemoveIndicatorCell, TEST_CELL_ID, testCell.options);
    const removeIndicatorButton = await screen.findByRole("button", {name: testCell.options.label});
    expect(removeIndicatorButton).toHaveAttribute("aria-disabled", "false");

    fireEvent.click(removeIndicatorButton);

    const restored = changeEncodingContents.value.payloads[0];
    expect(restored.label).toBe("big walk");
    expect(restored.baseLabel).toBeUndefined();
    expect(restored.baseModifierCount).toBeUndefined();
    expect(restored.indicatorId).toBeUndefined();
  });

  test("does not double-count a modifier applied before the indicator when restoring baseLabel", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [blissWordModifierThenIndicator],
      caretPosition: 0
    };
    renderCell(ActionRemoveIndicatorCell, TEST_CELL_ID, testCell.options);
    const removeIndicatorButton = await screen.findByRole("button", {name: testCell.options.label});
    expect(removeIndicatorButton).toHaveAttribute("aria-disabled", "false");

    fireEvent.click(removeIndicatorButton);

    const restored = changeEncodingContents.value.payloads[0];
    expect(restored.label).toBe("big walk");
    expect(restored.baseLabel).toBeUndefined();
    expect(restored.baseModifierCount).toBeUndefined();
    expect(restored.indicatorId).toBeUndefined();
  });

  test("clicking while unavailable leaves the input untouched and is announced", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [{ label: "building", composition: 392 }],
      caretPosition: 0
    };
    const before = JSON.stringify(changeEncodingContents.value);

    renderCell(ActionRemoveIndicatorCell, TEST_CELL_ID, testCell.options);

    const button = await screen.findByRole("button", { name: testCell.options.label });
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);

    expect(JSON.stringify(changeEncodingContents.value)).toBe(before);
    // The button keeps `aria-disabled` rather than `disabled`, so it can be focused and
    // activated. Speech is the main feedback channel and must not go silent.
    expect(mockedSpeakUnavailable).toHaveBeenCalledWith(testCell.options.label);
  });
});
