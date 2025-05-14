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
import { render, screen } from "@testing-library/preact";
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

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  test("Single ActionRemoveIndicatorCell rendering, disabled", async (): Promise<void> => {

    render(html`
      <${ActionRemoveIndicatorCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );

    // Check the rendered cell
    const button = await screen.findByRole("button", {name: testCell.options.label});

    // Check that the ActionRemoveIndicatorCell/button is rendered and has the correct
    // attributes and text.
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(TEST_CELL_ID);
    expect(button.getAttribute("class")).toBe("actionIndicatorCell");
    expect(button.textContent).toBe(testCell.options.label);

    // Check the grid cell styles.
    expect(button.style["grid-column"]).toBe("2 / span 1");
    expect(button.style["grid-row"]).toBe("3 / span 2");

    // Check disabled state.  `changeEncodingContents.value` is initialized
    // with an empty array, hence there should be a `disabled` attribute.
    expect(button.getAttribute("disabled")).toBeDefined();
  });

  test("Single ActionIndicatorCell rendering, still disabled", async (): Promise<void> => {

    // Put a symbol into the `changeEncodingContents` that has no
    // indicator.  The rendered `ActionRemoveIndicatorCell` should remain
    // disabled since there is no indicator to remove.
    changeEncodingContents.value = [{
      id: "another-fake-id",
      label: "opposite",
      bciAvId: 15927
    }];

    render(html`
      <${ActionRemoveIndicatorCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );
    const button = await screen.findByRole("button", {name: testCell.options.label});
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(TEST_CELL_ID);
    expect(button.getAttribute("disabled")).toBeDefined();
  });

  test("Single ActionIndicatorCell rendering, enabled", async (): Promise<void> => {

    // Add a symbol *with* an indicator and render the ActionIndicatorCell.
    changeEncodingContents.value.push({
      id: "yet-another-fake-id",
      label: "opposite",
      bciAvId: [ 15162, ";", 8993, "/", 15733 ]
    });

    render(html`
      <${ActionRemoveIndicatorCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );
    // Check that the ActionIndicatorCell/button is now enabled
    // since the last symbol in the encoding array has an indicator.
    const button = await screen.findByRole("button", {name: testCell.options.label});
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(TEST_CELL_ID);
    expect(button.getAttribute("disabled")).toBeNull();
  });

});

