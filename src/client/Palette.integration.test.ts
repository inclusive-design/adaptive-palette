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
      },
      "command-cursor-forwards": {
        "type": "CommandCursorForward",
        "options": {
          "label": "Forward",
          "bciAvId": [ 14390, ";", 24670 ],
          "rowStart": 2,
          "rowSpan": 1,
          "columnStart": 12,
          "columnSpan": 1,
          "ariaControls": "content-encoding-area"
        }
      },
      "command-cursor-backwards": {
        "type": "CommandCursorBackward",
        "options": {
          "label": "Backward",
          "bciAvId": [ 12613, ";", 24670 ],
          "rowStart": 2,
          "rowSpan": 1,
          "columnStart": 11,
          "columnSpan": 1,
          "ariaControls": "bmw-encoding-area"
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

  // Modifier "tool bar" palette
  const OPPOSITE_MODIFIER_ID = 15927;
  const INTENSITY_MODIFIER_ID = 14947;
  const testModifierPalette = {
    "name": "modifier tool bar",
    "cells": {
      "opposite-15927-9eb5b1c4-afca-455b-bfb5-d896e8afb3e9": {
        "type": "ActionPreModifierCell",
        "options": {
          "label": "opposite of",
          "bciAvId": OPPOSITE_MODIFIER_ID,
          "rowStart": 1,
          "rowSpan": 1,
          "columnStart": 1,
          "columnSpan": 1
        }
      },
      "intensity-14947-30e39aea-b045-4082-b07b-43c0b92be8dd": {
        "type": "ActionPostModifierCell",
        "options": {
          "label": "intensity",
          "bciAvId": INTENSITY_MODIFIER_ID,
          "rowStart": 1,
          "rowSpan": 1,
          "columnStart": 2,
          "columnSpan": 1
        }
      },
      "remove_a_modifier-c4a69b52-e23f-4c4b-bd1b-2f5d9a4d4906": {
        "type": "ActionRemoveModifierCell",
        "options": {
          "label": "remove a modifier",
          "bciAvId": [ 17448 ],
          "rowStart": 1,
          "rowSpan": 1,
          "columnStart": 15,
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

  function debugLogChangeEncodingContents(preamble) {
    console.debug(`INTEGRATION TEST, ${preamble}: %O`, changeEncodingContents.value);
  };

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

  test("Coordinating adding and remove modifiers", async() => {
    // Setup: add the `testPalette` to the document as well as the modifier
    // strip.  Find the "clear all" button and activate it to clear out any
    // contents in the content area.
    render(html`<${Palette} json=${testPalette}/>`);
    render(html`<${Palette} json=${testModifierPalette}/>`);
    const clearButton = await screen.findByText("Clear");
    fireEvent.click(clearButton);
    const contentArea = await screen.findByLabelText("Input Area");
    expect(contentArea.childNodes.length).toBe(0);

    // Get the "First Cell", and the "intensity" and "oppositve" modifier
    // buttons, and the "remove a modifier" button.  The remove modifier should
    // be disabled.
    const firstCell = await screen.findByText("First Cell");
    const addIntensityButton = await screen.findByText("intensity");
    const addOppositeButton = await screen.findByText("opposite of");
    const removeModifierButton = await screen.findByText("remove a modifier");
    expect(firstCell).toBeInTheDocument();
    expect(addIntensityButton).toBeInTheDocument();
    expect(addOppositeButton).toBeInTheDocument();
    expect(removeModifierButton).toBeInTheDocument();
    expect(removeModifierButton.getAttribute("disabled")).toBeDefined();

    // Add "First Cell" to the `changeEncodingContents`.  There should be no
    // modifiers on it at this point.
    fireEvent.click(firstCell);
    let firstSymbol = changeEncodingContents.value.payloads[0];
    expect(firstSymbol.bciAvId.includes(INTENSITY_MODIFIER_ID)).toBe(false);
    expect(firstSymbol.bciAvId.includes(OPPOSITE_MODIFIER_ID)).toBe(false);
    expect(removeModifierButton.getAttribute("disabled")).toBeDefined();

    // Add the intensity modifer.
    fireEvent.click(addIntensityButton);
    firstSymbol = changeEncodingContents.value.payloads[0];
    expect(firstSymbol.bciAvId.includes(INTENSITY_MODIFIER_ID)).toBe(true);
    expect(firstSymbol.bciAvId.includes(OPPOSITE_MODIFIER_ID)).toBe(false);
    expect(removeModifierButton.getAttribute("disabled")).toBeNull();

    // Remove the intensity modifer.
    fireEvent.click(removeModifierButton);
    firstSymbol = changeEncodingContents.value.payloads[0];
    expect(firstSymbol.bciAvId.includes(INTENSITY_MODIFIER_ID)).toBe(false);
    expect(firstSymbol.bciAvId.includes(OPPOSITE_MODIFIER_ID)).toBe(false);
    expect(removeModifierButton.getAttribute("disabled")).toBeDefined();

    // Add the intensity, and then the oppposite modifiers.
    fireEvent.click(addIntensityButton);
    firstSymbol = changeEncodingContents.value.payloads[0];
    expect(firstSymbol.bciAvId.includes(INTENSITY_MODIFIER_ID)).toBe(true);
    expect(firstSymbol.bciAvId.includes(OPPOSITE_MODIFIER_ID)).toBe(false);
    expect(removeModifierButton.getAttribute("disabled")).toBeNull();
    fireEvent.click(addOppositeButton);
    firstSymbol = changeEncodingContents.value.payloads[0];
    expect(firstSymbol.bciAvId.includes(INTENSITY_MODIFIER_ID)).toBe(true);
    expect(firstSymbol.bciAvId.includes(OPPOSITE_MODIFIER_ID)).toBe(true);
    expect(removeModifierButton.getAttribute("disabled")).toBeNull();

    // Remove a modifier -- should be the last one added, the "opposite of"
    // modifier.
    fireEvent.click(removeModifierButton);
    firstSymbol = changeEncodingContents.value.payloads[0];
    expect(firstSymbol.bciAvId.includes(INTENSITY_MODIFIER_ID)).toBe(true);
    expect(firstSymbol.bciAvId.includes(OPPOSITE_MODIFIER_ID)).toBe(false);
    expect(removeModifierButton.getAttribute("disabled")).toBeNull();

    // Remove another modifier -- should be the "intensity" modifier.  Also,
    // there should be no more modifiers on the symbol and the remove button
    // should be disabled.
    fireEvent.click(removeModifierButton);
    firstSymbol = changeEncodingContents.value.payloads[0];
    expect(firstSymbol.bciAvId.includes(INTENSITY_MODIFIER_ID)).toBe(false);
    expect(firstSymbol.bciAvId.includes(OPPOSITE_MODIFIER_ID)).toBe(false);
    expect(removeModifierButton.getAttribute("disabled")).toBeDefined();
  });

  test("Coordinating cursor movement and editing", async() => {
    // Setup: add the `testPalette`, the indicator and modifier srtips
    // Find the "clear all" button and activate it to clear out any
    // contents in the content area.
    render(html`<${Palette} json=${testPalette}/>`);
    render(html`<${Palette} json=${testIndicatorPalette}/>`);
    render(html`<${Palette} json=${testModifierPalette}/>`);
    const clearButton = await screen.findByText("Clear");
    fireEvent.click(clearButton);
    const contentArea = await screen.findByLabelText("Input Area");
    expect(contentArea.childNodes.length).toBe(0);
    expect(changeEncodingContents.value.caretPosition).toBe(-1);

    // Add three symbols to the content area.  The cursor posiiton should be
    // after the third symbol (= 2).
    const firstCell = await screen.findByText("First Cell");
    fireEvent.click(firstCell);
    const secondCell = await screen.findByText("Second Cell");
    fireEvent.click(secondCell);
    fireEvent.click(firstCell);
    const cursorForward = await screen.findByText("Forward");
    const cursorBackward = await screen.findByText("Backward");
    debugLogChangeEncodingContents("FIRST");
    expect(contentArea.childNodes.length).toBe(3);
    expect(changeEncodingContents.value.caretPosition).toBe(2);

    // Cannot move cursor forward since at the end (right most). Caret position
    // should not change.
    fireEvent.click(cursorForward);
    debugLogChangeEncodingContents("CURSOR FORWARD AT RIGHT");
    expect(changeEncodingContents.value.caretPosition).toBe(2);

    // Move all the way to left -- click backward twice.  Caret position should
    // be zero.
    fireEvent.click(cursorBackward);
    fireEvent.click(cursorBackward);
    expect(changeEncodingContents.value.caretPosition).toBe(0);

    // Move right one symbol.  Caret position should be 1, and the symbol itself
    // should be secondCell's symbol.
    fireEvent.click(cursorForward);
    let symbolAtCaret = changeEncodingContents.value.payloads[1];
    const paletteSecondCell = testPalette.cells["secondCell"];
    expect(changeEncodingContents.value.caretPosition).toBe(1);
    expect(symbolAtCaret.label).toBe(paletteSecondCell.options.label);
    expect(symbolAtCaret.bciAvId).toStrictEqual([paletteSecondCell.options.bciAvId]);

    // Add an indicator to the symbol at the cursor.  Caret position should not
    // change, but symbol's bciAvId should now have a semi-colon.
    const pluralButton = await screen.findByText("plural");
    fireEvent.click(pluralButton);
    symbolAtCaret = changeEncodingContents.value.payloads[1];
    expect(changeEncodingContents.value.caretPosition).toBe(1);
    expect(symbolAtCaret.label).toBe(paletteSecondCell.options.label);
    expect(symbolAtCaret.bciAvId).toContain(";");

    // Remove the indicator.  Caret position should not change, but the symbol's
    // bciAvId should revert back to the original.
    const removeIndicatorButton = await screen.findByText("remove indicator");
    fireEvent.click(removeIndicatorButton);
    symbolAtCaret = changeEncodingContents.value.payloads[1];
    expect(changeEncodingContents.value.caretPosition).toBe(1);
    expect(symbolAtCaret.label).toBe(paletteSecondCell.options.label);
    expect(symbolAtCaret.bciAvId).toStrictEqual([paletteSecondCell.options.bciAvId]);

    // Add a modifier to the symbol at the cursor.  Caret position should not
    // change, but symbol's bciAvId should now have the modifier.
    const oppositeButton = await screen.findByText("opposite of");
    fireEvent.click(oppositeButton);
    symbolAtCaret = changeEncodingContents.value.payloads[1];
    expect(changeEncodingContents.value.caretPosition).toBe(1);
    expect(symbolAtCaret.bciAvId).toContain(OPPOSITE_MODIFIER_ID);

    // Remove the modifier.  Caret position should not change, but the symbol's
    // bciAvId should revert back to the original.
    const removeModifierButton = await screen.findByText("remove a modifier");
    fireEvent.click(removeModifierButton);
    symbolAtCaret = changeEncodingContents.value.payloads[1];
    expect(changeEncodingContents.value.caretPosition).toBe(1);
    expect(symbolAtCaret.label).toBe(paletteSecondCell.options.label);
    expect(symbolAtCaret.bciAvId).toStrictEqual([paletteSecondCell.options.bciAvId]);

    // Delete the symbol at the caret.  The caret position should move left by
    // one, the number of symbols in the input area should now be 2, and the
    // one at the caret should be firstCell's symbol.
    const deleteButton = await screen.findByText("Delete");
    fireEvent.click(deleteButton);
    symbolAtCaret = changeEncodingContents.value.payloads[1];
    const paletteFirstCell = testPalette.cells["firstCell"];
    expect(changeEncodingContents.value.caretPosition).toBe(0);
    expect(changeEncodingContents.value.payloads.length).toBe(2);
    expect(symbolAtCaret.label).toBe(paletteFirstCell.options.label);
    expect(symbolAtCaret.bciAvId).toStrictEqual(paletteFirstCell.options.bciAvId);
  });
});
