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
import { render, screen } from "@testing-library/preact";
import { fireEvent } from "@testing-library/dom";
import { html } from "htm/preact";

import { adaptivePaletteGlobals } from "../state/GlobalData";
import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { expectCellRendered } from "../testUtils/CellTestUtils";
import { CommandGoToRootCell } from "./CommandGoToRootCell";
import { mockedSpeakUnavailable } from "../testUtils/SpeechUtilsMock";

vi.mock("../utils/SpeechUtils");

describe("CommandGoToRootCell", (): void => {

  const TEST_CELL_ID = "uuid-home-cell";
  const homeCell = {
    options: {
      "label": "Home",
      "rowStart": 1,
      "rowSpan": 1,
      "columnStart": 2,
      "columnSpan": 1,
      "composition": 392
    }
  };

  const rootPalette = {
    "name": "rootPalette",
    "cells": {
      "rootCell": {
        "type": "ActionBranchToPaletteCell",
        "options": {
          "label": "Family",
          "composition": 730,
          "branchTo": "My Family Palette",
          "rowStart": 1,
          "rowSpan": 1,
          "columnStart": 1,
          "columnSpan": 1
        }
      }
    }
  };

  const secondPalette = {
    "name": "secondPalette",
    "cells": {
      "secondCell": {
        "type": "ActionBranchToPaletteCell",
        "options": {
          "label": "People",
          "composition": 1758,
          "branchTo": "People",
          "rowStart": 1,
          "rowSpan": 1,
          "columnStart": 1,
          "columnSpan": 1
        }
      }
    }
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  beforeEach((): void => {
    adaptivePaletteGlobals.navigationStack.flushReset(null);
  });

  test("Home is unavailable when the stack is empty", async (): Promise<void> => {
    render(html`
      <${CommandGoToRootCell} id="${TEST_CELL_ID}" options=${homeCell.options} />
    `);

    const button = await expectCellRendered(TEST_CELL_ID, homeCell.options, "btn-command");
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  test("Home becomes available once a palette is pushed", async (): Promise<void> => {
    adaptivePaletteGlobals.navigationStack.push(rootPalette);

    render(html`
      <${CommandGoToRootCell} id="${TEST_CELL_ID}" options=${homeCell.options} />
    `);

    const button = await screen.findByRole("button", { name: homeCell.options.label });
    expect(button).toHaveAttribute("aria-disabled", "false");
  });

  test("clicking Home makes the root palette current and empties the stack", async (): Promise<void> => {
    // Two levels deep: the root was pushed first, then the second palette.
    adaptivePaletteGlobals.navigationStack.push(rootPalette);
    adaptivePaletteGlobals.navigationStack.push(secondPalette);
    expect(adaptivePaletteGlobals.navigationStack.depth).toBe(2);

    render(html`
      <${CommandGoToRootCell} id="${TEST_CELL_ID}" options=${homeCell.options} />
    `);

    const button = await screen.findByRole("button", { name: homeCell.options.label });
    fireEvent.click(button);

    expect(adaptivePaletteGlobals.navigationStack.depth).toBe(0);
    expect(adaptivePaletteGlobals.navigationStack.currentPalette?.name).toBe("rootPalette");
  });

  test("clicking Home while unavailable leaves the stack alone and is announced", async (): Promise<void> => {
    render(html`
      <${CommandGoToRootCell} id="${TEST_CELL_ID}" options=${homeCell.options} />
    `);

    const button = await screen.findByRole("button", { name: homeCell.options.label });
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);

    expect(adaptivePaletteGlobals.navigationStack.depth).toBe(0);
    expect(adaptivePaletteGlobals.navigationStack.currentPalette).toBeNull();
    // The button keeps `aria-disabled` rather than `disabled`, so it can be focused and
    // activated. Speech is the main feedback channel and must not go silent.
    expect(mockedSpeakUnavailable).toHaveBeenCalledWith(homeCell.options.label);
  });
});
