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
import { render, screen, fireEvent } from "@testing-library/preact";
import { html } from "htm/preact";

import { initAdaptivePaletteGlobals, changeEncodingContents } from "./GlobalData";
import { ActionRemoveIndicatorCell } from "./ActionRemoveIndicatorCell";

describe("ActionRemoveIndicatorCell render tests", (): void => {

  const TEST_CELL_ID = "uuid-remove-indicator-cell";
  const testCell = {
    options: {
      "label": "remove indicator",
      "rowStart": "3",
      "rowSpan": "2",
      "columnStart": "2",
      "columnSpan": "1",
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
    indicatorInfo: 97,
    userSelectedSymbolId: 382
  };
  const blissWordIndicatorThenModifier = {
    label: "big walked",
    baseLabel: "walk",
    baseModifierCount: 0,
    composition: [ 368, "/", 382, ";", 97 ],
    indicatorInfo: 97,
    modifierInfo: [{ modifierId: [368], modifierGloss: "big", isPrepended: true }],
    userSelectedSymbolId: 382
  };
  const blissWordModifierThenIndicator = {
    label: "big walked",
    baseLabel: "big walk",
    baseModifierCount: 1,
    composition: [ 368, "/", 382, ";", 97 ],
    indicatorInfo: 97,
    modifierInfo: [{ modifierId: [368], modifierGloss: "big", isPrepended: true }],
    userSelectedSymbolId: 382
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  test("ActionRemoveIndicatorCell rendering, disabled", async (): Promise<void> => {

    render(html`
      <${ActionRemoveIndicatorCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );

    // Check the rendered cell
    const removeIndicatorButton = await screen.findByRole("button", {name: testCell.options.label});

    // Check that the ActionRemoveIndicatorCell/button is rendered and has the correct
    // attributes and text.
    expect(removeIndicatorButton).toBeVisible();
    expect(removeIndicatorButton).toBeValid();
    expect(removeIndicatorButton.id).toBe(TEST_CELL_ID);
    expect(removeIndicatorButton.getAttribute("class")).toBe("actionIndicatorCell");
    expect(removeIndicatorButton.textContent).toBe(testCell.options.label);

    // Check the grid cell styles.
    expect(removeIndicatorButton.style.getPropertyValue("grid-column")).toBe("2 / span 1");
    expect(removeIndicatorButton.style.getPropertyValue("grid-row")).toBe("3 / span 2");

    // Check disabled state.  `changeEncodingContents` is initialized
    // with an empty array, hence there should be a `disabled` attribute.
    expect(removeIndicatorButton.getAttribute("disabled")).toBeDefined();
  });

  test("Single ActionIndicatorCell rendering, still disabled", async (): Promise<void> => {

    // Put a symbol into the `changeEncodingContents` that has no
    // indicator.  The rendered `ActionRemoveIndicatorCell` should remain
    // disabled since there is no indicator to remove.
    changeEncodingContents.value = {
      payloads: [blissWordNoIndicator],
      caretPosition: 0
    };
    render(html`
      <${ActionRemoveIndicatorCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );
    const removeIndicatorButton = await screen.findByRole("button", {name: testCell.options.label});
    expect(removeIndicatorButton).toBeVisible();
    expect(removeIndicatorButton).toBeValid();
    expect(removeIndicatorButton.id).toBe(TEST_CELL_ID);
    expect(removeIndicatorButton.getAttribute("disabled")).toBeDefined();
  });

  test("ActionIndicatorCell rendering, enabled", async (): Promise<void> => {

    // Add a symbol *with* an indicator and render the ActionIndicatorCell.
    const contentsToModify = changeEncodingContents.value.payloads;
    contentsToModify.push(blissWordWithIndicator);
    changeEncodingContents.value = {
      payloads: contentsToModify,
      caretPosition: changeEncodingContents.value.caretPosition+1
    };
    render(html`
      <${ActionRemoveIndicatorCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );
    // Check that the ActionIndicatorCell/button is now enabled
    // since the last symbol in the encoding array has an indicator.
    const removeIndicatorButton = await screen.findByRole("button", {name: testCell.options.label});
    expect(removeIndicatorButton).toBeVisible();
    expect(removeIndicatorButton).toBeValid();
    expect(removeIndicatorButton.id).toBe(TEST_CELL_ID);
    expect(removeIndicatorButton.getAttribute("disabled")).toBeNull();
  });

  test("ActionIndicatorCell rendering, enabled then disabled after removing indicator", async (): Promise<void> => {

    // Add two symbols, the last one with an indicator and render the
    // ActionIndicatorCell.
    const contentsToModify = changeEncodingContents.value.payloads;
    contentsToModify.push(blissWordNoIndicator);
    contentsToModify.push(blissWordWithIndicator);
    changeEncodingContents.value = {
      payloads: contentsToModify,
      caretPosition: contentsToModify.length - 1
    };
    render(html`
      <${ActionRemoveIndicatorCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );

    // Check that the ActionIndicatorCell/button is now enabled since the last
    // symbol in the encoding array has an indicator.
    const removeIndicatorButton = await screen.findByRole("button", {name: testCell.options.label});
    expect(removeIndicatorButton.getAttribute("disabled")).toBeNull();

    // Remove the indicator from the last bliss-word and check that the
    // `ActionIndicatorCell` is now disabled, and that the last symbol no longer
    // has an indicator.
    fireEvent.click(removeIndicatorButton);
    expect(removeIndicatorButton.getAttribute("disabled")).toBeDefined();
    const lastSymbol = changeEncodingContents.value.payloads[changeEncodingContents.value.payloads.length-1];
    expect(lastSymbol.composition).toStrictEqual(compositionAfterIndicatorRemoval);
  });

  test("ActionRemoveIndicatorCell restores label from baseLabel and clears baseLabel/indicatorInfo", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [blissWordWithIndicatorAndBaseLabel],
      caretPosition: 0
    };
    render(html`
      <${ActionRemoveIndicatorCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );
    const removeIndicatorButton = await screen.findByRole("button", {name: testCell.options.label});
    expect(removeIndicatorButton.getAttribute("disabled")).toBeNull();

    fireEvent.click(removeIndicatorButton);

    const restored = changeEncodingContents.value.payloads[0];
    expect(restored.label).toBe("help");
    expect(restored.baseLabel).toBeUndefined();
    expect(restored.indicatorInfo).toBeUndefined();
    expect(restored.userSelectedSymbolId).toBe(382);
  });

  test("ActionRemoveIndicatorCell keeps a modifier applied after the indicator when restoring baseLabel", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [blissWordIndicatorThenModifier],
      caretPosition: 0
    };
    render(html`
      <${ActionRemoveIndicatorCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );
    const removeIndicatorButton = await screen.findByRole("button", {name: testCell.options.label});
    expect(removeIndicatorButton.getAttribute("disabled")).toBeNull();

    fireEvent.click(removeIndicatorButton);

    const restored = changeEncodingContents.value.payloads[0];
    expect(restored.label).toBe("big walk");
    expect(restored.baseLabel).toBeUndefined();
    expect(restored.baseModifierCount).toBeUndefined();
    expect(restored.indicatorInfo).toBeUndefined();
  });

  test("ActionRemoveIndicatorCell does not double-count a modifier applied before the indicator when restoring baseLabel", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [blissWordModifierThenIndicator],
      caretPosition: 0
    };
    render(html`
      <${ActionRemoveIndicatorCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );
    const removeIndicatorButton = await screen.findByRole("button", {name: testCell.options.label});
    expect(removeIndicatorButton.getAttribute("disabled")).toBeNull();

    fireEvent.click(removeIndicatorButton);

    const restored = changeEncodingContents.value.payloads[0];
    expect(restored.label).toBe("big walk");
    expect(restored.baseLabel).toBeUndefined();
    expect(restored.baseModifierCount).toBeUndefined();
    expect(restored.indicatorInfo).toBeUndefined();
  });
});
