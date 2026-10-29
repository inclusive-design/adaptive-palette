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


import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { html } from "htm/preact";
import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { renderCell, expectCellRendered, testPicture } from "../testUtils/CellTestUtils";
import { adaptivePaletteGlobals, changeEncodingContents, wordBuildSignal } from "../state/GlobalData";
import { ActionBranchToPaletteCell } from "./ActionBranchToPaletteCell";
import { goBackImpl } from "./CommandGoBackCell";
import { goToRootImpl } from "./CommandGoToRootCell";

describe("ActionBranchToPaletteCell", (): void => {

  const TEST_CELL_ID = "uuid-of-some-kind";
  const goToPaletteCell = {
    options: {
      "label": "Animals",
      "branchTo": "Animals",
      "rowStart": 100,
      "rowSpan": 12,
      "columnStart": 33,
      "columnSpan": 11,
      "composition": [ 513, "/", 99 ]   // IDsfor bciAvIds 16161, 9011
    }
  };

  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  });

  test("renders at its grid position", async (): Promise<void> => {

    renderCell(ActionBranchToPaletteCell, TEST_CELL_ID, goToPaletteCell.options);

    const button = await expectCellRendered(
      TEST_CELL_ID, goToPaletteCell.options, "actionBranchToPaletteCell foldedCorner"
    );

    // Check disabled state (should be enabled)
    expect(button.getAttribute("disabled")).toBe(null);
  });

  test("a picture cell draws its picture in place of a symbol", async (): Promise<void> => {
    const options = {
      "label": "Food",
      "branchTo": "Food",
      "picture": testPicture(),
      "rowStart": 1, "rowSpan": 1, "columnStart": 1, "columnSpan": 1
    };

    renderCell(ActionBranchToPaletteCell, TEST_CELL_ID, options);

    const button = await expectCellRendered(TEST_CELL_ID, options, "actionBranchToPaletteCell foldedCorner");
    expect(button.querySelector("img")?.getAttribute("src")).toBe(testPicture());
    expect(button.querySelector("svg")).toBe(null);
    expect(button).toHaveAttribute("data-branchto", "Food");
  });

  test("backgroundColor colours the button", async (): Promise<void> => {
    renderCell(ActionBranchToPaletteCell, TEST_CELL_ID, { ...goToPaletteCell.options, backgroundColor: "#E86E9BFF" });

    const button = await screen.findByRole("button", { name: goToPaletteCell.options.label });
    expect(getComputedStyle(button).backgroundColor).toBe("rgb(232, 110, 155)");
  });

  test("with needsCaretSymbol, drops its own colours while unavailable", async (): Promise<void> => {
    const options = { ...goToPaletteCell.options, needsCaretSymbol: true, backgroundColor: "#E86E9BFF" };
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };

    renderCell(ActionBranchToPaletteCell, TEST_CELL_ID, options);
    const button = await screen.findByRole("button", { name: goToPaletteCell.options.label });
    expect(button.style.backgroundColor).toBe("");

    changeEncodingContents.value = { payloads: [{ label: "opposite", composition: 486 }], caretPosition: 0 };
    await waitFor(() => expect(button.style.backgroundColor).toBe("rgb(232, 110, 155)"));
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  test("with needsCaretSymbol, is a command that is unavailable without a symbol at the caret", async (): Promise<void> => {
    const options = { ...goToPaletteCell.options, needsCaretSymbol: true };
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };

    renderCell(ActionBranchToPaletteCell, TEST_CELL_ID, options);
    const button = await expectCellRendered(
      TEST_CELL_ID, options, "actionBranchToPaletteCell foldedCorner btn-command"
    );
    expect(button).toHaveAttribute("aria-disabled", "true");

    changeEncodingContents.value = { payloads: [{ label: "opposite", composition: 486 }], caretPosition: 0 };
    await waitFor(() => expect(button).toHaveAttribute("aria-disabled", "false"));
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  test("with needsCaretSymbol, is unavailable with a picture at the caret", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [{ label: "bread", picture: "/pictures/bread.jpg", modifierInfo: [] }],
      caretPosition: 0
    };
    const options = { ...goToPaletteCell.options, needsCaretSymbol: true };

    renderCell(ActionBranchToPaletteCell, TEST_CELL_ID, options);

    const button = await screen.findByRole("button", { name: options.label });
    expect(button).toHaveAttribute("aria-disabled", "true");
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  test("flagged unavailableWhileBuildingWord is unavailable while a word is being built", async (): Promise<void> => {
    changeEncodingContents.value = { payloads: [{ label: "cat", composition: 126 }], caretPosition: 0 };
    wordBuildSignal.value = { message: { payloads: [], caretPosition: -1 }, combine: false };
    renderCell(ActionBranchToPaletteCell, "command-indicators", {
      label: "add indicator", composition: 81, branchTo: "indicators", needsCaretSymbol: true,
      unavailableWhileBuildingWord: true, rowStart: 1, rowSpan: 1, columnStart: 1, columnSpan: 1
    });

    expect(await screen.findByRole("button", { name: "add indicator" })).toHaveAttribute("aria-disabled", "true");

    wordBuildSignal.value = null;
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  // Regression coverage for the bug where navigateToPalette() read the go-back palette off
  // the button's own parent container instead of the navigation stack. That is correct for
  // every branch cell in the main display area -- its parent IS the displayed palette -- but
  // wrong for a cell mounted elsewhere, like the command bar's "Msg Style" button, whose
  // parent container is permanently "Command Bar".
  describe("navigating from a cell mounted outside the current palette (e.g. the command bar)", (): void => {

    const rootPalette = { name: "Root Palette", cells: {} };
    const targetPalette = { name: "Target Palette", cells: {} };

    const branchCellOptions = {
      "label": "Target",
      "branchTo": "Target Palette",
      "rowStart": 1,
      "rowSpan": 1,
      "columnStart": 1,
      "columnSpan": 1,
      "composition": 553
    };

    beforeEach((): void => {
      const { paletteStore, navigationStack } = adaptivePaletteGlobals;
      paletteStore.addPalette(rootPalette);
      paletteStore.addPalette(targetPalette);
      // Seeds the stack the way startup does: root displayed, nothing behind it.
      navigationStack.flushReset(rootPalette);
    });

    test("Back returns to the palette that was displayed, not the button's own container", async (): Promise<void> => {
      // The button's parent carries a *different* data-palettename than the currently
      // displayed palette, exactly like the command bar's container does.
      render(html`
        <div data-palettename="Command Bar">
          <${ActionBranchToPaletteCell} id="${TEST_CELL_ID}" options=${branchCellOptions} />
        </div>
      `);

      const button = await screen.findByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(adaptivePaletteGlobals.navigationStack.currentPalette?.name).toBe("Target Palette");
      });
      expect(adaptivePaletteGlobals.navigationStack.depth).toBe(1);

      goBackImpl();

      expect(adaptivePaletteGlobals.navigationStack.currentPalette?.name).toBe("Root Palette");
      expect(adaptivePaletteGlobals.navigationStack.depth).toBe(0);
    });

    test("tapping again once the target is showing does not push it onto itself", async (): Promise<void> => {
      render(html`
        <div data-palettename="Command Bar">
          <${ActionBranchToPaletteCell} id="${TEST_CELL_ID}" options=${branchCellOptions} />
        </div>
      `);

      const button = await screen.findByRole("button");
      fireEvent.click(button);
      await waitFor(() => {
        expect(adaptivePaletteGlobals.navigationStack.currentPalette?.name).toBe("Target Palette");
      });

      // A command-bar cell stays tappable once its palette is current.  A second tap must not
      // deepen the stack, or the first `Back` press would appear to do nothing.
      fireEvent.click(button);
      await waitFor(() => {
        expect(adaptivePaletteGlobals.navigationStack.depth).toBe(1);
      });

      goBackImpl();

      expect(adaptivePaletteGlobals.navigationStack.currentPalette?.name).toBe("Root Palette");
      expect(adaptivePaletteGlobals.navigationStack.depth).toBe(0);
    });

    test("Home reaches the real root, not the button's own container", async (): Promise<void> => {
      render(html`
        <div data-palettename="Command Bar">
          <${ActionBranchToPaletteCell} id="${TEST_CELL_ID}" options=${branchCellOptions} />
        </div>
      `);

      const button = await screen.findByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(adaptivePaletteGlobals.navigationStack.currentPalette?.name).toBe("Target Palette");
      });

      goToRootImpl();

      expect(adaptivePaletteGlobals.navigationStack.currentPalette?.name).toBe("Root Palette");
      expect(adaptivePaletteGlobals.navigationStack.depth).toBe(0);
    });
  });
});
