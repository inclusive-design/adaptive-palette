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

import { initAdaptivePaletteGlobals } from "./GlobalData";
import { CommandCursorBackward } from "./CommandCursorBackward";

describe("CommandCursorBackward render tests", (): void => {

  const TEST_CELL_ID = "command-cursor-backwards";
  const testCell = {
    options: {
      "label": "Backward",
      "bciAvId": [ 12613, ";", 24670 ],
      "rowStart": 2,
      "rowSpan": 1,
      "columnStart": 11,
      "columnSpan": 1,
      "ariaControls": "bmw-encoding-area"
    }
  };

  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  });

  test("CommandCursorBackward rendering", async (): Promise<void> => {

    render(html`
      <${CommandCursorBackward}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );

    // Check the rendered cell
    const button = await screen.findByRole("button", {name: testCell.options.label});

    // Check that the CommandCursorBackward button is rendered and has the
    // correct attributes and text.
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(TEST_CELL_ID);
    expect(button.getAttribute("class")).toBe("btn-command");
    expect(button.textContent).toBe(testCell.options.label);

    // Check the grid cell styles.
    expect(button.style["grid-column"]).toBe(
      `${testCell.options.columnStart} / span ${testCell.options.columnSpan}`
    );
    expect(button.style["grid-row"]).toBe(
      `${testCell.options.rowStart} / span ${testCell.options.rowSpan}`
    );

    // Check aria-controls
    expect(button.getAttribute("aria-controls")).toBe(testCell.options.ariaControls);

    // Check disabled state (should be enabled)
    expect(button.getAttribute("disabled")).toBe(null);
  });

});

