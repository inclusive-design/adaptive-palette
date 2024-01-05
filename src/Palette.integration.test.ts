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

import { render, screen, fireEvent } from "@testing-library/preact";
import "@testing-library/jest-dom";
import { html } from "htm/preact";

import { initAdaptivePaletteGlobals } from "./GlobalData";
import { Palette } from "./Palette";

describe("Palette integration test", () => {

  // The test palette defines all cell types that need to coordinate with each other.
  const testPalette = {
    "name": "Test Palette",
    "cells": {
      "bmw-encoding-area": {
        "type": "ContentBmwEncoding",
        "options": {
          "rowStart": 2,
          "rowSpan": 1,
          "columnStart": 1,
          "columnSpan": 12
        }
      },
      "command-del-last-encoding": {
        "type": "CommandDelLastEncoding",
        "options": {
          "label": "Delete",
          "bciAvId": 12613,
          "rowStart": 2,
          "rowSpan": 1,
          "columnStart": 13,
          "columnSpan": 1
        }
      },
      "command-clear-encoding": {
        "type": "CommandClearEncoding",
        "options": {
          "label": "Clear",
          "bciAvId": 13665,
          "rowStart": 2,
          "rowSpan": 1,
          "columnStart": 14,
          "columnSpan": 1
        }
      },
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
      }
    }
  };

  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  });

  test("Cell coordinations among bmw action cells, BMW encoding area, delete and clear buttons", async() => {
    // render() the palette and then wait until its first cell is available to
    // insure that the entire palette is in the DOM.
    render(html`<${Palette} json=${testPalette}/>`);
    const firstCell = await screen.findByText("First Cell");
    expect(firstCell).toBeInTheDocument();

    // The initial content area doesn't have anything displayed
    const contentArea = await screen.findByLabelText("BMW Encoding Area");
    expect(contentArea.childNodes.length).toBe(0);

    // The content area displays one symbol after clicking the first cell
    fireEvent.click(firstCell);
    expect(contentArea.childNodes.length).toBe(1);
    expect(contentArea.childNodes[0].childNodes[1].textContent).toBe("First Cell");

    // The content area displays two symbols after clicking the second cell
    const secondCell = await screen.findByText("Second Cell");
    fireEvent.click(secondCell);
    expect(contentArea.childNodes.length).toBe(2);
    expect(contentArea.childNodes[0].childNodes[1].textContent).toBe("First Cell");
    expect(contentArea.childNodes[1].childNodes[1].textContent).toBe("Second Cell");

    // The content area displays one symbols after clicking the delete button
    const deleteButton = await screen.findByText("Delete");
    fireEvent.click(deleteButton);
    expect(contentArea.childNodes.length).toBe(1);
    expect(contentArea.childNodes[0].childNodes[1].textContent).toBe("First Cell");

    // Add two more symbols to the content area in preparation for testing the clear button
    fireEvent.click(firstCell);
    fireEvent.click(secondCell);
    expect(contentArea.childNodes.length).toBe(3);
    expect(contentArea.childNodes[0].childNodes[1].textContent).toBe("First Cell");
    expect(contentArea.childNodes[1].childNodes[1].textContent).toBe("First Cell");
    expect(contentArea.childNodes[2].childNodes[1].textContent).toBe("Second Cell");

    // The content area is cleared after clicking the clear button
    const clearButton = await screen.findByText("Clear");
    fireEvent.click(clearButton);
    expect(contentArea.childNodes.length).toBe(0);
  });
});
