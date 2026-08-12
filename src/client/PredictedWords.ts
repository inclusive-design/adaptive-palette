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

import { adaptivePaletteGlobals, changeEncodingContents } from "./GlobalData";
import { BlissSymbol } from "./BlissSymbol";
import { insertWordAtCaret, speak } from "./GlobalUtils";
import { predictNext } from "./WordPredictionUtils";
import { contextKeyOf, modelWordsSignal, showModelStatusSignal } from "./WordPredictionState";
import { SymbolEncodingType } from "./index.d";
import "./PredictedWords.scss";

export const PREDICTED_WORDS_LABEL = "Suggested next words";

/**
 * What the status region says while the model is being asked for words.
 */
export const QUERYING_MESSAGE = "\u23f3 Querying more word suggestions\u2026";

/**
 * What the status region says when words from the model reach the row.
 * @param {number} count - How many words arrived.
 * @returns {string}
 */
export function moreSuggestionsMessage (count: number): string {
  return `${count} more word suggestion${count === 1 ? "" : "s"}`;
}

/**
 * The row of suggested next words, each shown as a Bliss symbol with its label.
 *
 * The suggestions are recomputed whenever the message changes, from the words the user has
 * used after the same words before. Choosing one adds it to the message exactly as choosing
 * the symbol from a palette does.
 *
 * When a model is answering as well, its words are appended to the slots the history left
 * empty.
 *
 * The row keeps its place whenever the feature is on, even with nothing to suggest: a row
 * that appears and disappears would shift everything below it mid-composition.
 * @returns {VNode | null}
 */
export function PredictedWords (): VNode | null {
  const { payloads, caretPosition } = changeEncodingContents.value;
  const { show, maxSuggestions } = adaptivePaletteGlobals.config.wordPrediction;
  const modelWords = modelWordsSignal.value;

  if (!show) {
    return null;
  }

  // Predict from the message up to the caret: the words after it are not context for what
  // is about to be inserted.
  const precedingLabels = payloads.slice(0, caretPosition + 1).map((payload) => payload.label);
  const historySuggestions = predictNext(precedingLabels, maxSuggestions);

  // Stop showing the status message when the user changes the message.
  const contextKey = contextKeyOf(payloads, caretPosition);
  const modelSuggestions = modelWords.status === "ready" && modelWords.contextKey === contextKey
    ? modelWords.payloads
    : [];
  const isQuerying = modelWords.status === "working" && modelWords.contextKey === contextKey;
  const suggestions = [...historySuggestions, ...modelSuggestions];

  const chooseWord = (suggestion: SymbolEncodingType): void => {
    const { payloads: currentPayloads, caretPosition: currentCaret } = changeEncodingContents.value;
    // A fresh copy each time: the stored payload is shared with the log and with any later
    // suggestion of the same word, and adding a modifier to it must not reach back into them.
    changeEncodingContents.value = insertWordAtCaret({ ...suggestion }, currentPayloads, currentCaret);
    speak(suggestion.label);
  };

  // Every slot is drawn, whether or not there is a word for it, so the row keeps one shape and
  // each word keeps the same place in it from one symbol to the next. An unfilled slot is an
  // empty cell: there is nothing there to press, and nothing for a screen reader to announce.
  const cells = Array.from({ length: maxSuggestions }, (ignored, index) => {
    const suggestion = suggestions[index];
    return suggestion
      ? html`
        <button
          key=${index}
          class="predictedWord"
          onClick=${() => chooseWord(suggestion)}>
          <${BlissSymbol}
            composition=${suggestion.composition}
            label=${suggestion.label}
            isPresentation=true
          />
        </button>
      `
      : html`<div key=${index} class="predictedWord predictedWordEmpty" aria-hidden="true"></div>`;
  });

  // The wait and the arrival are both reported. A failed query says nothing, and neither does
  // a message the user has finished with.
  const statusText = !showModelStatusSignal.value ? ""
    : isQuerying ? QUERYING_MESSAGE
      : modelSuggestions.length > 0 ? moreSuggestionsMessage(modelSuggestions.length) : "";

  return html`
    <div class="predictedWordsArea">
      <p class="statusMessage" role="status">${statusText}</p>
      <div
        class="predictedWords"
        role="group"
        aria-label=${PREDICTED_WORDS_LABEL}
        style="grid-template-columns: repeat(${maxSuggestions}, 1fr);">
        ${cells}
      </div>
    </div>
  `;
}
