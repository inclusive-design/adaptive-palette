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

import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { Palette } from "./Palette";

describe("Palette", (): void => {

  // The test palette defines three cells, but they collectively define a
  // palette of four rows and six columns.
  const testPalette = {
    "name": "Test Palette",
    "cells": {
      "firstCell": {
        "type": "ActionCodeCell",
        "options": {
          "label": "First Cell",
          "composition": [
            652,
            "/",
            646
          ],   // IDsfor bciAvIds 17720, 17697
          "rowStart": 3,
          "rowSpan": 1,
          "columnStart": 3,
          "columnSpan": 1
        }
      },
      "secondCell": {
        "type": "ActionCodeCell",
        "options": {
          "label": "Second Cell",
          "composition": 823,
          "rowStart": 3,
          "rowSpan": 1,
          "columnStart": 4,
          "columnSpan": 1
        }
      },
      "thirdCell": {
        "type": "ActionCodeCell",
        "options": {
          "label": "Third Cell",
          "composition": [
            1028,
            "/",
            106
          ],   // IDsfor bciAvIds 25554, 12335
          "rowStart": 3,
          "rowSpan": 1,
          "columnStart": 5,
          "columnSpan": 1
        }
      }
    }
  };
  const NUM_CELLS = Object.keys(testPalette.cells).length;

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  test("Render palette", async(): Promise<void> => {

    // render() the palette and then wait until its first cell is available to
    // ensure that the entire palette is in the DOM.
    render(html`<${Palette} json=${testPalette}/>`);
    const firstCell = await screen.findByText("First Cell");
    expect(firstCell).toBeInTheDocument();

    const paletteElement = document.querySelector("div.paletteContainer") as HTMLElement;
    if (!paletteElement) {
      throw new Error("Palette element with class 'paletteContainer' not found in the DOM");
    }

    expect(paletteElement).toBeVisible();
    expect(paletteElement).toBeValid();

    // There should be 6 columns in the grid and NUM_CELLS children.
    expect(paletteElement.style["grid-template-columns" as keyof typeof paletteElement.style]).toBe("repeat(5, 1fr)");
    expect(paletteElement.childNodes.length).toBe(NUM_CELLS);
  });
});
