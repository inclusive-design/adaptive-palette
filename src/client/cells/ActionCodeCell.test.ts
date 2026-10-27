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
import { screen, fireEvent, waitFor } from "@testing-library/preact";

import { adaptivePaletteGlobals, changeEncodingContents } from "../state/GlobalData";
import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { setEditGuard } from "../core/MessageEdit";
import {
  confirmDiscardEdit, guardEdit, sentenceCompletionsSignal, sentencePaletteSignal
} from "../features/telegraphic-translation/TelegraphicTranslationState";
import { ActionCodeCell } from "./ActionCodeCell";
import { renderCell, expectCellRendered, testPicture } from "../testUtils/CellTestUtils";
import { mockedAnnounceIfEnabled } from "../testUtils/SpeechUtilsMock";

vi.mock("../utils/SpeechUtils");

describe("ActionCodeCell", (): void => {

  const TEST_CELL_ID = "uuid-of-some-kind";
  const testCell = {
    options: {
      "label": "Bliss Language",
      "rowStart": 3,
      "rowSpan": 2,
      "columnStart": 2,
      "columnSpan": 1,
      "composition": [ 106, "/", 12 ]   // VERB+EN (IDs for bciAvIds 12335, 8499)
    }
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  afterEach((): void => {
    setEditGuard(null);
  });

  test("renders at its grid position", async (): Promise<void> => {

    renderCell(ActionCodeCell, TEST_CELL_ID, testCell.options);

    const button = await expectCellRendered(TEST_CELL_ID, testCell.options, "ActionCodeCell");

    // Check disabled state (should be enabled)
    expect(button.getAttribute("disabled")).toBe(null);

    // Check that SVG is rendered (composition field must be set; bciAvId would leave it undefined)
    const svgElement = button.querySelector("svg");
    expect(svgElement).not.toBe(null);
  });

  test("a numeric composition sets userSelectedSymbolId on click", async (): Promise<void> => {
    const numericTestCell = {
      options: {
        "label": "percent",
        "composition": 2,
        "rowStart": 1, "rowSpan": 1, "columnStart": 1, "columnSpan": 1
      }
    };
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };

    renderCell(ActionCodeCell, "numeric-cell-uuid", numericTestCell.options);
    const button = await screen.findByRole("button", {name: numericTestCell.options.label});
    fireEvent.click(button);

    expect(changeEncodingContents.value.payloads[0].userSelectedSymbolId).toBe(2);
  });

  test("an array composition leaves userSelectedSymbolId undefined on click", async (): Promise<void> => {
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };

    renderCell(ActionCodeCell, "array-cell-uuid", testCell.options);
    const button = await screen.findByRole("button", {name: testCell.options.label});
    fireEvent.click(button);

    expect(changeEncodingContents.value.payloads[0].userSelectedSymbolId).toBeUndefined();
  });

  test("a single-number array composition sets userSelectedSymbolId on click", async (): Promise<void> => {
    const singleElementArrayTestCell = {
      options: {
        "label": "percent",
        "composition": [ 2 ],
        "rowStart": 1, "rowSpan": 1, "columnStart": 1, "columnSpan": 1
      }
    };
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };

    renderCell(ActionCodeCell, "single-element-array-cell-uuid", singleElementArrayTestCell.options);
    const button = await screen.findByRole("button", {name: singleElementArrayTestCell.options.label});
    fireEvent.click(button);

    expect(changeEncodingContents.value.payloads[0].userSelectedSymbolId).toBe(2);
  });

  test("a picture cell draws its picture, and a click inserts a picture word", async (): Promise<void> => {
    const pictureCell = {
      "label": "bread",
      "picture": testPicture(),
      "rowStart": 1, "rowSpan": 1, "columnStart": 1, "columnSpan": 1
    };
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };

    renderCell(ActionCodeCell, "picture-cell-uuid", pictureCell);
    const button = await expectCellRendered("picture-cell-uuid", pictureCell, "ActionCodeCell");
    expect(button.querySelector("img")?.getAttribute("src")).toBe(testPicture());
    expect(button.querySelector("svg")).toBe(null);
    fireEvent.click(button);

    expect(changeEncodingContents.value.payloads).toEqual([
      { label: "bread", picture: testPicture(), modifierInfo: [] }
    ]);
    expect(mockedAnnounceIfEnabled).toHaveBeenCalledWith("bread", undefined);
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  test("backgroundColor and textColor colour the button, and the symbol's strokes and letters", async (): Promise<void> => {
    renderCell(ActionCodeCell, TEST_CELL_ID, {
      ...testCell.options, composition: [513, "//", "XA"], backgroundColor: "#E86E9BFF", textColor: "white"
    });

    const button = await screen.findByRole("button", { name: testCell.options.label });
    expect(getComputedStyle(button).backgroundColor).toBe("rgb(232, 110, 155)");
    expect(getComputedStyle(button).color).toBe("rgb(255, 255, 255)");
    // The builder draws a letter as a filled path with no stroke.
    expect(getComputedStyle(button.querySelector(".bliss-content") as Element).stroke).toBe("rgb(255, 255, 255)");
    expect(getComputedStyle(button.querySelector("path[stroke='none']") as Element).fill).toBe("rgb(255, 255, 255)");
  });

  test("with branchTo, a click inserts the symbol and then shows that palette", async (): Promise<void> => {
    const { paletteStore, navigationStack } = adaptivePaletteGlobals;
    const rootPalette = { name: "Root Palette", cells: {} };
    paletteStore.addPalette(rootPalette);
    paletteStore.addPalette({ name: "Target Palette", cells: {} });
    navigationStack.flushReset(rootPalette);
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };

    renderCell(ActionCodeCell, TEST_CELL_ID, { ...testCell.options, branchTo: "Target Palette" });
    fireEvent.click(await screen.findByRole("button", { name: testCell.options.label }));

    expect(changeEncodingContents.value.payloads.map(payload => payload.label)).toEqual(["Bliss Language"]);
    await waitFor(() => {
      expect(navigationStack.currentPalette?.name).toBe("Target Palette");
    });
    expect(navigationStack.depth).toBe(1);
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  test("with branchTo, stays on this palette when the edit is held", async (): Promise<void> => {
    const { paletteStore, navigationStack } = adaptivePaletteGlobals;
    const rootPalette = { name: "Root Palette", cells: {} };
    paletteStore.addPalette(rootPalette);
    paletteStore.addPalette({ name: "Target Palette", cells: {} });
    navigationStack.flushReset(rootPalette);
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
    setEditGuard(() => true);

    renderCell(ActionCodeCell, TEST_CELL_ID, { ...testCell.options, branchTo: "Target Palette" });
    fireEvent.click(await screen.findByRole("button", { name: testCell.options.label }));

    expect(changeEncodingContents.value.payloads).toEqual([]);
    expect(navigationStack.currentPalette?.name).toBe("Root Palette");
  });

  test("with branchTo, a held edit shows that palette once the user lets it through", async (): Promise<void> => {
    const { paletteStore, navigationStack } = adaptivePaletteGlobals;
    const rootPalette = { name: "Root Palette", cells: {} };
    paletteStore.addPalette(rootPalette);
    paletteStore.addPalette({ name: "Target Palette", cells: {} });
    navigationStack.flushReset(rootPalette);
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
    // Sentences on screen, so the guard holds the insert and asks first.
    sentenceCompletionsSignal.value = {
      status: "ready", sentences: ["I want food."], recalledSentence: null, model: "phony-model:12b", telegraphicMessage: ""
    };
    sentencePaletteSignal.value = "Root Palette";
    setEditGuard(guardEdit);

    renderCell(ActionCodeCell, TEST_CELL_ID, { ...testCell.options, branchTo: "Target Palette" });
    fireEvent.click(await screen.findByRole("button", { name: testCell.options.label }));
    expect(navigationStack.currentPalette?.name).toBe("Root Palette");

    confirmDiscardEdit();
    expect(changeEncodingContents.value.payloads.map(payload => payload.label)).toEqual(["Bliss Language"]);
    await waitFor(() => {
      expect(navigationStack.currentPalette?.name).toBe("Target Palette");
    });
    sentencePaletteSignal.value = null;
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  test("looks like a folder only with branchTo", async (): Promise<void> => {
    renderCell(ActionCodeCell, "plain-cell", testCell.options);
    renderCell(ActionCodeCell, "folder-cell", { ...testCell.options, branchTo: "Target Palette" });

    const [plain, folder] = await screen.findAllByRole("button", { name: testCell.options.label });
    expect(plain).not.toHaveClass("foldedCorner");
    expect(folder).toHaveClass("foldedCorner");
  });

});
