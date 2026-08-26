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
import { renderCell, expectCellRendered } from "../testUtils/CellTestUtils";
import { adaptivePaletteGlobals } from "../state/GlobalData";
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

      await goBackImpl();

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

      await goBackImpl();

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
