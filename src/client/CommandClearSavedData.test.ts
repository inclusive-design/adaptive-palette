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
import { render, screen, cleanup, waitFor } from "@testing-library/preact";
import { userEvent } from "vitest/browser";
import { html } from "htm/preact";

import { initAdaptivePaletteGlobals } from "./InitGlobals";
import {
  CommandClearSavedData, CANCEL_LABEL, CONFIRM_LABEL
} from "./CommandClearSavedData";

// A successful clear reloads the page, which would restart the test runner's own page.
// Only `clearSavedData` is replaced, since the cell draws its grid position and speech
// from the same module; whether the cell asked for the clear is what these tests are about.
const { mockClearSavedData } = vi.hoisted(() => ({ mockClearSavedData: vi.fn() }));
vi.mock("./GlobalUtils", async (importOriginal) => ({
  ...await importOriginal<typeof import("./GlobalUtils")>(),
  clearSavedData: mockClearSavedData
}));

// `userEvent` is the provider-backed instance from `vitest/browser`, not the one from
// `@testing-library/user-event`: these tests drive a native `<dialog>`, whose default
// actions only run for trusted events.

describe("CommandClearSavedData component", () => {

  const TEST_CELL_ID = "command-clear-saved-data";
  const testOptions = {
    "label": "clear all saved data",
    "composition": [939, ";", 907, "//", 841],
    "rowStart": 1,
    "rowSpan": 1,
    "columnStart": 17,
    "columnSpan": 1
  };

  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  });

  afterEach(() => {
    cleanup();
    mockClearSavedData.mockReset();
  });

  const renderCell = () => render(html`
    <${CommandClearSavedData} id="${TEST_CELL_ID}" options=${testOptions} />
  `);

  const trigger = () => screen.getByRole("button", { name: testOptions.label });

  test("renders as a command cell at its grid position", () => {
    renderCell();

    const button = trigger();
    expect(button.id).toBe(TEST_CELL_ID);
    expect(button.getAttribute("class")).toBe("btn-command");
    expect(button.style.getPropertyValue("grid-column")).toBe("17 / span 1");
    expect(button.style.getPropertyValue("grid-row")).toBe("1 / span 1");
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
  });

  // Clearing cannot be undone, so a single press must not do it.
  test("does not clear anything on the first press", async () => {
    renderCell();

    await userEvent.click(trigger());

    expect(mockClearSavedData).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: testOptions.label })).toBeVisible();
    });
  });

  test("leaves the saved data alone when the confirmation is cancelled", async () => {
    renderCell();
    await userEvent.click(trigger());
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: testOptions.label })).toBeVisible();
    });

    await userEvent.click(screen.getByRole("button", { name: CANCEL_LABEL }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: testOptions.label })).not.toBeInTheDocument();
    });
    expect(mockClearSavedData).not.toHaveBeenCalled();
  });

  test("clears the saved data once the confirmation is accepted", async () => {
    // A clear that reports failure leaves the dialog in place, and keeps this test from
    // reaching the page reload that a successful clear triggers.
    mockClearSavedData.mockReturnValue(false);
    renderCell();
    await userEvent.click(trigger());
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: testOptions.label })).toBeVisible();
    });

    await userEvent.click(screen.getByRole("button", { name: CONFIRM_LABEL }));

    expect(mockClearSavedData).toHaveBeenCalledTimes(1);
  });
});
