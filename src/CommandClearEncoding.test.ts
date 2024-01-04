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
import { CommandClearEncoding } from "./CommandClearEncoding";

describe("CommandClearEncoding render tests", () => {

  const TEST_CELL_ID = "command-del-last-encoding";
  const testCell = {
    options: {
      "label": "Clear",
      "bciAvId": 13665,
      "rowStart": 2,
      "rowSpan": 1,
      "columnStart": 14,
      "columnSpan": 1
    }
  };

  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  });

  test("CommandClearEncoding rendering", async () => {

    render(html`
      <${CommandClearEncoding}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );

    // Check the rendered cell
    const button = await screen.findByRole("button", {name: testCell.options.label});

    // Check that the CommandClearEncoding/button is rendered and has the correct
    // attributes and text.
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(TEST_CELL_ID);
    expect(button.getAttribute("class")).toBe("commandClearEncoding");
    expect(button.textContent).toBe(testCell.options.label);

    // Check the grid cell styles.
    expect(button.style["grid-column"]).toBe("14 / span 1");
    expect(button.style["grid-row"]).toBe("2 / span 1");

    // Check disabled state (should be enabled)
    expect(button.getAttribute("disabled")).toBe(null);
  });

});
