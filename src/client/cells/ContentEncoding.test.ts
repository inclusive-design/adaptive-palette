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

import { screen } from "@testing-library/preact";
import { ContentEncoding, clamp } from "./ContentEncoding";
import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { renderCell } from "../testUtils/CellTestUtils";
import { adaptivePaletteGlobals, changeEncodingContents } from "../state/GlobalData";
import { AI_BADGE_TEXT } from "../components/AiBadge";

test("The content encoding area is rendered correctly", async (): Promise<void> => {
  await initAdaptivePaletteGlobals();

  const cellId = "uuid-of-content-encoding-area";
  const cellOptions = {
    columnStart: 1,
    columnSpan: 5,
    rowStart: 2,
    rowSpan: 3
  };

  renderCell(ContentEncoding, cellId, cellOptions);

  // Test the content area is rendered properly
  const encodingAreaByLabel = await screen.findByLabelText("Input Area");
  expect(encodingAreaByLabel.id).toBe(cellId);
  expect(encodingAreaByLabel.style.getPropertyValue("grid-column")).toBe("1 / span 5");
  expect(encodingAreaByLabel.style.getPropertyValue("grid-row")).toBe("2 / span 3");

  // The aria role is defined
  const encodingAreaByRole = await screen.findByRole("textbox");
  expect(encodingAreaByRole.getAttribute("aria-readonly")).toBe("true");
  expect(encodingAreaByRole).toBeVisible();
  expect(encodingAreaByRole).toBeValid();

  // Nothing is rendered in the content area
  expect(encodingAreaByLabel.childNodes.length).toBe(0);
});

describe("clamp()", (): void => {

  test("returns min when the value is below it", (): void => {
    expect(clamp(-1, 0, 1)).toBe(0);
  });

  test("returns max when the value is above it", (): void => {
    expect(clamp(2, 0, 1)).toBe(1);
  });

  test("returns the value unchanged when it is in range", (): void => {
    expect(clamp(1, 0, 2)).toBe(1);
  });
});

describe("marking a label the model produced", (): void => {

  const cellId = "uuid-of-content-encoding-area";
  const cellOptions = {
    columnStart: 1,
    columnSpan: 5,
    rowStart: 2,
    rowSpan: 3
  };
  const markedSymbol = {
    label: "walked",
    composition: [ 382, ";", 97 ],
    indicatorId: 97,
    userSelectedSymbolId: 382,
    isAiLabel: true
  };

  let initialMarkAiSuggestions: boolean;
  const initialContents = changeEncodingContents.value;

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
    initialMarkAiSuggestions = adaptivePaletteGlobals.config.markAiSuggestions;
  });

  beforeEach((): void => {
    adaptivePaletteGlobals.config.markAiSuggestions = true;
  });

  afterEach((): void => {
    adaptivePaletteGlobals.config.markAiSuggestions = initialMarkAiSuggestions;
    changeEncodingContents.value = initialContents;
  });

  test("a marked label gets the badge and the italic class", async (): Promise<void> => {
    changeEncodingContents.value = { payloads: [markedSymbol], caretPosition: 0 };

    renderCell(ContentEncoding, cellId, cellOptions);
    const inputArea = await screen.findByLabelText("Input Area");

    expect(inputArea.querySelector(".aiBadge")?.textContent).toBe(AI_BADGE_TEXT);
    // The badge comes first, and the label itself is unchanged.
    expect(inputArea.querySelector(".aiLabel")?.textContent).toBe(`${AI_BADGE_TEXT}walked`);
  });

  // Each caret branch renders its own `BlissSymbol`; a caret of -1 covers the two the test
  // above does not: the insertion branch for index 0, and the plain branch for index 1.
  test("every caret branch marks its label", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [markedSymbol, markedSymbol],
      caretPosition: -1
    };

    renderCell(ContentEncoding, cellId, cellOptions);
    const inputArea = await screen.findByLabelText("Input Area");

    expect(inputArea.querySelectorAll(".insertionCaret .aiBadge")).toHaveLength(1);
    expect(inputArea.querySelectorAll(".aiBadge")).toHaveLength(2);
    expect(inputArea.querySelectorAll(".aiLabel")).toHaveLength(2);
  });

  test("an unmarked label gets neither", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [{ label: "walk", composition: 382, userSelectedSymbolId: 382 }],
      caretPosition: 0
    };

    renderCell(ContentEncoding, cellId, cellOptions);
    const inputArea = await screen.findByLabelText("Input Area");

    expect(inputArea.querySelectorAll(".aiBadge")).toHaveLength(0);
    expect(inputArea.querySelectorAll(".aiLabel")).toHaveLength(0);
  });

  test("nothing is marked when the setting is off", async (): Promise<void> => {
    adaptivePaletteGlobals.config.markAiSuggestions = false;
    changeEncodingContents.value = { payloads: [markedSymbol], caretPosition: 0 };

    renderCell(ContentEncoding, cellId, cellOptions);
    const inputArea = await screen.findByLabelText("Input Area");

    expect(inputArea.querySelectorAll(".aiBadge")).toHaveLength(0);
    expect(inputArea.querySelectorAll(".aiLabel")).toHaveLength(0);
  });
});
