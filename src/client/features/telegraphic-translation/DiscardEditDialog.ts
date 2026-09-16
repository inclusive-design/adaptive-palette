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

import { VNode } from "preact";
import { html } from "htm/preact";

import {
  sentenceCompletionsSignal, discardEditPromptSignal, focusedMessageSignal,
  confirmDiscardEdit, cancelDiscardEdit
} from "./TelegraphicTranslationState";
import { ModalDialog } from "../../components/ModalDialog";
import { INPUT_AREA_ID } from "../../cells/ContentEncoding";

export const DISCARD_EDIT_DIALOG_ID = "discardEditDialog";
export const DISCARD_DIALOG_TITLE = "Change your message?";
export const CHANGE_ANYWAY_LABEL = "Change anyway";
export const KEEP_SENTENCES_LABEL = "Keep sentences";

/**
 * Where focus goes when the dialog closes. Normally the input area, where the edit was made.
 * The exception is sentences that arrived behind the question and have not had focus yet:
 * keeping them is a decision to use them, so they get the focus move they would have had if
 * the question had never been up.
 *
 * The dialog's `close` event is queued as a task, so this runs after the sentence area's focus
 * effect, which leaves this pass alone rather than racing it.
 * @returns {HTMLElement | null}
 */
function restoreDialogFocus (): HTMLElement | null {
  const state = sentenceCompletionsSignal.peek();
  if (state.sentences.length > 0 && focusedMessageSignal.peek() !== state.telegraphicMessage) {
    const choice = document.querySelector<HTMLElement>(".sentenceChoice");
    if (choice) {
      focusedMessageSignal.value = state.telegraphicMessage;
      return choice;
    }
  }
  return document.getElementById(INPUT_AREA_ID);
}

/**
 * The dialog asking whether an edit may throw the sentence work away. Mounted once for the page,
 * outside the palettes, so it is there on every screen, with or without a sentence area.
 * @returns {VNode}
 */
export function DiscardEditDialog (): VNode {
  const discardPrompt = discardEditPromptSignal.value;
  return html`
    <${ModalDialog}
      id=${DISCARD_EDIT_DIALOG_ID}
      title=${DISCARD_DIALOG_TITLE}
      isOpen=${discardPrompt !== null}
      onClose=${cancelDiscardEdit}
      restoreFocusTo=${restoreDialogFocus}>
      <p>${discardPrompt}</p>
      <div class="dialogFooter">
        <button type="button" onClick=${confirmDiscardEdit}>${CHANGE_ANYWAY_LABEL}</button>
        <button type="button" onClick=${cancelDiscardEdit}>${KEEP_SENTENCES_LABEL}</button>
      </div>
    <//>
  `;
}
