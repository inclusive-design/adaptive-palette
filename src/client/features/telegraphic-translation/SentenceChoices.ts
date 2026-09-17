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
import { useEffect, useRef } from "preact/hooks";

import {
  sentenceCompletionsSignal, clearMessageAndChoices, abortActiveSentenceRequest,
  discardEditPromptSignal, typedSentenceSignal, focusedMessageSignal
} from "./TelegraphicTranslationState";
import { announceIfEnabled, speak, speakUnavailable } from "../../utils/SpeechUtils";
import { saveTranslation, SentenceSourceType } from "../../core/MessageLog";
import { generateGridStyle } from "../../utils/GridUtils";
import { ContentSentenceChoicesType } from "../../index.d";
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

type SentenceChoicesPropsType = {
  id: string,
  options: ContentSentenceChoicesType
};

/**
 * The sentence choice area, the `ContentSentenceChoices` cell. Renders whichever state
 * `sentenceCompletionsSignal` is in:
 * 1. `idle` means the user has not yet built a message, so there is nothing to show.
 * 2. Every other state shows the typing area -- a text box, Speak and Done -- together with
 *    whatever sentences are on screen, each one a button to tap. Typing need not wait for
 *    the model.
 * 3. `working` also says sentences are being made, or that more are when one is already there.
 * 4. `error` also says sentences could not be made, keeping any sentence on screen.
 *
 * The live region is always in the document to announce the state.
 * @param {SentenceChoicesPropsType} props - The cell id and its layout options.
 * @returns {VNode}
 */
export function SentenceChoices (props: SentenceChoicesPropsType): VNode {
  const state = sentenceCompletionsSignal.value;
  const discardPrompt = discardEditPromptSignal.value;
  const { columnStart, columnSpan, rowStart, rowSpan } = props.options;
  const typedSentence = typedSentenceSignal.value;
  const choicesRef = useRef<HTMLDivElement>(null);
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
      focusedMessageSignal.value = null;
      return;
    }
    // The discard dialog holds the page `inert`, so focusing a sentence behind it does nothing;
    // and on the pass that closes the dialog, `DiscardEditDialog`'s focus restore is what decides
    // where focus goes. Standing aside on both leaves the one-shot move unspent for whichever of
    // them can land it.
    if (discardPrompt !== null || wasAsking) {
      return;
    }
    const textBox = choicesRef.current?.querySelector(".sentenceTypeYourOwn input");
    if (state.sentences.length === 0 ||
        focusedMessageSignal.peek() === state.telegraphicMessage ||
        document.activeElement === textBox) {
      return;
    }
    focusedMessageSignal.value = state.telegraphicMessage;
    firstChoice()?.focus();
  }, [state, discardPrompt]);

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
    typedSentenceSignal.value = "";
  };

  // Marked unavailable rather than `disabled` because a disabled control loses focus.
  const nothingTyped = typedSentence.trim().length === 0;

  // Read per render rather than at module load: the settings dialog can turn this off while
  // sentences are on screen.
  const showBlissSentence =
    adaptivePaletteGlobals.config.telegraphicTranslation?.showBlissSentence === true;
  const markAiSuggestions = adaptivePaletteGlobals.config.markAiSuggestions;

  const sentenceButton = (sentence: string, index: number): VNode => {
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
  };

  const choices = state.status === "idle" ? null : html`
    ${state.sentences.map(sentenceButton)}
    <form class="sentenceTypeYourOwn" onSubmit=${submitTypedSentence}>
      <input
        type="text"
        aria-label=${TYPE_YOUR_OWN_HINT}
        placeholder=${TYPE_YOUR_OWN_HINT}
        value=${typedSentence}
        onInput=${(event: Event) => { typedSentenceSignal.value = (event.target as HTMLInputElement).value; }}
      />
      <button type="submit" aria-disabled=${nothingTyped}>${SPEAK_BUTTON_LABEL}</button>
      <button type="button" class="sentenceDone" onClick=${finish}>${DONE_BUTTON_LABEL}</button>
    </form>
  `;

  const statusText = state.status === "working"
    ? (state.sentences.length > 0 ? MAKING_MORE_MESSAGE : WORKING_MESSAGE)
    : state.status === "error" ? CANNOT_COMPLETE_MESSAGE : "";

  return html`
    <div
      id="${props.id}"
      class="sentenceChoices"
      style="${generateGridStyle(columnStart, columnSpan, rowStart, rowSpan)}"
      ref=${choicesRef}>
      <p class=${state.status === "error" ? "statusMessage sentenceError" : "statusMessage"} role="status">${statusText}</p>
      ${choices}
    </div>
  `;
}
