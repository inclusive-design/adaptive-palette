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

import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import "@testing-library/jest-dom";
import { html } from "htm/preact";

import { initAdaptivePaletteGlobals, adaptivePaletteGlobals } from "./GlobalData";
import { Palette } from "./Palette";

describe("Palette integration test", () => {

  // The test palettes defines all cell types that need to coordinate with each other.
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
      },
      "goToCell": {
        "type": "ActionBranchToPaletteCell",
        "options": {
          "label": "Go To",
          "branchTo": "People",
          "bciAvId": 12343,
          "rowStart": 3,
          "rowSpan": 1,
          "columnStart": 4,
          "columnSpan": 1
        }
      }
    }
  };

  // A second layer palette that `testPalette` can navigate to from its
  // `goToCell` cell.  This second layer contains a go-back cell.
  const testLayerOnePalette = {
    "name": "People",
    "cells": {
      "woman": {
        "type": "ActionBmwCodeCell",
        "options": {
          "label": "Woman",
          "bciAvId": 18269,
          "rowStart": 3,
          "rowSpan": 1,
          "columnStart": 6,
          "columnSpan": 4
        }
      },
      "person": {
        "type": "ActionBmwCodeCell",
        "options": {
          "label": "Person",
          "bciAvId":  16161,
          "rowStart": 4,
          "rowSpan": 1,
          "columnStart": 6,
          "columnSpan": 4
        }
      },
      "man": {
        "type": "ActionBmwCodeCell",
        "options": {
          "label": "Man",
          "bciAvId":  15416,
          "rowStart": 5,
          "rowSpan": 1,
          "columnStart": 6,
          "columnSpan": 4
        }
      },
      "back-up": {
        "type": "CommandGoBackCell",
        "options": {
          "label": "Back Up",
          "bciAvId":  12612,
          "rowStart": 3,
          "rowSpan": 1,
          "columnStart": 1,
          "columnSpan": 1
        }
      }
    }
  };

  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
    // Pre-load `testLayerOnePalette` to avoid importing it from a non-existent
    // disk file.
    adaptivePaletteGlobals.paletteStore.addPalette(testLayerOnePalette);
  });

  test("Cell coordinations among bmw action cells, input area, delete and clear buttons", async() => {
    // render() the palette and then wait until its first cell is available to
    // insure that the entire palette is in the DOM.
    render(html`<${Palette} json=${testPalette}/>`);
    const navStack = adaptivePaletteGlobals.navigationStack;
    navStack.currentPalette = { palette: testPalette, htmlElement: document.body };

    const firstCell = await screen.findByText("First Cell");
    expect(firstCell).toBeInTheDocument();

    // The initial content area doesn't have anything displayed
    const contentArea = await screen.findByLabelText("Input Area");
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

    // Trigger forward navigation.
    // Note: the element whose text is "Go To" is actually a <div> within the
    // <button> of interest.  The button is that <div>'s parent.  Similarly
    // for the "Back Up" button.
    const goForwardButton = (await screen.findByText("Go To")).parentElement;

    fireEvent.click(goForwardButton);
    const goBackButton = (await waitFor(() => screen.findByText("Back Up"))).parentElement;
    expect(goBackButton).toBeInTheDocument();
    expect(navStack.currentPalette.palette).toBe(testLayerOnePalette);
    expect(navStack.peek().palette).toBe(testPalette);

    // Trigger go-back navigation
    fireEvent.click(goBackButton);
    await waitFor(() => expect(firstCell).toBeInTheDocument());
    expect(navStack.currentPalette.palette).toBe(testPalette);
    expect(navStack.isEmpty()).toBe(true);
  });
});
