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

import { render, screen } from "@testing-library/preact";
import { html } from "htm/preact";

import { adaptivePaletteGlobals } from "../state/GlobalData";
import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
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
      "composition": 1248
    }
  };
  const goBackCellAriaControls = {
    options: {
      "label": "Back Up non-empty aria-controls",
      "rowStart": "3",
      "rowSpan": "2",
      "columnStart": "2",
      "columnSpan": "1",
      "composition": 1248
    }
  };
  const goBackCellOnStack = {
    options: {
      "label": "Back Up with a stack",
      "rowStart": "3",
      "rowSpan": "2",
      "columnStart": "2",
      "columnSpan": "1",
      "composition": 1248
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

    // Check that the ActionCodeCell/button is rendered and has the correct
    // attributes and text.
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(TEST_CELL1_ID);
    expect(button.getAttribute("class")).toBe("btn-command");
    expect(button.textContent).toBe(goBackCellNoAriaControls.options.label);
    expect(button.getAttribute("aria-controls")).toBe("");

    // Check the grid cell styles.
    expect(button.style.getPropertyValue("grid-column")).toBe("2 / span 1");
    expect(button.style.getPropertyValue("grid-row")).toBe("3 / span 2");

    // The navigation stack is empty at this point, so Back has nowhere to go.
    expect(button).toHaveAttribute("aria-disabled", "true");
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

  test("CommandGoBackCell is available once a palette is on the stack", async (): Promise<void> => {
    const somePalette = { "name": "somePalette", "cells": {} };
    adaptivePaletteGlobals.navigationStack.push(somePalette);
    expect(adaptivePaletteGlobals.navigationStack.depth).toBe(1);

    render(html`
      <${CommandGoBackCell}
        id="uuid-of-a-third-kind"
        options=${goBackCellOnStack.options}
      />`
    );

    const button = await screen.findByRole("button", { name: goBackCellOnStack.options.label });
    expect(button).toHaveAttribute("aria-disabled", "false");

    adaptivePaletteGlobals.navigationStack.flushReset(null);
  });
});
