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

import { vi, type MockInstance } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/preact";
import { userEvent } from "vitest/browser";
import { html } from "htm/preact";

import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import {
  CommandClearSavedData, CANCEL_LABEL, CONFIRM_LABEL, clearSavedData
} from "./CommandClearSavedData";
import { MESSAGE_LOG_KEY } from "../core/MessageLog";

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

  // A successful clear reloads the page, which would restart the test runner's own page.
  // Making `Storage.clear` throw keeps every test on the failure path, where the dialog
  // stays put. Whether the cell asked for the clear is what these tests are about.
  let clearSpy: MockInstance;

  beforeEach((): void => {
    clearSpy = vi.spyOn(Storage.prototype, "clear").mockImplementation((): void => {
      throw new Error("storage is not available");
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
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

    expect(clearSpy).not.toHaveBeenCalled();
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
    expect(clearSpy).not.toHaveBeenCalled();
  });

  test("clears the saved data once the confirmation is accepted", async () => {
    renderCell();
    await userEvent.click(trigger());
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: testOptions.label })).toBeVisible();
    });

    await userEvent.click(screen.getByRole("button", { name: CONFIRM_LABEL }));

    expect(clearSpy).toHaveBeenCalledTimes(1);
  });
});

describe("clearSavedData()", (): void => {

  afterEach((): void => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  test("Removes everything the app has saved", (): void => {
    window.localStorage.setItem(MESSAGE_LOG_KEY, JSON.stringify([{ timestamp: "now", payloads: [] }]));
    window.localStorage.setItem("some other key", "value");

    expect(clearSavedData()).toBe(true);
    expect(window.localStorage.length).toBe(0);
  });

  test("Reports failure when storage cannot be written", (): void => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, "clear").mockImplementation((): void => {
      throw new Error("storage is not available");
    });

    expect(clearSavedData()).toBe(false);
    expect(consoleError).toHaveBeenCalled();
  });

});
