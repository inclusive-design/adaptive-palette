/*
 * Copyright 2023-2024 Inclusive Design Research Centre, OCAD University
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
import { Palette } from "./Palette";

describe("Palette component", (): void => {

  // The test palette defines three cells, but they collectively define a
  // palette of four rows and six columns.
  const testPalette = {
    "name": "Test Palette",
    "cells": {
      "firstCell": {
        "type": "ActionBmwCodeCell",
        "options": {
          "label": "First Cell",
          "bciAvId": [
            17720,
            "/",
            17697
          ],
          "rowStart": 3,
          "rowSpan": 1,
          "columnStart": 3,
          "columnSpan": 1
        }
      },
      "secondCell": {
        "type": "ActionBmwCodeCell",
        "options": {
          "label": "Second Cell",
          "bciAvId": 23409,
          "rowStart": 3,
          "rowSpan": 1,
          "columnStart": 4,
          "columnSpan": 1
        }
      },
      "thirdCell": {
        "type": "ActionBmwCodeCell",
        "options": {
          "label": "Third Cell",
          "bciAvId": [
            25554,
            "/",
            12335
          ],
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

    const paletteElement = document.querySelector("div.paletteContainer");
    expect(paletteElement).toBeVisible();
    expect(paletteElement).toBeValid();

    // There should be 6 columns in the grid and NUM_CELLS children.
    expect(paletteElement).toHaveStyle("grid-template-columns: repeat(5, 1fr);");
    expect(paletteElement.childNodes.length).toBe(NUM_CELLS);
  });
});
