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
  adaptivePaletteGlobals, changeEncodingContents, finishedMessageSignal, settingsSavedCount
} from "../../state/GlobalData";
import { messageText } from "../../core/MessageLog";
import { editMessage } from "../../core/MessageEdit";
import { AiBadge, aiSuggestionLabel } from "../../components/AiBadge";
import { BlissSymbol } from "../../components/BlissSymbol";
import { insertWordAtCaret } from "../../utils/SymbolEncodingUtils";
import { announceIfEnabled } from "../../utils/SpeechUtils";
import { isModelTierActive, predictNext } from "./WordPredictionUtils";
import { messageUpToCaret, queryContextKeyOf, modelWordsSignal } from "./WordPredictionState";
import { ContentPredictedWordsType, SymbolEncodingType } from "../../index.d";
import { generateGridStyle } from "../../utils/GridUtils";
import { Language, MODEL_LANGUAGE, languageSignal, t } from "../../i18n/I18n";
import "./PredictedWords.scss";

/**
 * What the status region says when words from the model reach the row.
 * @param {number} count - How many words arrived.
 * @returns {string}
 */
export function moreSuggestionsMessage (count: number): string {
  return count === 1 ? t("predictionMoreOne") : t("predictionMoreMany", { count });
}

type PredictedWordsPropsType = {
  id: string,
  options: ContentPredictedWordsType
};

/**
 * The suggested next words, the `ContentPredictedWords` cell. Each word is shown as a Bliss
 * symbol with its label, in `numColumns` columns: one row when the palette does not say.
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
 * @param {PredictedWordsPropsType} props - The cell id and its options.
 * @returns {VNode | null}
 */
export function PredictedWords (props: PredictedWordsPropsType): VNode | null {
  // Read so this draws again after a save. See `settingsSavedCount`.
  void settingsSavedCount.value;
  const { payloads, caretPosition } = changeEncodingContents.value;
  const { show, maxSuggestions } = adaptivePaletteGlobals.config.wordPrediction;
  const { columnStart, columnSpan, rowStart, rowSpan, numColumns } = props.options;
  const markAiSuggestions = adaptivePaletteGlobals.config.markAiSuggestions;
  const modelWords = modelWordsSignal.value;

  if (!show) {
    return null;
  }

  // Predict from the message up to the caret: the words after it are not context for what
  // is about to be inserted.
  const precedingLabels = payloads.slice(0, caretPosition + 1).map((payload) => payload.label);
  const historySuggestions = predictNext(precedingLabels, maxSuggestions);

  // Stop showing the status message when the user changes the message or its attributes -- the
  // model was asked under the combined key, so the row has to compare against that same key.
  const contextKey = queryContextKeyOf(messageUpToCaret(payloads, caretPosition));
  // Checked here too: model words already shown stay in the signal after a save turns the model off.
  const modelSuggestions =
    isModelTierActive() && modelWords.status === "ready" && modelWords.contextKey === contextKey
      ? modelWords.payloads
      : [];
  const isQuerying = modelWords.status === "working" && modelWords.contextKey === contextKey;
  const suggestions = [...historySuggestions, ...modelSuggestions];

  // A model word is English (`MODEL_LANGUAGE`); a word from the history is in the user's own
  // language, so it takes the UI language.
  const chooseWord = (suggestion: SymbolEncodingType, language?: Language): void => {
    const { payloads: currentPayloads, caretPosition: currentCaret } = changeEncodingContents.value;
    // A fresh copy each time.
    editMessage(insertWordAtCaret(structuredClone(suggestion), currentPayloads, currentCaret));
    announceIfEnabled(suggestion.label, language);
  };

  // Every slot is drawn, whether or not there is a word for it, so the row keeps one shape and
  // each word keeps the same place in it from one symbol to the next. An unfilled slot is an
  // empty cell: there is nothing there to press, and nothing for a screen reader to announce.
  //
  // The model's words are appended after the ones the history found, so a slot past the
  // history's count is the model's, and is marked when the setting asks for it.
  const cells = Array.from({ length: maxSuggestions }, (ignored, index) => {
    const suggestion = suggestions[index];
    if (!suggestion) {
      return html`<div key=${index} class="predictedWord predictedWordEmpty" aria-hidden="true"></div>`;
    }
    const isModelWord = index >= historySuggestions.length;
    const isMarked = markAiSuggestions && isModelWord;
    const language = isModelWord ? MODEL_LANGUAGE : undefined;
    return html`
      <button
        key=${index}
        lang=${language}
        class=${isMarked ? "predictedWord aiSuggestion" : "predictedWord"}
        aria-label=${isMarked ? aiSuggestionLabel(suggestion.label) : undefined}
        onClick=${() => chooseWord(suggestion, language)}>
        ${isMarked ? html`<${AiBadge} />` : null}
        <${BlissSymbol}
          composition=${suggestion.composition}
          label=${suggestion.label}
          isPresentation=true
        />
      </button>
    `;
  });

  // The wait and the arrival are both reported. A failed query says nothing, and neither does
  // a message the user has finished with.
  // The length check keeps an empty message with nothing finished from counting as finished,
  // matching the guard in `WordPredictionState.ts`.
  const finishedMessage = finishedMessageSignal.value;
  const isFinished = finishedMessage.length > 0 && messageText(payloads) === finishedMessage;
  const statusText = isFinished ? ""
    : isQuerying ? t("predictionQuerying")
      : modelSuggestions.length > 0 ? moreSuggestionsMessage(modelSuggestions.length) : "";

  return html`
    <div
      id="${props.id}"
      class="predictedWordsArea"
      style="${generateGridStyle(columnStart, columnSpan, rowStart, rowSpan)}">
      <p class="statusMessage" lang=${languageSignal.value} role="status">${statusText}</p>
      <div
        class="predictedWords"
        role="group"
        aria-label=${t("predictedWords")}
        style="grid-template-columns: repeat(${numColumns ?? maxSuggestions}, minmax(0, 1fr));">
        ${cells}
      </div>
    </div>
  `;
}
