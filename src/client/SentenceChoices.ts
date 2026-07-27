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

import { sentenceCompletionsSignal, clearMessageAndChoices } from "./GlobalData";
import { speak } from "./GlobalUtils";
import { saveSentenceRecord, SentenceSourceType } from "./sentenceLog";
import "./SentenceChoices.scss";

export const WORKING_MESSAGE = "⏳ Making sentences…";
export const CANNOT_COMPLETE_MESSAGE = "⚠ Could not make sentences. Try again.";
export const TYPE_YOUR_OWN_HINT = "None of above — let me type it";
export const SPEAK_BUTTON_LABEL = "Speak";
export const DONE_BUTTON_LABEL = "✓ Done";

/**
 * The area below the input palette. Renders whichever of the four states
 * `sentenceCompletionsSignal` is in. In the `ready` state each candidate sentence is a
 * large button; tapping one speaks it and records it as the preferred sentence for the
 * message, and the list stays put so the sentence can be repeated for a listener who
 * missed it, or a different one picked. The text box is always present alongside the
 * choices rather than hidden behind a "none of these" step, so it never has to be
 * discovered, and it keeps its text after speaking so it can be reused or edited.
 *
 * The live region is always in the document, empty when there is nothing to announce.
 * A `role="status"` element inserted with its text already in place is routinely missed
 * by screen readers; the announcement only lands reliably when the text arrives in a
 * region that was already there.
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
    // second attempt without retyping it -- typing is expensive for these users.
    logAndSpeak(sentence, "typed");
  };

  // Done means done talking about this: the message and the sentences made from it go
  // together. Shares the text box's row rather than taking one of its own, so the Bliss
  // palette below keeps the vertical space.
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

  const statusText = state.status === "working" ? WORKING_MESSAGE : "";
  const errorLine = state.status === "error"
    ? html`<p class="sentenceError" role="alert">${CANNOT_COMPLETE_MESSAGE}</p>`
    : null;

  return html`
    <div class="sentenceChoices" ref=${choicesRef}>
      <p class="sentenceStatus" role="status">${statusText}</p>
      ${errorLine}
      ${choices}
    </div>
  `;
}
