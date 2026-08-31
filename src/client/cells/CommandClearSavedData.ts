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
import { useState } from "preact/hooks";

import { BlissSymbol } from "../components/BlissSymbol";
import { ModalDialog } from "../components/ModalDialog";
import { BlissSymbolInfoType, LayoutInfoType } from "../index.d";
import { generateGridStyle } from "../utils/GridUtils";
import { announceIfEnabled } from "../utils/SpeechUtils";
import { hydrateMessageLog } from "../core/MessageLog";
import { getStorage } from "../core/StorageBackend";
import "./CommandClearSavedData.scss";

export const CLEAR_SAVED_DATA_DIALOG_ID = "clearSavedDataDialog";
export const CONFIRM_LABEL = "Clear";
export const CANCEL_LABEL = "Cancel";
export const CONFIRM_QUESTION = "This deletes every message you have saved, and the message you are writing now. It cannot be undone.";
export const FAILURE_MESSAGE = "The saved data could not be cleared. This browser is not letting the app use its storage.";

/**
 * Discard everything the app has saved.
 *
 * Local storage is emptied as well as the store. Local storage has been replaced by IndexedDB. Nothing writes to it any more.
 * @returns {Promise<boolean>} - `true` if the data was cleared; `false` if the browser denied
 *                               access to its storage, in which case the saved data is still
 *                               there.
 */
export async function clearSavedData (): Promise<boolean> {
  try {
    await getStorage().clearAll();
    // Reads an empty store, which empties the log the app is working from.
    await hydrateMessageLog();
    window.localStorage.clear();
    return true;
  } catch (error) {
    console.error(`Could not clear the saved data: ${String(error)}`);
    return false;
  }
}

type CommandClearSavedDataProps = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

/**
 * Discard everything the app has saved, after asking the user to confirm.
 *
 * The confirmation is not a courtesy: the press is one cell away from the message-editing
 * commands, and what it destroys cannot be brought back.
 *
 * A cleared page is reloaded rather than reset in place. Reloading is what guarantees that
 * what is on screen -- the suggested next words, above all -- matches the now empty
 * storage, without reset code for each thing derived from it.
 * @param {CommandClearSavedDataProps} props - The cell id, and its label, symbol and
 *                                             grid position.
 * @returns {VNode}
 */
export function CommandClearSavedData (props: CommandClearSavedDataProps): VNode {
  const { id, options } = props;
  const { label, composition, columnStart, columnSpan, rowStart, rowSpan } = options;
  const [isConfirming, setIsConfirming] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  // WebKit does not focus a <button> on mouse click, so ModalDialog would otherwise
  // capture the wrong opener to restore focus to when the dialog closes.
  const askToConfirm = (event: Event): void => {
    (event.currentTarget as HTMLElement).focus();
    announceIfEnabled(label);
    setHasFailed(false);
    setIsConfirming(true);
  };

  // A failed clear leaves the dialog open with its reason shown. Reloading anyway would
  // look like the data had gone when it is all still there. Synchronous because it is a
  // Preact event handler; the clear itself is awaited inside.
  const confirm = (): void => {
    void clearSavedData().then((cleared) => {
      if (cleared) {
        window.location.reload();
      } else {
        setHasFailed(true);
      }
    });
  };

  // A Fragment: the button is the grid item, and the dialog must not be wrapped in one
  // more element that the palette grid would then try to place.
  return html`
    <${Fragment}>
    <button
      id="${id}"
      class="btn-command"
      style="${gridStyles}"
      aria-haspopup="dialog"
      onClick=${askToConfirm}>
      <${BlissSymbol} composition=${composition} label=${label} />
    </button>
    <${ModalDialog}
      id=${CLEAR_SAVED_DATA_DIALOG_ID}
      title=${label}
      isOpen=${isConfirming}
      onClose=${() => setIsConfirming(false)}>
      <p>${CONFIRM_QUESTION}</p>
      ${hasFailed && html`<p class="clearSavedDataFailure" role="alert">${FAILURE_MESSAGE}</p>`}
      <div class="clearSavedDataChoices">
        <button type="button" class="clearSavedDataConfirm" onClick=${confirm}>${CONFIRM_LABEL}</button>
        <button type="button" onClick=${() => setIsConfirming(false)}>${CANCEL_LABEL}</button>
      </div>
    <//>
    <//>
  `;
}
