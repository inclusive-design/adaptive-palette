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

import { sentenceCompletionsSignal, clearMessageAndChoices } from "./TelegraphicTranslationState";
import { speak } from "./GlobalUtils";
import { saveSentenceRecord, SentenceSourceType } from "./SentenceLog";
import "./SentenceChoices.scss";

export const WORKING_MESSAGE = "⏳ Making sentences…";
export const CANNOT_COMPLETE_MESSAGE = "⚠ Could not make sentences. Try again.";
export const TYPE_YOUR_OWN_HINT = "None of above — let me type it";
export const SPEAK_BUTTON_LABEL = "Speak";
export const DONE_BUTTON_LABEL = "✓ Done";

/**
 * The sentence choice area. Renders whichever of the four states `sentenceCompletionsSignal` is in:
 * 1. `idle` means the user has not yet built a message, so there is nothing to do.
 * 2. `working` means the system is making sentences from the telegraphic message, so a
 *    status message is shown while the user waits.
 * 3. `error` means the system could not make sentences, so a status message is shown and
 *    the user can try again.
 * 4. `ready` means the system has made sentences. Each sentence is shown as a button for the
 *    user to choose from, along with a text box for typing their own sentence if none of
 *    the choices are right.
 *
 * The live region is always in the document to annouce the state.
 * @returns {VNode}
 */
export function SentenceChoices (): VNode {
  const state = sentenceCompletionsSignal.value;
  const [typedSentence, setTypedSentence] = useState("");
  const choicesRef = useRef<HTMLDivElement>(null);

  // Clicking the trigger leaves focus on it (it goes `aria-disabled`, not `disabled`).
  // Move focus onto the first choice when it arrives, so reaching the sentences does not
  // mean re-scanning the page.
  useEffect((): void => {
    if (state.status === "ready") {
      choicesRef.current?.querySelector<HTMLButtonElement>(".sentenceChoice")?.focus();
    }
  }, [state]);

  const logAndSpeak = (sentence: string, source: SentenceSourceType): void => {
    if (state.status !== "ready") {
      return;
    }
    speak(sentence);
    saveSentenceRecord({
      telegraphicMessage: state.telegraphicMessage,
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
      return;
    }
    // The text stays in the box on purpose, so it can be spoken again or edited into a
    // second attempt without retyping it.
    logAndSpeak(sentence, "typed");
  };

  // "Done" button clears up the input area and sentences.
  const finish = (): void => {
    speak("Done");
    clearMessageAndChoices();
    setTypedSentence("");
  };

  const choices = state.status === "ready" ? html`
    ${state.sentences.map((sentence, index) => html`
      <button
        key=${index}
        class="sentenceChoice"
        onClick=${() => logAndSpeak(sentence, "chosen")}>
        ${sentence}
      </button>
    `)}
    <form class="sentenceTypeYourOwn" onSubmit=${submitTypedSentence}>
      <input
        type="text"
        aria-label=${TYPE_YOUR_OWN_HINT}
        placeholder=${TYPE_YOUR_OWN_HINT}
        value=${typedSentence}
        onInput=${(event: Event) => setTypedSentence((event.target as HTMLInputElement).value)}
      />
      <button type="submit">${SPEAK_BUTTON_LABEL}</button>
      <button type="button" class="sentenceDone" onClick=${finish}>${DONE_BUTTON_LABEL}</button>
    </form>
  ` : null;

  const statusText = state.status === "working" ? WORKING_MESSAGE
    : state.status === "error" ? CANNOT_COMPLETE_MESSAGE : "";

  return html`
    <div class="sentenceChoices" ref=${choicesRef}>
      <p class=${state.status === "error" ? "sentenceStatus sentenceError" : "sentenceStatus"} role="status">${statusText}</p>
      ${choices}
    </div>
  `;
}
