/*
 * Copyright 2025 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */
import { render, screen, fireEvent } from "@testing-library/preact";
import "@testing-library/jest-dom";
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
      "bciAvId": [ 17448, "//", 14430, "/", 8993,  "/", 8998 ]
    }
  };

  // The structure of these objects is what is added to or removed from the
  // `changeEncodingContents` signal value
  const blissWordNoIndicator = {
    id: "another-fake-id",
    label: "opposite",
    bciAvId: 15927
  };
  const blissWordWithIndicator = {
    id: "yet-another-fake-id",
    label: "don't know",
    bciAvId: [ 15162, ";", 8993, "/", 15733 ]
  };
  const bciAvIdAfterIndicatorRemoval = [ 15162, "/", 15733 ];

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
    expect(removeIndicatorButton.style["grid-column"]).toBe("2 / span 1");
    expect(removeIndicatorButton.style["grid-row"]).toBe("3 / span 2");

    // Check disabled state.  `changeEncodingContents.value` is initialized
    // with an empty array, hence there should be a `disabled` attribute.
    expect(removeIndicatorButton.getAttribute("disabled")).toBeDefined();
  });

  test("Single ActionIndicatorCell rendering, still disabled", async (): Promise<void> => {

    // Put a symbol into the `changeEncodingContents` that has no
    // indicator.  The rendered `ActionRemoveIndicatorCell` should remain
    // disabled since there is no indicator to remove.
    changeEncodingContents.value = [blissWordNoIndicator];
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
    changeEncodingContents.value.push(blissWordWithIndicator);
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
    changeEncodingContents.value.push(blissWordNoIndicator);
    changeEncodingContents.value.push(blissWordWithIndicator);
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
    const lastSymbol = changeEncodingContents.value[changeEncodingContents.value.length-1];
    expect(lastSymbol.bciAvId).toStrictEqual(bciAvIdAfterIndicatorRemoval);
  });
});

