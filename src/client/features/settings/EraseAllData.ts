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

import { Fragment, VNode } from "preact";
import { html } from "htm/preact";
import { useEffect, useRef, useState } from "preact/hooks";

import { ModalDialog } from "../../components/ModalDialog";
import { getStorage } from "../../core/StorageBackend";
import "./EraseAllData.scss";

export const ERASE_DIALOG_ID = "eraseAllDataDialog";
export const ERASE_LABEL = "Erase all app data and quit";
export const ERASE_QUESTION = "This deletes every message and setting you have saved, and then quits. It cannot be undone.";
export const ERASE_NOTE = "Do this before deleting the app: once the app is gone there is no way left to reach this data.";
export const ERASE_CONFIRM_LABEL = "Erase and quit";
export const ERASE_CANCEL_LABEL = "Cancel";
export const ERASE_FAILED_TEXT = "The data could not be erased. Close any other tab showing Adaptive Palette, then try again.";
export const ERASE_DONE_TEXT = "Everything has been erased. You can close this window and delete the app.";
export const ERASE_PENDING_TEXT = "Erasing everything now. This cannot be stopped once it has started.";

/**
 * Ask the launcher to shut down.
 *
 * A relative URL: the page is served by the launcher, so this is same-origin. Nothing
 * answers it in a browser tab opened against the dev server, and that is not a failure --
 * the data is already gone, and the tester closes the tab themselves.
 * @returns {Promise<void>}
 */
async function quitApp (): Promise<void> {
  try {
    await fetch("/quit", { method: "POST" });
  } catch {
    // No launcher behind this page. The message on screen covers it.
  }
}

type EraseAllDataProps = {
  onErased?: () => void
};

/**
 * "Erase all app data and quit": the uninstall path.
 *
 * Distinct from "Clear all saved data", which empties the store and leaves the app running.
 * This removes the store itself, so nothing of the app's remains in the browser, and then
 * shuts the launcher down.
 *
 * The page is not reloaded afterwards: reloading would build a fresh, empty database, which
 * is the one thing this is trying to avoid leaving behind.
 * @param {EraseAllDataProps} props - What to tell the dialog around this when the data is gone.
 * @returns {VNode}
 */
export function EraseAllData (props: EraseAllDataProps): VNode {
  const [isConfirming, setIsConfirming] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [isDone, setIsDone] = useState(false);
  // Set for the span between the confirm click and destroy() settling. While it is true, the
  // erase is already irreversible, so nothing on screen may claim otherwise: both buttons are
  // disabled, and closing the dialog is refused rather than honoured.
  const [isPending, setIsPending] = useState(false);
  const pendingRef = useRef<HTMLParagraphElement>(null);
  const doneRef = useRef<HTMLParagraphElement>(null);
  const failureRef = useRef<HTMLParagraphElement>(null);

  // `showModal()` makes everything outside the dialog inert, and while the erase runs every
  // control inside it is disabled, so without this focus would sit on `<body>` with nothing
  // to tab or scan to: a dead end for a switch or eye-gaze user. Focusing the pending
  // paragraph is also what reads it out.
  useEffect(() => {
    pendingRef.current?.focus();
  }, [isPending]);

  // The pending paragraph that held focus is unmounted with the failure, so focus would fall
  // back to `<body>` inside a dialog that is open again. The failure message is where the
  // tester needs to be, and focusing it is also what reads it out.
  useEffect(() => {
    failureRef.current?.focus();
  }, [hasFailed]);

  // The dialog is gone by now, and the opener it would have restored focus to went with it,
  // so focus would land on `<body>`. Moving it to the completion message is also the only
  // reliable way to have it announced: a live region inserted with its text already in it
  // is not announced by every screen reader.
  useEffect(() => {
    doneRef.current?.focus();
  }, [isDone]);

  // WebKit does not focus a <button> on mouse click, so ModalDialog would otherwise
  // capture the wrong opener to restore focus to when the dialog closes.
  const ask = (event: Event): void => {
    (event.currentTarget as HTMLElement).focus();
    setHasFailed(false);
    setIsConfirming(true);
  };

  const cancel = (): void => {
    if (!isPending) {
      setIsConfirming(false);
    }
  };

  const confirm = (): void => {
    setHasFailed(false);
    setIsPending(true);
    void getStorage().destroy()
      .then(async () => {
        setIsPending(false);
        setIsConfirming(false);
        setIsDone(true);
        props.onErased?.();
        await quitApp();
      })
      .catch((error: unknown) => {
        console.error(`Could not erase the app data: ${String(error)}`);
        setIsPending(false);
        setHasFailed(true);
      });
  };

  if (isDone) {
    return html`
      <p class="eraseAllDataDone" role="status" tabindex="-1" ref=${doneRef}>${ERASE_DONE_TEXT}</p>
    `;
  }

  return html`
    <${Fragment}>
      <div class="eraseAllData">
        <button type="button" class="eraseAllDataTrigger" aria-haspopup="dialog" onClick=${ask}>
          ${ERASE_LABEL}
        </button>
        <p class="eraseAllDataNote">${ERASE_NOTE}</p>
      </div>
      <${ModalDialog}
        id=${ERASE_DIALOG_ID}
        title=${ERASE_LABEL}
        isOpen=${isConfirming}
        isDismissible=${!isPending}
        onClose=${cancel}>
        <p>${ERASE_QUESTION}</p>
        ${isPending && html`
          <p class="eraseAllDataPending" role="status" tabindex="-1" ref=${pendingRef}>${ERASE_PENDING_TEXT}</p>
        `}
        ${hasFailed && html`<p class="eraseAllDataFailure" role="alert" tabindex="-1" ref=${failureRef}>${ERASE_FAILED_TEXT}</p>`}
        <div class="eraseAllDataChoices">
          <button
            type="button"
            class="eraseAllDataConfirm"
            disabled=${isPending}
            onClick=${confirm}>${ERASE_CONFIRM_LABEL}</button>
          <button type="button" disabled=${isPending} onClick=${cancel}>${ERASE_CANCEL_LABEL}</button>
        </div>
      <//>
    <//>
  `;
}
