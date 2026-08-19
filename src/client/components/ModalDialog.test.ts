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

import { ModalDialog, DISMISS_LABEL } from "./ModalDialog";

// The header dismiss control is named "Close dialog", not "Close", so that it does not
// collide with the footer "Close" button each dialog body renders.

const TITLE = "Add Symbol to Message";

describe("ModalDialog", () => {

  afterEach(() => {
    cleanup();
  });

  test("stays hidden while isOpen is false", () => {
    render(html`
      <${ModalDialog} id="testDialog" title=${TITLE} isOpen=${false} onClose=${() => {}}>
        <p>body</p>
      <//>
    `);
    expect(screen.getByText("body")).not.toBeVisible();
  });

  test("opens and is labelled by its heading", () => {
    render(html`
      <${ModalDialog} id="testDialog" title=${TITLE} isOpen=${true} onClose=${() => {}}>
        <p>body</p>
      <//>
    `);
    const dialog = screen.getByRole("dialog", { name: TITLE });
    expect(dialog).toBeVisible();
    expect(screen.getByRole("heading", { name: TITLE })).toBeInTheDocument();
  });

  // `userEvent` comes from `vitest/browser`, not `@testing-library/user-event`: a
  // `<dialog>`'s Escape-to-close is a UA default action, which only runs for trusted
  // events. Playwright-driven input is trusted; synthetic dispatch is not.
  test("Escape asks the parent to close", async () => {
    const onClose = vi.fn();
    render(html`
      <${ModalDialog} id="testDialog" title=${TITLE} isOpen=${true} onClose=${onClose}>
        <p>body</p>
      <//>
    `);

    await userEvent.keyboard("{Escape}");

    // The `close` event is queued as a task, so the click/keypress promise resolving
    // does not mean it has fired yet.
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  test("the dismiss button asks the parent to close", async () => {
    const onClose = vi.fn();
    render(html`
      <${ModalDialog} id="testDialog" title=${TITLE} isOpen=${true} onClose=${onClose}>
        <p>body</p>
      <//>
    `);

    await userEvent.click(screen.getByRole("button", { name: DISMISS_LABEL }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  // A dialog body's footer Close button closes by flipping `isOpen`, which is a different
  // route than Escape or the dismiss button and exercises the effect's close branch.
  test("closes when the parent withdraws isOpen", async () => {
    const onClose = vi.fn();
    const { rerender } = render(html`
      <${ModalDialog} id="testDialog" title=${TITLE} isOpen=${true} onClose=${onClose}>
        <p>body</p>
      <//>
    `);
    expect(screen.getByText("body")).toBeVisible();

    rerender(html`
      <${ModalDialog} id="testDialog" title=${TITLE} isOpen=${false} onClose=${onClose}>
        <p>body</p>
      <//>
    `);

    await waitFor(() => expect(screen.getByText("body")).not.toBeVisible());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  // WebKit does not restore focus to the opener on its own, so ModalDialog does it
  // explicitly. Without this a switch or eye-gaze user loses their scan position.
  test("returns focus to whatever opened it", async () => {
    const onClose = vi.fn();
    const { rerender } = render(html`
      <div>
        <button type="button">opener</button>
        <${ModalDialog} id="testDialog" title=${TITLE} isOpen=${false} onClose=${onClose}>
          <p>body</p>
        <//>
      </div>
    `);

    const opener = screen.getByRole("button", { name: "opener" });
    opener.focus();
    expect(opener).toHaveFocus();

    rerender(html`
      <div>
        <button type="button">opener</button>
        <${ModalDialog} id="testDialog" title=${TITLE} isOpen=${true} onClose=${onClose}>
          <p>body</p>
        <//>
      </div>
    `);
    await waitFor(() => expect(screen.getByText("body")).toBeVisible());

    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(opener).toHaveFocus());
  });

  // A dialog opened from something other than a click on its opener -- a signal effect, say
  // -- has no useful opener to go back to, so it names the target itself.
  test("restoreFocusTo outranks the opener", async () => {
    const onClose = vi.fn();
    const dialog = (isOpen: boolean) => html`
      <div>
        <button type="button">opener</button>
        <button type="button">elsewhere</button>
        <${ModalDialog}
          id="testDialog" title=${TITLE} isOpen=${isOpen} onClose=${onClose}
          restoreFocusTo=${() => screen.getByRole("button", { name: "elsewhere" })}>
          <p>body</p>
        <//>
      </div>
    `;
    const { rerender } = render(dialog(false));

    screen.getByRole("button", { name: "opener" }).focus();
    rerender(dialog(true));
    await waitFor(() => expect(screen.getByText("body")).toBeVisible());

    await userEvent.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "elsewhere" })).toHaveFocus();
    });
  });

  // The symbol search and svg-builder-string dialogs stay open while an edit made in them
  // raises the discard question. Everything outside an open modal is `inert`, so the named
  // target cannot take focus and it would be left on `<body>`.
  test("focus falls back to the opener when the named target is inert", async () => {
    const onClose = vi.fn();
    const dialog = (isOpen: boolean) => html`
      <div>
        <button type="button">elsewhere</button>
        <dialog id="otherDialog"><button type="button">opener</button></dialog>
        <${ModalDialog}
          id="testDialog" title=${TITLE} isOpen=${isOpen} onClose=${onClose}
          restoreFocusTo=${() => screen.getByRole("button", { name: "elsewhere" })}>
          <p>body</p>
        <//>
      </div>
    `;
    const { rerender } = render(dialog(false));

    (document.getElementById("otherDialog") as HTMLDialogElement).showModal();
    const opener = screen.getByRole("button", { name: "opener" });
    opener.focus();
    rerender(dialog(true));
    await waitFor(() => expect(screen.getByText("body")).toBeVisible());

    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(opener).toHaveFocus());
  });
});
