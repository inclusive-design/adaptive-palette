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

import { vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { html } from "htm/preact";

import { adaptivePaletteGlobals, changeEncodingContents } from "../state/GlobalData";
import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { Palette } from "./Palette";
import { CurrentPalette } from "./CurrentPalette";
import { goBackImpl } from "../cells/CommandGoBackCell";
import * as IndicatorLabels from "../utils/IndicatorLabelsUtils";

// Mock the indicator label lookup so the "add/remove indicator" step of the label
// coordination test below can resolve a controlled label instead of depending on a
// network fetch or Ollama call. An un-configured `getStaticNewLabel()` call returns
// `undefined` and `getNewLabelViaModelQuery()` reports "not-viable"
vi.mock("../utils/IndicatorLabelsUtils", () => ({
  initIndicatorLabels: vi.fn().mockResolvedValue(undefined),
  getStaticNewLabel: vi.fn().mockReturnValue(undefined),
  getNewLabelViaModelQuery: vi.fn().mockReturnValue({ status: "not-viable" })
}));

const mockedGetStaticNewLabel = vi.mocked(IndicatorLabels.getStaticNewLabel);

describe("Palette integration test", () => {

  // The test palettes defines all cell types that need to coordinate with each other.
  const testPalette = {
    "name": "Test Palette",
    "cells": {
      "content-encoding-area": {
        "type": "ContentEncoding",
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
          "composition": 145,
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
          "composition": 1532,
          "rowStart": 2,
          "rowSpan": 1,
          "columnStart": 14,
          "columnSpan": 1
        }
      },
      "firstCell": {
        "type": "ActionCodeCell",
        "options": {
          "label": "First Cell",
          "composition": [
            652,
            "/",
            646
          ],
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
      "goToCell": {
        "type": "ActionBranchToPaletteCell",
        "options": {
          "label": "Go To",
          "branchTo": "People",
          "composition": 1177,
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
          "composition": [ 335, ";", 907 ],
          "rowStart": 2,
          "rowSpan": 1,
          "columnStart": 12,
          "columnSpan": 1,
          "ariaControls": "test-encoding-area"
        }
      },
      "command-cursor-backwards": {
        "type": "CommandCursorBackward",
        "options": {
          "label": "Backward",
          "composition": [ 145, ";", 907 ],
          "rowStart": 2,
          "rowSpan": 1,
          "columnStart": 11,
          "columnSpan": 1,
          "ariaControls": "content-encoding-area"
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
        "type": "ActionCodeCell",
        "options": {
          "label": "Woman",
          "composition": 710,
          "rowStart": 3,
          "rowSpan": 1,
          "columnStart": 6,
          "columnSpan": 4
        }
      },
      "person": {
        "type": "ActionCodeCell",
        "options": {
          "label": "Person",
          "composition":  513,
          "rowStart": 4,
          "rowSpan": 1,
          "columnStart": 6,
          "columnSpan": 4
        }
      },
      "man": {
        "type": "ActionCodeCell",
        "options": {
          "label": "Man",
          "composition":  433,
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
          "composition":  1248,
          "rowStart": 3,
          "rowSpan": 1,
          "columnStart": 1,
          "columnSpan": 1
        }
      }
    }
  };

  // Indicator "tool bar" palette
  const PLURAL_INDICATOR_ID = 99;    // ID for bciAvId 9011 (plural indicator)
  const ACTION_INDICATOR_ID = 81;    // ID for bciAvId 8993 (action indicator)
  const testIndicatorPalette = {
    "name": "indicator tool bar",
    "cells": {
      "SVG:9011:SVG-fb89740b-0a1a-4fcb-8275-bdaabe32a5dc": {
        "type": "ActionIndicatorCell",
        "options": {
          "label": "plural",
          "composition": PLURAL_INDICATOR_ID,
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
          "composition": ACTION_INDICATOR_ID,
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
          "composition": [ 2505, "//", 348, "/", 81,  "/", 86 ],
          "rowStart": 1,
          "rowSpan": 1,
          "columnStart": 12,
          "columnSpan": 1
        }
      }
    }
  };

  // Modifier "tool bar" palette
  const OPPOSITE_MODIFIER_ID = 486;   // ID for bciAvId 15927 (opposite)
  const INTENSITY_MODIFIER_ID = 401;  // ID for bciAvId 14947 (intensity)
  const testModifierPalette = {
    "name": "modifier tool bar",
    "cells": {
      "opposite-15927-9eb5b1c4-afca-455b-bfb5-d896e8afb3e9": {
        "type": "ActionPreModifierCell",
        "options": {
          "label": "opposite of",
          "composition": OPPOSITE_MODIFIER_ID,
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
          "composition": INTENSITY_MODIFIER_ID,
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
          "composition": [ 2505 ],
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

  test("Cell coordinations among action cells, input area, delete and clear buttons", async() => {
    // render() the palette and then wait until its first cell is available to
    // insure that the entire palette is in the DOM.
    render(html`<${Palette} json=${testPalette}/>`);
    const navStack = adaptivePaletteGlobals.navigationStack;
    navStack.currentPalette = testPalette;

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
    // The navigation cells set the current palette; `CurrentPalette` is what draws it.
    const navStack = adaptivePaletteGlobals.navigationStack;
    navStack.currentPalette = testPalette;
    render(html`<${CurrentPalette}/>`);
    const firstCell = await screen.findByText("First Cell");

    // Trigger forward navigation.
    // Note: the element whose text is "Go To" is actually a <div> within the
    // <button> of interest.  The button is that <div>'s parent.  Similarly
    // for the "Back Up" button.
    let goForwardButton = (await screen.findByText("Go To")).parentElement;
    if (!goForwardButton) {
      throw new Error("Go Forward button not found");
    }

    fireEvent.click(goForwardButton);
    const goBackButton = (await waitFor(() => screen.findByText("Back Up"))).parentElement;
    if (!goBackButton) {
      throw new Error("Go Back button not found after forward navigation");
    }
    expect(goBackButton).toBeInTheDocument();
    const currentPalette = navStack.currentPalette;
    if (!currentPalette) {
      throw new Error("Current palette on navStack is null after forward navigation");
    }
    expect(currentPalette).toBe(testLayerOnePalette);
    const peekedPalette = navStack.peek();
    if (!peekedPalette) {
      throw new Error("Peeked palette on navStack is null after forward navigation");
    }
    expect(peekedPalette).toBe(testPalette);

    // Trigger go-back navigation by clicking the `goBackButon`
    fireEvent.click(goBackButton);
    await waitFor(() => expect(firstCell).toBeInTheDocument());
    const currentPaletteAfterGoBack = navStack.currentPalette;
    if (!currentPaletteAfterGoBack) {
      throw new Error("Current palette on navStack is null after go-back navigation");
    }
    expect(currentPaletteAfterGoBack).toBe(testPalette);
    expect(navStack.isEmpty()).toBe(true);

    // Go forward again, then trigger go-back navigation by calling the go-back
    // function.  This is a way of testing that go-back functionality is
    // available to other kinds of events such as a key press.
    goForwardButton = (await screen.findByText("Go To")).parentElement;
    if (!goForwardButton) {
      throw new Error("Go Forward button not found on second forward navigation");
    }
    await waitFor(() => expect(goForwardButton).toBeInTheDocument());
    fireEvent.click(goForwardButton);
    await waitFor(() => screen.findByText("Back Up"));
    const currentPaletteAfterSecondGoForward = navStack.currentPalette;
    if (!currentPaletteAfterSecondGoForward) {
      throw new Error("Current palette on navStack is null after second forward navigation");
    }
    expect(currentPaletteAfterSecondGoForward).toBe(testLayerOnePalette);
    const peekedPaletteAfterSecondGoForward = navStack.peek();
    if (!peekedPaletteAfterSecondGoForward) {
      throw new Error("Peeked palette on navStack is null after second forward navigation");
    }
    expect(peekedPaletteAfterSecondGoForward).toBe(testPalette);
    await goBackImpl();
    await waitFor(() => expect(firstCell).toBeInTheDocument());
    const currentPaletteAfterSecondGoBack = navStack.currentPalette;
    if (!currentPaletteAfterSecondGoBack) {
      throw new Error("Current palette on navStack is null after go-back navigation");
    }
    expect(currentPaletteAfterSecondGoBack).toBe(testPalette);
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
    expect((firstSymbol.composition as (string|number)[]).includes(PLURAL_INDICATOR_ID)).toBe(false);
    expect((firstSymbol.composition as (string|number)[]).includes(ACTION_INDICATOR_ID)).toBe(false);

    // Click the `addPluralButton` and check that the plural indicator has been
    // added to the symbol in the content area.
    fireEvent.click(addPluralButton);
    firstSymbol = changeEncodingContents.value.payloads[0];
    expect((firstSymbol.composition as (string|number)[]).includes(PLURAL_INDICATOR_ID)).toBe(true);
    expect((firstSymbol.composition as (string|number)[]).includes(ACTION_INDICATOR_ID)).toBe(false);

    // Find and click the add-action-indicator button and check that the
    // plural indicator has been replaced with the action indicator.
    const addActionButton = await screen.findByText("action");
    fireEvent.click(addActionButton);
    firstSymbol = changeEncodingContents.value.payloads[0];
    expect((firstSymbol.composition as (string|number)[]).includes(PLURAL_INDICATOR_ID)).toBe(false);
    expect((firstSymbol.composition as (string|number)[]).includes(ACTION_INDICATOR_ID)).toBe(true);

    // Find and click the remove-indicator button and check that the
    // action indicator has been removed (and that there is no plural idnicator
    // either).
    const removeIndicatorButton = await screen.findByText("remove indicator");
    fireEvent.click(removeIndicatorButton);
    firstSymbol = changeEncodingContents.value.payloads[0];
    expect((firstSymbol.composition as (string|number)[]).includes(ACTION_INDICATOR_ID)).toBe(false);
    expect((firstSymbol.composition as (string|number)[]).includes(PLURAL_INDICATOR_ID)).toBe(false);
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
    const removeIndicatorButton = await screen.findByRole("button", { name: "remove indicator" });
    fireEvent.click(firstCell);
    fireEvent.click(addPluralButton);
    const firstSymbol = changeEncodingContents.value.payloads[0];
    expect((firstSymbol.composition as (string|number)[]).includes(PLURAL_INDICATOR_ID)).toBe(true);
    expect(removeIndicatorButton).toHaveAttribute("aria-disabled", "false");

    // Add a second symbol to the contents, one without an indicator.  The
    // remove-indicator button should change to disabled.
    fireEvent.click(firstCell);
    expect(removeIndicatorButton).toHaveAttribute("aria-disabled", "true");

    // Delete the last symbol.  The remaining symbol will still an indicator,
    // and the remove-indicator button should change to enabled.
    const deleteButton = await screen.findByText("Delete");
    fireEvent.click(deleteButton);
    expect(removeIndicatorButton).toHaveAttribute("aria-disabled", "false");
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
    const removeModifierButton = await screen.findByRole("button", { name: "remove a modifier" });
    expect(firstCell).toBeInTheDocument();
    expect(addIntensityButton).toBeInTheDocument();
    expect(addOppositeButton).toBeInTheDocument();
    expect(removeModifierButton).toBeInTheDocument();
    expect(removeModifierButton).toHaveAttribute("aria-disabled", "true");

    // Add "First Cell" to the `changeEncodingContents`.  There should be no
    // modifiers on it at this point.
    fireEvent.click(firstCell);
    let firstSymbol = changeEncodingContents.value.payloads[0];
    expect((firstSymbol.composition as (string|number)[]).includes(INTENSITY_MODIFIER_ID)).toBe(false);
    expect((firstSymbol.composition as (string|number)[]).includes(OPPOSITE_MODIFIER_ID)).toBe(false);
    expect(removeModifierButton).toHaveAttribute("aria-disabled", "true");

    // Add the intensity modifer.
    fireEvent.click(addIntensityButton);
    firstSymbol = changeEncodingContents.value.payloads[0];
    expect((firstSymbol.composition as (string|number)[]).includes(INTENSITY_MODIFIER_ID)).toBe(true);
    expect((firstSymbol.composition as (string|number)[]).includes(OPPOSITE_MODIFIER_ID)).toBe(false);
    expect(removeModifierButton).toHaveAttribute("aria-disabled", "false");

    // Remove the intensity modifer.
    fireEvent.click(removeModifierButton);
    firstSymbol = changeEncodingContents.value.payloads[0];
    expect((firstSymbol.composition as (string|number)[]).includes(INTENSITY_MODIFIER_ID)).toBe(false);
    expect((firstSymbol.composition as (string|number)[]).includes(OPPOSITE_MODIFIER_ID)).toBe(false);
    expect(removeModifierButton).toHaveAttribute("aria-disabled", "true");

    // Add the intensity, and then the oppposite modifiers.
    fireEvent.click(addIntensityButton);
    firstSymbol = changeEncodingContents.value.payloads[0];
    expect((firstSymbol.composition as (string|number)[]).includes(INTENSITY_MODIFIER_ID)).toBe(true);
    expect((firstSymbol.composition as (string|number)[]).includes(OPPOSITE_MODIFIER_ID)).toBe(false);
    expect(removeModifierButton).toHaveAttribute("aria-disabled", "false");
    fireEvent.click(addOppositeButton);
    firstSymbol = changeEncodingContents.value.payloads[0];
    expect((firstSymbol.composition as (string|number)[]).includes(INTENSITY_MODIFIER_ID)).toBe(true);
    expect((firstSymbol.composition as (string|number)[]).includes(OPPOSITE_MODIFIER_ID)).toBe(true);
    expect(removeModifierButton).toHaveAttribute("aria-disabled", "false");

    // Remove a modifier -- should be the last one added, the "opposite of"
    // modifier.
    fireEvent.click(removeModifierButton);
    firstSymbol = changeEncodingContents.value.payloads[0];
    expect((firstSymbol.composition as (string|number)[]).includes(INTENSITY_MODIFIER_ID)).toBe(true);
    expect((firstSymbol.composition as (string|number)[]).includes(OPPOSITE_MODIFIER_ID)).toBe(false);
    expect(removeModifierButton).toHaveAttribute("aria-disabled", "false");

    // Remove another modifier -- should be the "intensity" modifier.  Also,
    // there should be no more modifiers on the symbol and the remove button
    // should be disabled.
    fireEvent.click(removeModifierButton);
    firstSymbol = changeEncodingContents.value.payloads[0];
    expect((firstSymbol.composition as (string|number)[]).includes(INTENSITY_MODIFIER_ID)).toBe(false);
    expect((firstSymbol.composition as (string|number)[]).includes(OPPOSITE_MODIFIER_ID)).toBe(false);
    expect(removeModifierButton).toHaveAttribute("aria-disabled", "true");
  });

  test("Coordinating cursor movement and editing", async() => {
    // Setup: add the `testPalette`, the indicator and modifier strips
    // Find the "clear all" button and activate it to clear out any
    // contents in the content area.
    render(html`<${Palette} json=${testPalette}/>`);
    render(html`<${Palette} json=${testIndicatorPalette}/>`);
    render(html`<${Palette} json=${testModifierPalette}/>`);
    const clearButton = await screen.findByText("Clear");
    fireEvent.click(clearButton);
    let contentArea = await screen.findByLabelText("Input Area");
    expect(contentArea.childNodes.length).toBe(0);
    expect(changeEncodingContents.value.caretPosition).toBe(-1);

    // Add three symbols to the content area.  The cursor position should be
    // after the third symbol (= 2).
    const firstCell = await screen.findByText("First Cell");
    fireEvent.click(firstCell);
    const secondCell = await screen.findByText("Second Cell");
    fireEvent.click(secondCell);
    fireEvent.click(firstCell);
    const cursorForward = await screen.findByText("Forward");
    const cursorBackward = await screen.findByText("Backward");
    expect(contentArea.childNodes.length).toBe(3);
    expect(changeEncodingContents.value.caretPosition).toBe(2);

    // Cannot move cursor forward since at the end (right most). Caret position
    // should not change.
    fireEvent.click(cursorForward);
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
    expect(symbolAtCaret.composition).toStrictEqual(paletteSecondCell.options.composition);

    // Add an indicator to the symbol at the cursor.  Caret position should not
    // change, but symbol's bciAvId should now have a semi-colon.
    const pluralButton = await screen.findByText("plural");
    fireEvent.click(pluralButton);
    symbolAtCaret = changeEncodingContents.value.payloads[1];
    expect(changeEncodingContents.value.caretPosition).toBe(1);
    expect(symbolAtCaret.label).toBe(paletteSecondCell.options.label);
    expect(symbolAtCaret.composition).toContain(";");

    // Remove the indicator.  Caret position should not change, but the symbol's
    // bciAvId should revert back to the original.
    const removeIndicatorButton = await screen.findByText("remove indicator");
    fireEvent.click(removeIndicatorButton);
    symbolAtCaret = changeEncodingContents.value.payloads[1];
    expect(changeEncodingContents.value.caretPosition).toBe(1);
    expect(symbolAtCaret.label).toBe(paletteSecondCell.options.label);
    expect(symbolAtCaret.composition).toStrictEqual([paletteSecondCell.options.composition]);

    // Add a modifier to the symbol at the cursor.  Caret position should not
    // change, but symbol's bciAvId should now have the modifier.
    const oppositeButton = await screen.findByText("opposite of");
    fireEvent.click(oppositeButton);
    symbolAtCaret = changeEncodingContents.value.payloads[1];
    expect(changeEncodingContents.value.caretPosition).toBe(1);
    expect(symbolAtCaret.composition).toContain(OPPOSITE_MODIFIER_ID);

    // Remove the modifier.  Caret position should not change, but the symbol's
    // bciAvId should revert back to the original.
    const removeModifierButton = await screen.findByText("remove a modifier");
    fireEvent.click(removeModifierButton);
    symbolAtCaret = changeEncodingContents.value.payloads[1];
    expect(changeEncodingContents.value.caretPosition).toBe(1);
    expect(symbolAtCaret.label).toBe(paletteSecondCell.options.label);
    expect(symbolAtCaret.composition).toStrictEqual([paletteSecondCell.options.composition]);

    // Delete the symbol at the caret.  The caret position should move left by
    // one, the number of symbols in the input area should now be 2, and the
    // one at the caret should be firstCell's symbol.
    expect(contentArea.childElementCount).not.toBe(0);
    const deleteButton = await screen.findByText("Delete");
    fireEvent.click(deleteButton);
    symbolAtCaret = changeEncodingContents.value.payloads[1];
    const paletteFirstCell = testPalette.cells["firstCell"];
    expect(changeEncodingContents.value.caretPosition).toBe(0);
    expect(changeEncodingContents.value.payloads.length).toBe(2);
    expect(symbolAtCaret.label).toBe(paletteFirstCell.options.label);
    expect(symbolAtCaret.composition).toStrictEqual(paletteFirstCell.options.composition);

    // Move the caret to -1.  Since there are symbols in the display, this
    // should change the display to show an insert before the first symbol.
    changeEncodingContents.value = {
      caretPosition: -1,
      payloads: changeEncodingContents.value.payloads
    };
    contentArea = await screen.findByLabelText("Input Area");
    expect(changeEncodingContents.value.payloads.length).not.toBe(0);
    expect(changeEncodingContents.value.caretPosition).toBe(-1);
    expect(contentArea.childElementCount).not.toBe(0);
    expect(contentArea.children[0].className.includes("insertionCaret")).toBe(true);
  });

  test("label stays correct through add modifier -> add indicator -> add modifier -> remove modifier -> remove indicator -> add modifier", async() => {
    // Setup: add the `testPalette`, the indicator strip, and the modifier strip.
    // Clear out any contents in the content area first.
    render(html`<${Palette} json=${testPalette}/>`);
    render(html`<${Palette} json=${testIndicatorPalette}/>`);
    render(html`<${Palette} json=${testModifierPalette}/>`);
    const clearButton = await screen.findByText("Clear");
    fireEvent.click(clearButton);
    const contentArea = await screen.findByLabelText("Input Area");
    expect(contentArea.childNodes.length).toBe(0);

    const secondCell = await screen.findByText("Second Cell");
    const addOppositeButton = await screen.findByText("opposite of");
    const addIntensityButton = await screen.findByText("intensity");
    const addPluralButton = await screen.findByText("plural");
    const removeModifierButton = await screen.findByText("remove a modifier");
    const removeIndicatorButton = await screen.findByText("remove indicator");

    // Add "Second Cell" -- its composition (823) is a number, so it gets a
    // `userSelectedSymbolId`, which is what makes the label-resolving indicator
    // path (mocked below) engage its modifier re-wrapping logic.
    fireEvent.click(secondCell);
    let symbol = changeEncodingContents.value.payloads[0];
    expect(symbol.label).toBe("Second Cell");

    // Add a modifier ("opposite of", prepended).
    fireEvent.click(addOppositeButton);
    symbol = changeEncodingContents.value.payloads[0];
    expect(symbol.label).toBe("opposite of Second Cell");

    // Add an indicator ("plural"). The resolved label is mocked; since the symbol
    // has a `userSelectedSymbolId`, the resolved label gets re-wrapped in the
    // modifiers tracked so far ("opposite of").
    mockedGetStaticNewLabel.mockReturnValueOnce("cells");
    fireEvent.click(addPluralButton);
    await waitFor(() => {
      symbol = changeEncodingContents.value.payloads[0];
      expect(symbol.label).toBe("opposite of cells");
    });
    expect(symbol.baseLabel).toBe("opposite of Second Cell");
    expect(symbol.baseModifierCount).toBe(1);

    // Add another modifier ("intensity", appended) on top of the indicator's result.
    fireEvent.click(addIntensityButton);
    symbol = changeEncodingContents.value.payloads[0];
    expect(symbol.label).toBe("opposite of cells intensity");

    // Remove that modifier again -- back to the indicator's resolved label.
    fireEvent.click(removeModifierButton);
    symbol = changeEncodingContents.value.payloads[0];
    expect(symbol.label).toBe("opposite of cells");

    // Remove the indicator -- the label restores to the pre-indicator, modifier-wrapped
    // label ("opposite of Second Cell"), and baseLabel/baseModifierCount/indicatorId clear.
    fireEvent.click(removeIndicatorButton);
    symbol = changeEncodingContents.value.payloads[0];
    expect(symbol.label).toBe("opposite of Second Cell");
    expect(symbol.baseLabel).toBeUndefined();
    expect(symbol.baseModifierCount).toBeUndefined();
    expect(symbol.indicatorId).toBeUndefined();

    // Add one more modifier after the indicator is gone.
    fireEvent.click(addIntensityButton);
    symbol = changeEncodingContents.value.payloads[0];
    expect(symbol.label).toBe("opposite of Second Cell intensity");
  });
});
