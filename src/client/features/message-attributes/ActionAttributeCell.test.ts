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

import { screen, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { initAdaptivePaletteGlobals } from "../../core/InitGlobals";
import { renderCell } from "../../testUtils/CellTestUtils";
import { mockedAnnounceIfEnabled } from "../../testUtils/SpeechUtilsMock";
import { selectedAttributesSignal, clearAttributes } from "./MessageAttributesState";
import { ActionAttributeCell } from "./ActionAttributeCell";

vi.mock("../../utils/SpeechUtils");

describe("ActionAttributeCell", (): void => {

  const TEST_CELL_ID = "attribute-angry";
  const testCell = {
    options: {
      "label": "angry",
      "category": "Feeling",
      "composition": 1198,
      "rowStart": 3,
      "rowSpan": 1,
      "columnStart": 4,
      "columnSpan": 1
    }
  };

  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  });

  beforeEach((): void => {
    clearAttributes();
  });

  test("renders as an unpressed button at its grid position", async (): Promise<void> => {
    renderCell(ActionAttributeCell, TEST_CELL_ID, testCell.options);

    const button = await screen.findByRole("button", { name: "Feeling: angry" });
    expect(button).toBeVisible();
    expect(button.id).toBe(TEST_CELL_ID);
    expect(button.getAttribute("class")).toBe("actionAttributeCell");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.style.getPropertyValue("grid-column")).toBe("4 / span 1");
    expect(button.style.getPropertyValue("grid-row")).toBe("3 / span 1");
    expect(button.querySelector("svg")).toBeTruthy();
  });

  test("clicking sets the attribute and presses the button", async (): Promise<void> => {
    renderCell(ActionAttributeCell, TEST_CELL_ID, testCell.options);

    const button = await screen.findByRole("button", { name: "Feeling: angry" });
    await userEvent.click(button);

    expect(selectedAttributesSignal.value)
      .toEqual([{ category: "Feeling", label: "angry", composition: 1198 }]);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(mockedAnnounceIfEnabled).toHaveBeenLastCalledWith("Feeling: angry, on");
  });

  test("clicking again unsets it", async (): Promise<void> => {
    renderCell(ActionAttributeCell, TEST_CELL_ID, testCell.options);

    const button = await screen.findByRole("button", { name: "Feeling: angry" });
    await userEvent.click(button);
    await userEvent.click(button);

    expect(selectedAttributesSignal.value).toEqual([]);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(mockedAnnounceIfEnabled).toHaveBeenLastCalledWith("Feeling: angry, off");
  });

  test("renders pressed when the attribute is already set", async (): Promise<void> => {
    // What happens when the user leaves the attributes palette and comes back: the cell is
    // built afresh and reads the selection that outlived it.
    selectedAttributesSignal.value = [{ category: "Feeling", label: "angry", composition: 1198 }];

    renderCell(ActionAttributeCell, TEST_CELL_ID, testCell.options);

    const button = await screen.findByRole("button", { name: "Feeling: angry" });
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  test("un-presses when the signal is cleared from outside the cell", async (): Promise<void> => {
    // A later task calls `clearAttributes()` when the message is sent, possibly while the
    // attributes palette is still on screen -- the cell must follow along, not just its own
    // clicks.
    renderCell(ActionAttributeCell, TEST_CELL_ID, testCell.options);

    const button = await screen.findByRole("button", { name: "Feeling: angry" });
    await userEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("true");

    selectedAttributesSignal.value = [];

    await waitFor(() => expect(button.getAttribute("aria-pressed")).toBe("false"));
  });

  test("the same label in another category is a different attribute", async (): Promise<void> => {
    selectedAttributesSignal.value = [{ category: "Intent", label: "angry", composition: 1198 }];

    renderCell(ActionAttributeCell, TEST_CELL_ID, testCell.options);

    const button = await screen.findByRole("button", { name: "Feeling: angry" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });
});
