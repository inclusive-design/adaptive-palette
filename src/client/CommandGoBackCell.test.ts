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

import { initAdaptivePaletteGlobals, adaptivePaletteGlobals } from "./GlobalData";
import { CommandGoBackCell } from "./CommandGoBackCell";

describe("CommandGoBackCell render tests", (): void => {

  const TEST_CELL1_ID = "uuid-of-some-kind";
  const TEST_CELL2_ID = "uuid-of-another-kind";
  const TEST_CONTROL_ID = "non-empty-id";
  const goBackCellNoAriaControls = {
    options: {
      "label": "Back Up",
      "rowStart": "3",
      "rowSpan": "2",
      "columnStart": "2",
      "columnSpan": "1",
      "bciAvId": 12612
    }
  };
  const goBackCellAriaControls = {
    options: {
      "label": "Back Up non-empty aria-controls",
      "rowStart": "3",
      "rowSpan": "2",
      "columnStart": "2",
      "columnSpan": "1",
      "bciAvId": 12612
    }
  };

  beforeAll(async () => {
    // Note: no id provided for the element that palettes are rendered inside.
    // The `aria-controls` attribute of the test CommandGoBackCell should be
    // the empty string, at first.
    await initAdaptivePaletteGlobals();
  });

  test("CommandGoBackCell rendering, empty aria-controls", async (): Promise<void> => {

    render(html`
      <${CommandGoBackCell}
        id="${TEST_CELL1_ID}"
        options=${goBackCellNoAriaControls.options}
      />`
    );

    // Check the rendered cell with TEST_CELL_ID1
    const button = await screen.findByRole("button", {name: goBackCellNoAriaControls.options.label});

    // Check that the ActionBmwCodeCell/button is rendered and has the correct
    // attributes and text.
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(TEST_CELL1_ID);
    expect(button.getAttribute("class")).toBe("btn-command");
    expect(button.textContent).toBe(goBackCellNoAriaControls.options.label);
    expect(button.getAttribute("aria-controls")).toBe("");

    // Check the grid cell styles.
    expect(button.style["grid-column"]).toBe("2 / span 1");
    expect(button.style["grid-row"]).toBe("3 / span 2");

    // Check disabled state (should be enabled)
    expect(button.getAttribute("disabled")).toBe(null);
  });

  test("CommandGoBackCell rendering with non-empty aria-controls", async(): Promise<void> => {
    // Give the main palette rendering area a non-empty id.
    adaptivePaletteGlobals.mainPaletteContainerId = TEST_CONTROL_ID;
    render(html`
      <${CommandGoBackCell}
        id="${TEST_CELL2_ID}"
        options=${goBackCellAriaControls.options}
      />`
    );

    const button = await screen.findByRole("button", {name: goBackCellAriaControls.options.label});
    expect(button.id).toBe(TEST_CELL2_ID);
    expect(button.getAttribute("aria-controls")).toBe(TEST_CONTROL_ID);
  });
});
