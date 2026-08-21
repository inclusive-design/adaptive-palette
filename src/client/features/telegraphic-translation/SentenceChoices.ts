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
import { useEffect, useRef, useState } from "preact/hooks";

import {
  sentenceCompletionsSignal, clearMessageAndChoices, abortActiveSentenceRequest,
  discardEditPromptSignal, confirmDiscardEdit, cancelDiscardEdit
} from "./TelegraphicTranslationState";
import { ModalDialog } from "../../components/ModalDialog";
import { INPUT_AREA_ID } from "../../cells/ContentEncoding";
import { announceIfEnabled, speak, speakUnavailable } from "../../utils/SpeechUtils";
import { saveTranslation, SentenceSourceType } from "../../core/MessageLog";
import { adaptivePaletteGlobals } from "../../state/GlobalData";
import { AiBadge, aiSuggestionLabel } from "../../components/AiBadge";
import { BlissSentence } from "./BlissSentence";
import "./SentenceChoices.scss";

export const WORKING_MESSAGE = "⏳ Making sentences…";
export const MAKING_MORE_MESSAGE = "⏳ Making more sentences…";
export const CANNOT_COMPLETE_MESSAGE = "⚠ Could not make sentences. Try again.";
export const TYPE_YOUR_OWN_HINT = "None fit? Type yours";
export const SPEAK_BUTTON_LABEL = "Speak";
export const DONE_BUTTON_LABEL = "✓ Done";
export const DISCARD_EDIT_DIALOG_ID = "discardEditDialog";
export const DISCARD_DIALOG_TITLE = "Change your message?";
export const CHANGE_ANYWAY_LABEL = "Change anyway";
export const KEEP_SENTENCES_LABEL = "Keep sentences";

/**
 * The sentence choice area. Renders whichever state `sentenceCompletionsSignal` is in:
 * 1. `idle` means the user has not yet built a message, so there is nothing to show.
 * 2. Every other state shows the typing area -- a text box, Speak and Done -- together with
 *    whatever sentences are on screen, each one a button to tap. Typing need not wait for
 *    the model.
 * 3. `working` also says sentences are being made, or that more are when one is already there.
 * 4. `error` also says sentences could not be made, keeping any sentence on screen.
 *
 * The dialog asking whether an edit may discard the sentence work is rendered here because
 * this component is mounted for the life of the page and always renders its outer element,
 * so the dialog survives the change to `idle`.
 *
 * The live region is always in the document to announce the state.
 * @returns {VNode}
 */
export function SentenceChoices (): VNode {
  const state = sentenceCompletionsSignal.value;
  const discardPrompt = discardEditPromptSignal.value;
  const [typedSentence, setTypedSentence] = useState("");
  const choicesRef = useRef<HTMLDivElement>(null);
  const focusedMessageRef = useRef<string | null>(null);
  const wasAskingRef = useRef(false);

  const firstChoice = (): HTMLButtonElement | null =>
    choicesRef.current?.querySelector<HTMLButtonElement>(".sentenceChoice") ?? null;

  // Clicking the trigger leaves focus on it (it goes `aria-disabled`, not `disabled`).
  // Move focus onto the first choice when it arrives, so reaching the sentences does not
  // mean re-scanning the page. Once per message: a recalled sentence arrives before the
  // rest, and pulling focus back when the rest land would undo the user's scanning, or
  // interrupt them mid-sentence in the text box.
  useEffect((): void => {
    const wasAsking = wasAskingRef.current;
    wasAskingRef.current = discardPrompt !== null;
    if (state.status === "idle") {
      focusedMessageRef.current = null;
      return;
    }
    // The discard dialog holds the page `inert`, so focusing a sentence behind it does
    // nothing; and on the pass that closes the dialog, `restoreDialogFocus` below is what
    // decides where focus goes. Standing aside on both leaves the one-shot move unspent
    // for whichever of them can land it.
    if (discardPrompt !== null || wasAsking) {
      return;
    }
    const textBox = choicesRef.current?.querySelector(".sentenceTypeYourOwn input");
    if (state.sentences.length === 0 ||
        focusedMessageRef.current === state.telegraphicMessage ||
        document.activeElement === textBox) {
      return;
    }
    focusedMessageRef.current = state.telegraphicMessage;
    firstChoice()?.focus();
  }, [state, discardPrompt]);

  // Where focus goes when the discard dialog closes. Normally the input area, where the
  // edit was made. The exception is sentences that arrived behind the question and have
  // not been reached yet: keeping them is a decision to use them, so they get the focus
  // move they would have had if the question had never been up.
  //
  // The dialog's `close` event is queued as a task, so this runs after the effect above --
  // which is why that effect leaves this pass alone rather than racing it.
  const restoreDialogFocus = (): HTMLElement | null => {
    if (state.sentences.length > 0 && focusedMessageRef.current !== state.telegraphicMessage) {
      focusedMessageRef.current = state.telegraphicMessage;
      const choice = firstChoice();
      if (choice) {
        return choice;
      }
    }
    return document.getElementById(INPUT_AREA_ID);
  };

  const logAndSpeak = (sentence: string, source: SentenceSourceType): void => {
    abortActiveSentenceRequest();
    speak(sentence);
    saveTranslation(state.telegraphicMessage, {
      model: state.model,
      candidates: state.sentences,
      sentence,
      source
    });
  };

  const submitTypedSentence = (event: Event): void => {
    event.preventDefault();
    const sentence = typedSentence.trim();
    if (sentence.length === 0) {
      speakUnavailable(SPEAK_BUTTON_LABEL);
      return;
    }
    // The text stays in the box on purpose, so it can be spoken again or edited into a
    // second attempt without retyping it.
    logAndSpeak(sentence, "typed");
  };

  // "Done" button clears up the input area and sentences.
  const finish = (): void => {
    announceIfEnabled("Done");
    clearMessageAndChoices();
    setTypedSentence("");
  };

  // Marked unavailable rather than `disabled` because a disabled control loses focus.
  const nothingTyped = typedSentence.trim().length === 0;

  // Read per render rather than at module load: the settings dialog can turn this off while
  // sentences are on screen.
  const showBlissSentence =
    adaptivePaletteGlobals.config.telegraphicTranslation?.showBlissSentence === true;
  const markAiSuggestions = adaptivePaletteGlobals.config.markAiSuggestions;

  const choices = state.status === "idle" ? null : html`
    ${state.sentences.map((sentence, index) => {
      // Everything but the sentence recalled from the log came from the model.
      const isMarked = markAiSuggestions && sentence !== state.recalledSentence;
      // A marked sentence says so first. An unmarked one keeps the name it had: the sentence
      // itself when the Bliss row would otherwise be all a screen reader found.
      const ariaLabel = isMarked ? aiSuggestionLabel(sentence)
        : showBlissSentence ? sentence : undefined;
      return html`
        <button
          key=${index}
          class=${isMarked ? "sentenceChoice aiSuggestion" : "sentenceChoice"}
          aria-label=${ariaLabel}
          onClick=${() => logAndSpeak(sentence, "chosen")}>
          ${isMarked ? html`<${AiBadge} />` : null}
          ${showBlissSentence ? html`<${BlissSentence} sentence=${sentence} />` : sentence}
        </button>
      `;
    })}
    <form class="sentenceTypeYourOwn" onSubmit=${submitTypedSentence}>
      <input
        type="text"
        aria-label=${TYPE_YOUR_OWN_HINT}
        placeholder=${TYPE_YOUR_OWN_HINT}
        value=${typedSentence}
        onInput=${(event: Event) => setTypedSentence((event.target as HTMLInputElement).value)}
      />
      <button type="submit" aria-disabled=${nothingTyped}>${SPEAK_BUTTON_LABEL}</button>
      <button type="button" class="sentenceDone" onClick=${finish}>${DONE_BUTTON_LABEL}</button>
    </form>
  `;

  const statusText = state.status === "working"
    ? (state.sentences.length > 0 ? MAKING_MORE_MESSAGE : WORKING_MESSAGE)
    : state.status === "error" ? CANNOT_COMPLETE_MESSAGE : "";

  return html`
    <div class="sentenceChoices" ref=${choicesRef}>
      <p class=${state.status === "error" ? "statusMessage sentenceError" : "statusMessage"} role="status">${statusText}</p>
      ${choices}
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
    </div>
  `;
}
