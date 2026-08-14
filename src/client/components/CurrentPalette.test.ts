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

import { render, screen, waitFor, fireEvent } from "@testing-library/preact";
import { html } from "htm/preact";

import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { adaptivePaletteGlobals } from "../state/GlobalData";
import { CurrentPalette } from "./CurrentPalette";
import { CommandGoBackCell } from "../cells/CommandGoBackCell";

describe("CurrentPalette", (): void => {

  const firstPalette = {
    "name": "First Palette",
    "cells": {
      "firstCell": {
        "type": "ActionCodeCell",
        "options": {
          "label": "First Cell",
          "composition": 823,
          "rowStart": 1,
          "rowSpan": 1,
          "columnStart": 1,
          "columnSpan": 1
        }
      }
    }
  };

  const secondPalette = {
    "name": "Second Palette",
    "cells": {
      "secondCell": {
        "type": "ActionCodeCell",
        "options": {
          "label": "Second Cell",
          "composition": 2411,
          "rowStart": 1,
          "rowSpan": 1,
          "columnStart": 1,
          "columnSpan": 1
        }
      }
    }
  };

  const goBackCell = {
    options: {
      "label": "Back Up",
      "composition": 1248,
      "rowStart": 1,
      "rowSpan": 1,
      "columnStart": 1,
      "columnSpan": 1
    }
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  beforeEach((): void => {
    adaptivePaletteGlobals.navigationStack.flushReset(null);
  });

  test("Nothing is rendered when no palette is current", (): void => {
    const { container } = render(html`<${CurrentPalette} />`);
    expect(container.innerHTML).toBe("");
  });

  test("The current palette is rendered", async (): Promise<void> => {
    adaptivePaletteGlobals.navigationStack.currentPalette = firstPalette;
    const { container } = render(html`<${CurrentPalette} />`);

    expect(await screen.findByText("First Cell")).toBeVisible();
    expect(container.querySelector("[data-palettename='First Palette']")).not.toBeNull();
  });

  test("Changing the current palette re-renders", async (): Promise<void> => {
    adaptivePaletteGlobals.navigationStack.currentPalette = firstPalette;
    const { container } = render(html`<${CurrentPalette} />`);
    await screen.findByText("First Cell");

    // No re-render is requested; the component subscribes to the navigation stack.
    adaptivePaletteGlobals.navigationStack.currentPalette = secondPalette;

    await waitFor(() => {
      expect(container.querySelector("[data-palettename='Second Palette']")).not.toBeNull();
    });
    expect(container.querySelector("[data-palettename='First Palette']")).toBeNull();
  });

  test("A Back button in another render root drives this one", async (): Promise<void> => {
    // How the application is actually put together: `Back` and `Home` live in the input
    // area palette, mounted separately from the display area they navigate.
    const { paletteStore, navigationStack } = adaptivePaletteGlobals;
    paletteStore.addPalette(firstPalette);
    paletteStore.addPalette(secondPalette);
    navigationStack.push(firstPalette);
    navigationStack.currentPalette = secondPalette;

    const { container } = render(html`<${CurrentPalette} />`);
    render(html`
      <${CommandGoBackCell} id="back-in-another-root" options=${goBackCell.options} />
    `);
    await screen.findByText("Second Cell");

    fireEvent.click(await screen.findByRole("button", { name: goBackCell.options.label }));

    await waitFor(() => {
      expect(container.querySelector("[data-palettename='First Palette']")).not.toBeNull();
    });
    expect(navigationStack.depth).toBe(0);
  });
});
