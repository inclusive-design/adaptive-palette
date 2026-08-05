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
import { fireEvent } from "@testing-library/dom";
import { html } from "htm/preact";

import { initAdaptivePaletteGlobals, adaptivePaletteGlobals, navigationDepth } from "./GlobalData";
import { CommandGoToRootCell } from "./CommandGoToRootCell";

describe("CommandGoToRootCell render tests", (): void => {

  const TEST_CELL_ID = "uuid-home-cell";
  const homeCell = {
    options: {
      "label": "Home",
      "rowStart": 1,
      "rowSpan": 1,
      "columnStart": 2,
      "columnSpan": 1,
      "composition": 1816
    }
  };

  const rootPalette = {
    "name": "rootPalette",
    "cells": {
      "rootCell": {
        "type": "ActionBranchToPaletteCell",
        "options": {
          "label": "Family",
          "composition": 730,
          "branchTo": "My Family Palette",
          "rowStart": 1,
          "rowSpan": 1,
          "columnStart": 1,
          "columnSpan": 1
        }
      }
    }
  };

  const secondPalette = {
    "name": "secondPalette",
    "cells": {
      "secondCell": {
        "type": "ActionBranchToPaletteCell",
        "options": {
          "label": "People",
          "composition": 1758,
          "branchTo": "People",
          "rowStart": 1,
          "rowSpan": 1,
          "columnStart": 1,
          "columnSpan": 1
        }
      }
    }
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  beforeEach((): void => {
    adaptivePaletteGlobals.navigationStack.flushReset(null);
  });

  test("Home is unavailable when the stack is empty", async (): Promise<void> => {
    render(html`
      <${CommandGoToRootCell} id="${TEST_CELL_ID}" options=${homeCell.options} />
    `);

    const button = await screen.findByRole("button", { name: homeCell.options.label });

    expect(button).toBeVisible();
    expect(button.id).toBe(TEST_CELL_ID);
    expect(button.getAttribute("class")).toBe("btn-command");
    expect(button.style.getPropertyValue("grid-column")).toBe("2 / span 1");
    expect(button.style.getPropertyValue("grid-row")).toBe("1 / span 1");
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  test("Home becomes available once a palette is pushed", async (): Promise<void> => {
    const displayArea = document.createElement("div");
    document.body.appendChild(displayArea);

    adaptivePaletteGlobals.navigationStack.push({ palette: rootPalette, htmlElement: displayArea });

    render(html`
      <${CommandGoToRootCell} id="${TEST_CELL_ID}" options=${homeCell.options} />
    `);

    const button = await screen.findByRole("button", { name: homeCell.options.label });
    expect(button).toHaveAttribute("aria-disabled", "false");
  });

  test("Clicking Home renders the root palette and empties the stack", async (): Promise<void> => {
    const displayArea = document.createElement("div");
    document.body.appendChild(displayArea);

    // Two levels deep: the root was pushed first, then the second palette.
    adaptivePaletteGlobals.navigationStack.push({ palette: rootPalette, htmlElement: displayArea });
    adaptivePaletteGlobals.navigationStack.push({ palette: secondPalette, htmlElement: displayArea });
    expect(navigationDepth.value).toBe(2);

    render(html`
      <${CommandGoToRootCell} id="${TEST_CELL_ID}" options=${homeCell.options} />
    `);

    const button = await screen.findByRole("button", { name: homeCell.options.label });
    fireEvent.click(button);

    expect(navigationDepth.value).toBe(0);
    expect(adaptivePaletteGlobals.navigationStack.currentPalette?.palette.name).toBe("rootPalette");
    expect(displayArea.querySelector("[data-palettename='rootPalette']")).not.toBeNull();
  });

  test("Clicking Home while unavailable does nothing", async (): Promise<void> => {
    render(html`
      <${CommandGoToRootCell} id="${TEST_CELL_ID}" options=${homeCell.options} />
    `);

    const button = await screen.findByRole("button", { name: homeCell.options.label });
    fireEvent.click(button);

    expect(navigationDepth.value).toBe(0);
    expect(adaptivePaletteGlobals.navigationStack.currentPalette).toBeNull();
  });
});
