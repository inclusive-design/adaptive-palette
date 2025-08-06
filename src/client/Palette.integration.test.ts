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

import { initAdaptivePaletteGlobals, adaptivePaletteGlobals, changeEncodingContents } from "./GlobalData";
import { Palette } from "./Palette";
import { goBackImpl } from "./CommandGoBackCell";

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

  // Indicator "tool bar" palette
  const PLURAL_INDICATOR_ID = 9011;
  const ACTION_INDICATOR_ID = 8993;
  const testIndicatorPalette = {
    "name": "indicator tool bar",
    "cells": {
      "SVG:9011:SVG-fb89740b-0a1a-4fcb-8275-bdaabe32a5dc": {
        "type": "ActionIndicatorCell",
        "options": {
          "label": "plural",
          "bciAvId": PLURAL_INDICATOR_ID,
          "rowStart": 1,
          "rowSpan": 1,
          "columnStart": 8,
          "columnSpan": 1
        }
      },
      "action-49abcd96-b0af-4c66-8400-b9a0cb3a20c8": {
        "type": "ActionIndicatorCell",
        "options": {
          "label": "action",
          "bciAvId": ACTION_INDICATOR_ID,
          "rowStart": 1,
          "rowSpan": 1,
          "columnStart": 4,
          "columnSpan": 1
        }
      },
      "remove-indicator-ce71d580-2712-44b8-9daf-7e894295d827": {
        "type": "ActionRemoveIndicatorCell",
        "options": {
          "label": "remove indicator",
          "bciAvId": [ 17448, "//", 14430, "/", 8993,  "/", 8998 ],
          "rowStart": 1,
          "rowSpan": 1,
          "columnStart": 12,
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
  });

  test("Navigation to other layers, and going back", async() => {
    render(html`<${Palette} json=${testPalette}/>`);
    const navStack = adaptivePaletteGlobals.navigationStack;
    const firstCell = await screen.findByText("First Cell");

    // Trigger forward navigation.
    // Note: the element whose text is "Go To" is actually a <div> within the
    // <button> of interest.  The button is that <div>'s parent.  Similarly
    // for the "Back Up" button.
    let goForwardButton = (await screen.findByText("Go To")).parentElement;

    fireEvent.click(goForwardButton);
    let goBackButton = (await waitFor(() => screen.findByText("Back Up"))).parentElement;
    expect(goBackButton).toBeInTheDocument();
    expect(navStack.currentPalette.palette).toBe(testLayerOnePalette);
    expect(navStack.peek().palette).toBe(testPalette);

    // Trigger go-back navigation by clicking the `goBackButon`
    fireEvent.click(goBackButton);
    await waitFor(() => expect(firstCell).toBeInTheDocument());
    expect(navStack.currentPalette.palette).toBe(testPalette);
    expect(navStack.isEmpty()).toBe(true);

    // Go forward again, then trigger go-back navigation by calling the go-back
    // function.  This is a way of testing that go-back functionality is
    // available to other kinds of events such as a key press.
    goForwardButton = (await screen.findByText("Go To")).parentElement;
    expect(goForwardButton).toBeInTheDocument();
    fireEvent.click(goForwardButton);
    goBackButton = (await waitFor(() => screen.findByText("Back Up"))).parentElement;
    expect(navStack.currentPalette.palette).toBe(testLayerOnePalette);
    expect(navStack.peek().palette).toBe(testPalette);
    await goBackImpl();
    expect(navStack.currentPalette.palette).toBe(testPalette);
    expect(navStack.isEmpty()).toBe(true);

    // Go forward once again, then trigger go-back navigation by calling the
    // go-back function, this time passing a container element id.
    goForwardButton = (await screen.findByText("Go To")).parentElement;
    expect(goForwardButton).toBeInTheDocument();
    fireEvent.click(goForwardButton);
    goBackButton = (await waitFor(() => screen.findByText("Back Up"))).parentElement;
    expect(navStack.currentPalette.palette).toBe(testLayerOnePalette);
    expect(navStack.peek().palette).toBe(testPalette);
    await goBackImpl(goBackButton.getAttribute("aria-controls"));
    expect(navStack.currentPalette.palette).toBe(testPalette);
    expect(navStack.isEmpty()).toBe(true);
  });

  test("Coordination among adding, replacing, and removing indicators", async() => {
    // Setup: add the testPalette of symbols to the document as well as the
    // indicator strip.  Find the first symbol cell and the plural indicator
    // in their palettes and click the first cell to add it to the
    // content area.
    //
    render(html`<${Palette} json=${testPalette}/>`);
    render(html`<${Palette} json=${testIndicatorPalette}/>`);
    const firstCell = await screen.findByText("First Cell");
    const addPluralButton = await screen.findByText("plural");
    expect(firstCell).toBeInTheDocument();
    expect(addPluralButton).toBeInTheDocument();
    fireEvent.click(firstCell);
    let firstSymbol = changeEncodingContents.value.payloads[0];
    expect(firstSymbol.bciAvId.includes(PLURAL_INDICATOR_ID)).toBe(false);
    expect(firstSymbol.bciAvId.includes(ACTION_INDICATOR_ID)).toBe(false);

    // Click the `addPluralButton` and check that the plural indicator has been
    // added to the symbol in the content area.
    fireEvent.click(addPluralButton);
    firstSymbol = changeEncodingContents.value.payloads[0];
    expect(firstSymbol.bciAvId.includes(PLURAL_INDICATOR_ID)).toBe(true);
    expect(firstSymbol.bciAvId.includes(ACTION_INDICATOR_ID)).toBe(false);

    // Find and click the add-action-indicator button and check that the
    // plural indicator has been replaced with the action indicator.
    const addActionButton = await screen.findByText("action");
    fireEvent.click(addActionButton);
    firstSymbol = changeEncodingContents.value.payloads[0];
    expect(firstSymbol.bciAvId.includes(PLURAL_INDICATOR_ID)).toBe(false);
    expect(firstSymbol.bciAvId.includes(ACTION_INDICATOR_ID)).toBe(true);

    // Find and click the remove-indicator button and check that the
    // action indicator has been removed (and that there is no plural idnicator
    // either).
    const removeIndicatorButton = await screen.findByText("remove indicator");
    fireEvent.click(removeIndicatorButton);
    firstSymbol = changeEncodingContents.value.payloads[0];
    expect(firstSymbol.bciAvId.includes(ACTION_INDICATOR_ID)).toBe(false);
    expect(firstSymbol.bciAvId.includes(PLURAL_INDICATOR_ID)).toBe(false);
  });

  test("ActionRemoveIndicator disabled state depending on the last symbol in the content area", async() => {
    // Setup: add the `testPalette` to the document as well as the indicator
    // strip.  Make sure the content area is empty.
    //
    render(html`<${Palette} json=${testPalette}/>`);
    render(html`<${Palette} json=${testIndicatorPalette}/>`);
    const clearButton = await screen.findByText("Clear");
    fireEvent.click(clearButton);
    const contentArea = await screen.findByLabelText("Input Area");
    expect(contentArea.childNodes.length).toBe(0);

    // Add the symbol in the first cell to the contents and add a plural
    // indicator to it.  The remove-indicator button should be enabled.
    const firstCell = await screen.findByText("First Cell");
    const addPluralButton = await screen.findByText("plural");
    const removeIndicatorButton = await screen.findByText("remove indicator");
    fireEvent.click(firstCell);
    fireEvent.click(addPluralButton);
    const firstSymbol = changeEncodingContents.value.payloads[0];
    expect(firstSymbol.bciAvId.includes(PLURAL_INDICATOR_ID)).toBe(true);
    expect(removeIndicatorButton.getAttribute("disabled")).toBeNull();

    // Add a second symbol to the contents, one without an indicator.  The
    // remove-indicator button should change to disabled.
    fireEvent.click(firstCell);
    expect(removeIndicatorButton.getAttribute("disabled")).toBeDefined();

    // Delete the last symbol.  The remaining symbol will still an indicator,
    // and the remove-indicator button should change to enabled.
    const deleteButton = await screen.findByText("Delete");
    fireEvent.click(deleteButton);
    expect(removeIndicatorButton.getAttribute("disabled")).toBeNull();
  });
});
