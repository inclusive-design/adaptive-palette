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

import { render, screen, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { html } from "htm/preact";
import { vi, type MockInstance } from "vitest";

import { DISMISS_LABEL } from "../../components/ModalDialog";
import { setStorage } from "../../core/StorageBackend";
import { FakeStorage } from "../../testUtils/FakeStorage";
import {
  ERASE_CANCEL_LABEL, ERASE_CONFIRM_LABEL, ERASE_DONE_TEXT, ERASE_FAILED_TEXT, ERASE_LABEL,
  ERASE_PENDING_TEXT, EraseAllData
} from "./EraseAllData";

describe("EraseAllData", (): void => {

  let storage: FakeStorage;
  let fetchSpy: MockInstance;

  beforeEach(async (): Promise<void> => {
    storage = new FakeStorage();
    await storage.open();
    setStorage(storage);
    fetchSpy = vi.spyOn(window, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
  });

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  test("asks before erasing anything", async (): Promise<void> => {
    const destroy = vi.spyOn(storage, "destroy");
    render(html`<${EraseAllData} />`);

    await userEvent.click(screen.getByRole("button", { name: ERASE_LABEL }));

    // The dialog opens via a `useEffect` in `ModalDialog`, which does not settle within
    // the same tick as the click that triggers it, hence `findByRole` over `getByRole`.
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(destroy).not.toHaveBeenCalled();
  });

  test("cancelling erases nothing", async (): Promise<void> => {
    const destroy = vi.spyOn(storage, "destroy");
    render(html`<${EraseAllData} />`);

    await userEvent.click(screen.getByRole("button", { name: ERASE_LABEL }));
    await userEvent.click(await screen.findByRole("button", { name: ERASE_CANCEL_LABEL }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(destroy).not.toHaveBeenCalled();
  });

  // Once destroy() has started, the erase cannot be un-done, so the dialog must not offer a
  // Cancel it cannot honour: both buttons disable, and the tester is told the erase is running.
  test("disables the dialog's buttons while an erase is in flight, and shows that it cannot be stopped", async (): Promise<void> => {
    let resolveDestroy: () => void = () => {};
    vi.spyOn(storage, "destroy").mockReturnValue(new Promise((resolve) => { resolveDestroy = resolve; }));
    render(html`<${EraseAllData} />`);

    await userEvent.click(screen.getByRole("button", { name: ERASE_LABEL }));
    await userEvent.click(await screen.findByRole("button", { name: ERASE_CONFIRM_LABEL }));

    await waitFor(() => expect(screen.getByText(ERASE_PENDING_TEXT)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: ERASE_CONFIRM_LABEL })).toBeDisabled();
    expect(screen.getByRole("button", { name: ERASE_CANCEL_LABEL })).toBeDisabled();
    // The dialog is still the one place the tester can be: nothing has told them otherwise.
    // Its header button goes too, so no route out of the dialog implies a cancellation that
    // is no longer available. Escape is refused by `ModalDialog`, which covers it in its own
    // tests: it needs a trusted keypress, which this file's synthetic input cannot produce.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: DISMISS_LABEL })).toBeDisabled();
    // With every control disabled, the pending text is the only thing left to hold focus.
    // Without it a switch or eye-gaze user would be left on `<body>` with nothing to scan.
    // `useEffect` runs after the paint, so the move is a tick behind the text appearing.
    await waitFor(() => expect(screen.getByText(ERASE_PENDING_TEXT)).toHaveFocus());

    resolveDestroy();
    await waitFor(() => expect(screen.getByText(ERASE_DONE_TEXT)).toBeInTheDocument());
  });

  test("confirming erases the store, then asks the app to quit", async (): Promise<void> => {
    await storage.writeSettings({ "maxRecalledRecords": 12 });
    render(html`<${EraseAllData} />`);

    await userEvent.click(screen.getByRole("button", { name: ERASE_LABEL }));
    await userEvent.click(await screen.findByRole("button", { name: ERASE_CONFIRM_LABEL }));

    await waitFor(() => expect(screen.getByText(ERASE_DONE_TEXT)).toBeInTheDocument());
    // The dialog and the button that opened it are both gone, so focus is put on the
    // message: it is also what has it announced.
    await waitFor(() => expect(screen.getByText(ERASE_DONE_TEXT)).toHaveFocus());
    expect(fetchSpy).toHaveBeenCalledWith("/quit", { method: "POST" });
    await storage.open();
    expect(await storage.readSettings()).toEqual({});
  });

  test("says so when the store cannot be erased, and does not quit", async (): Promise<void> => {
    vi.spyOn(storage, "destroy").mockRejectedValue(new Error("blocked"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(html`<${EraseAllData} />`);

    await userEvent.click(screen.getByRole("button", { name: ERASE_LABEL }));
    await userEvent.click(await screen.findByRole("button", { name: ERASE_CONFIRM_LABEL }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(ERASE_FAILED_TEXT));
    expect(fetchSpy).not.toHaveBeenCalled();
    // A failed erase is not an in-flight one: the tester must be able to try again or back out.
    expect(screen.getByRole("button", { name: ERASE_CONFIRM_LABEL })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: ERASE_CANCEL_LABEL })).not.toBeDisabled();
    // The pending text that held focus is gone with the failure, so focus moves to the
    // failure message rather than dropping to `<body>` in the still-open dialog.
    await waitFor(() => expect(screen.getByText(ERASE_FAILED_TEXT)).toHaveFocus());
    consoleErrorSpy.mockRestore();
  });

  test("erasing still succeeds in a browser where nothing answers /quit", async (): Promise<void> => {
    // The dev server has no launcher behind it, and neither has a plain browser tab.
    fetchSpy.mockRejectedValue(new TypeError("Failed to fetch"));
    render(html`<${EraseAllData} />`);

    await userEvent.click(screen.getByRole("button", { name: ERASE_LABEL }));
    await userEvent.click(await screen.findByRole("button", { name: ERASE_CONFIRM_LABEL }));

    await waitFor(() => expect(screen.getByText(ERASE_DONE_TEXT)).toBeInTheDocument());
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
