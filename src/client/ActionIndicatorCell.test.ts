/*
 * Copyright 2024 Inclusive Design Research Centre, OCAD University
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

import { initAdaptivePaletteGlobals } from "./GlobalData";
import { ActionIndicatorCell } from "./ActionIndicatorCell";

describe("ActionIndicatorCell render tests", (): void => {

  const TEST_CELL_ID = "uuid-for-indicator-cell";
  const testCell = {
    options: {
      "label": "Plural",
      "rowStart": "3",
      "rowSpan": "2",
      "columnStart": "2",
      "columnSpan": "1",
      "bciAvId": 9011
    }
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  test("Single ActionIndicatorCell rendering", async (): Promise<void> => {

    render(html`
      <${ActionIndicatorCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );

    // Check the rendered cell
    const button = await screen.findByRole("button", {name: testCell.options.label});

    // Check that the ActionIndicatorCell/button is rendered and has the correct
    // attributes and text.
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(TEST_CELL_ID);
    expect(button.getAttribute("class")).toBe("ActionIndicatorCell");
    expect(button.textContent).toBe(testCell.options.label);

    // Check the grid cell styles.
    expect(button.style["grid-column"]).toBe("2 / span 1");
    expect(button.style["grid-row"]).toBe("3 / span 2");

    // Check disabled state (should be enabled)
    expect(button.getAttribute("disabled")).toBe(null);
  });

});
