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
import { ActionBranchToPaletteCell } from "./ActionBranchToPaletteCell";

describe("ActionBranchToPaletteCell render tests", (): void => {

  const TEST_CELL_ID = "uuid-of-some-kind";
  const goToPaletteCell = {
    options: {
      "label": "Animals",
      "branchTo": "Animals",
      "rowStart": "100",
      "rowSpan": "12",
      "columnStart": "33",
      "columnSpan": "11",
      "bciAvId": [ 16161, "/", 9011 ]
    }
  };

  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  });

  test("ActionBranchToPaletteCell rendering", async (): Promise<void> => {

    render(html`
      <${ActionBranchToPaletteCell}
        id="${TEST_CELL_ID}"
        options=${goToPaletteCell.options}
      />`
    );

    // Check the rendered cell
    const button = await screen.findByRole("button", {name: goToPaletteCell.options.label});

    // Check that the ActionBmwCodeCell/button is rendered and has the correct
    // attributes and text.
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(TEST_CELL_ID);
    expect(button.getAttribute("class")).toBe("actionBranchToPaletteCell foldedCorner");
    expect(button.textContent).toBe(goToPaletteCell.options.label);

    // Check the grid cell styles.
    expect(button.style["grid-column"]).toBe(`${goToPaletteCell.options.columnStart} / span ${goToPaletteCell.options.columnSpan}`);
    expect(button.style["grid-row"]).toBe(`${goToPaletteCell.options.rowStart} / span ${goToPaletteCell.options.rowSpan}`);

    // Check disabled state (should be enabled)
    expect(button.getAttribute("disabled")).toBe(null);
  });
});
