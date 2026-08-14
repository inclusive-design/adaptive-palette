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
import { screen, fireEvent } from "@testing-library/preact";

import { adaptivePaletteGlobals } from "../state/GlobalData";
import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { renderCell, expectCellRendered } from "../testUtils/CellTestUtils";
import { CommandGoBackCell } from "./CommandGoBackCell";
import { mockedSpeakUnavailable } from "../testUtils/SpeechUtilsMock";

vi.mock("../utils/SpeechUtils");

describe("CommandGoBackCell", (): void => {

  const TEST_CELL1_ID = "uuid-of-some-kind";
  const TEST_CELL2_ID = "uuid-of-another-kind";
  const TEST_CONTROL_ID = "non-empty-id";
  const goBackCellNoAriaControls = {
    options: {
      "label": "Back Up",
      "rowStart": 3,
      "rowSpan": 2,
      "columnStart": 2,
      "columnSpan": 1,
      "composition": 1248
    }
  };
  const goBackCellAriaControls = {
    options: {
      "label": "Back Up non-empty aria-controls",
      "rowStart": 3,
      "rowSpan": 2,
      "columnStart": 2,
      "columnSpan": 1,
      "composition": 1248
    }
  };
  const goBackCellOnStack = {
    options: {
      "label": "Back Up with a stack",
      "rowStart": 3,
      "rowSpan": 2,
      "columnStart": 2,
      "columnSpan": 1,
      "composition": 1248
    }
  };

  beforeAll(async () => {
    // Note: no id provided for the element that palettes are rendered inside.
    // The `aria-controls` attribute of the test CommandGoBackCell should be
    // the empty string, at first.
    await initAdaptivePaletteGlobals();
  });

  test("renders with an empty aria-controls when no container id is set", async (): Promise<void> => {

    renderCell(CommandGoBackCell, TEST_CELL1_ID, goBackCellNoAriaControls.options);

    const button = await expectCellRendered(
      TEST_CELL1_ID, goBackCellNoAriaControls.options, "btn-command"
    );
    expect(button.getAttribute("aria-controls")).toBe("");

    // The navigation stack is empty at this point, so Back has nowhere to go.
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  test("points aria-controls at the main palette container", async(): Promise<void> => {
    // Give the main palette rendering area a non-empty id.
    adaptivePaletteGlobals.mainPaletteContainerId = TEST_CONTROL_ID;
    renderCell(CommandGoBackCell, TEST_CELL2_ID, goBackCellAriaControls.options);

    const button = await screen.findByRole("button", {name: goBackCellAriaControls.options.label});
    expect(button.id).toBe(TEST_CELL2_ID);
    expect(button.getAttribute("aria-controls")).toBe(TEST_CONTROL_ID);
  });

  test("is available once a palette is on the stack", async (): Promise<void> => {
    const somePalette = { "name": "somePalette", "cells": {} };
    adaptivePaletteGlobals.navigationStack.push(somePalette);
    expect(adaptivePaletteGlobals.navigationStack.depth).toBe(1);

    renderCell(CommandGoBackCell, "uuid-of-a-third-kind", goBackCellOnStack.options);

    const button = await screen.findByRole("button", { name: goBackCellOnStack.options.label });
    expect(button).toHaveAttribute("aria-disabled", "false");

    adaptivePaletteGlobals.navigationStack.flushReset(null);
  });

  test("clicking Back while unavailable leaves the stack alone and is announced", async (): Promise<void> => {
    adaptivePaletteGlobals.navigationStack.flushReset(null);

    renderCell(CommandGoBackCell, TEST_CELL1_ID, goBackCellNoAriaControls.options);

    const button = await screen.findByRole(
      "button", { name: goBackCellNoAriaControls.options.label }
    );
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);

    expect(adaptivePaletteGlobals.navigationStack.depth).toBe(0);
    expect(adaptivePaletteGlobals.navigationStack.currentPalette).toBeNull();
    // The button keeps `aria-disabled` rather than `disabled`, so it can be focused and
    // activated. Speech is the main feedback channel and must not go silent.
    expect(mockedSpeakUnavailable).toHaveBeenCalledWith(goBackCellNoAriaControls.options.label);
  });
});
