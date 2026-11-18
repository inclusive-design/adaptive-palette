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

import type { VNode } from "preact";
import { Fragment } from "preact";
import { html } from "htm/preact";
import { useState } from "preact/hooks";

import { ModalDialog } from "../../components/ModalDialog";
import { getStorage } from "../../core/StorageBackend";
import { t } from "../../i18n/I18n";
import "./EraseAllData.scss";

const ERASE_DIALOG_ID = "eraseAllDataDialog";

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

/**
 * A ref that focuses its element as it appears. Defined outside the component, so Preact gets the same
 * ref on every render and calls it only when the element is added or removed.
 * @param {HTMLElement | null} element - The element, or `null` as it goes.
 * @returns {void}
 */
function focusOnMount (element: HTMLElement | null): void {
  element?.focus();
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

  // Each status paragraph takes focus as it appears (`focusOnMount`), which is also what has it read out:
  // 1. Pending: `showModal()` makes everything outside the dialog inert, and while the erase runs every
  //    control inside it is disabled. Without this, focus would sit on `<body>` with nothing to tab or
  //    scan to: a dead end for a switch or eye-gaze user.
  // 2. Failure: the pending paragraph that held focus goes with the failure, so focus would fall to
  //    `<body>` inside a dialog that is open again.
  // 3. Done: the dialog is gone, and the opener it would have restored focus to went with it, which is
  //    also why the `close` event's restore that follows leaves focus here. A live region inserted with
  //    its text already in it is not announced by every screen reader.

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
      <p class="eraseAllDataDone" role="status" tabindex="-1" ref=${focusOnMount}>${t("eraseDone")}</p>
    `;
  }

  return html`
    <${Fragment}>
      <div class="eraseAllData">
        <button type="button" class="eraseAllDataTrigger" aria-haspopup="dialog" onClick=${ask}>
          ${t("eraseLabel")}
        </button>
        <p class="eraseAllDataNote">${t("eraseNote")}</p>
      </div>
      <${ModalDialog}
        id=${ERASE_DIALOG_ID}
        title=${t("eraseLabel")}
        isOpen=${isConfirming}
        isDismissible=${!isPending}
        onClose=${cancel}>
        <p>${t("eraseQuestion")}</p>
        ${isPending && html`
          <p class="eraseAllDataPending" role="status" tabindex="-1" ref=${focusOnMount}>${t("erasePending")}</p>
        `}
        ${hasFailed && html`<p class="eraseAllDataFailure" role="alert" tabindex="-1" ref=${focusOnMount}>${t("eraseFailed")}</p>`}
        <div class="eraseAllDataChoices">
          <button
            type="button"
            class="eraseAllDataConfirm"
            disabled=${isPending}
            onClick=${confirm}>${t("eraseConfirm")}</button>
          <button type="button" disabled=${isPending} onClick=${cancel}>${t("cancel")}</button>
        </div>
      <//>
    <//>
  `;
}
