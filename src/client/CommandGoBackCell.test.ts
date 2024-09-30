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
import { CommandGoBackCell } from "./CommandGoBackCell";

describe("CommandGoBackCell render tests", (): void => {

  const TEST_CELL1_ID = "uuid-of-some-kind";
  const goBackCell = {
    options: {
      "label": "Back Up",
      "rowStart": "3",
      "rowSpan": "2",
      "columnStart": "2",
      "columnSpan": "1",
      "bciAvId": 12612
    }
  };

  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  });

  test("CommandGoBackCell rendering", async (): Promise<void> => {

    render(html`
      <${CommandGoBackCell}
        id="${TEST_CELL1_ID}"
        options=${goBackCell.options}
      />`
    );

    // Check the rendered cell with TEST_CELL_ID1
    const button = await screen.findByRole("button", {name: goBackCell.options.label});

    // Check that the ActionBmwCodeCell/button is rendered and has the correct
    // attributes and text.
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(TEST_CELL1_ID);
    expect(button.getAttribute("class")).toBe("btn-command");
    expect(button.textContent).toBe(goBackCell.options.label);

    // Check the grid cell styles.
    expect(button.style["grid-column"]).toBe("2 / span 1");
    expect(button.style["grid-row"]).toBe("3 / span 2");

    // Check disabled state (should be enabled)
    expect(button.getAttribute("disabled")).toBe(null);
  });
});
