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
import { useState } from "preact/hooks";

import {
  adaptivePaletteGlobals, currentTelegraphicMessage, sentenceCompletionsSignal
} from "./GlobalData";
import { BlissSymbolInfoType, LayoutInfoType } from "./index.d";
import { BlissSymbol } from "./BlissSymbol";
import { generateGridStyle, speak, normalizeComposition } from "./GlobalUtils";
import { requestSentences } from "./telegraphicTranslationUtils";
import { saveSentenceRecord } from "./sentenceLog";
import "./CommandMakeSentence.scss";

export const MAKE_SENTENCE_LABEL = "Make a sentence";

type CommandMakeSentenceProps = {
  id: string,
  options: LayoutInfoType & Partial<BlissSymbolInfoType> & {
    label: string,
    ariaControls?: string
  }
};

/**
 * The trigger for telegraphic translation: a full-width cell below the message row of the
 * input area. It renders nothing at all when the feature is unavailable, so a device with
 * no Ollama models never shows a button that cannot work. It shows the Bliss symbol from
 * its `composition`, falling back to the text label alone when the palette gives none.
 * @param {CommandMakeSentenceProps} props - The cell id and its palette options.
 * @returns {VNode | null}
 */
export function CommandMakeSentence (props: CommandMakeSentenceProps): VNode | null {
  const { id, options } = props;
  const { label, composition, columnStart, columnSpan, rowStart, rowSpan, ariaControls } = options;
  const [isFetching, setIsFetching] = useState(false);
  const telegraphicMessage = currentTelegraphicMessage();

  if (adaptivePaletteGlobals.LLMs.length === 0 ||
      !adaptivePaletteGlobals.config.telegraphicTranslation) {
    return null;
  }

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  // Marked unavailable rather than `disabled`: a truly disabled button loses focus the
  // instant it is disabled, which costs a switch or eye-gaze user their scan position in
  // the middle of the interaction. `aria-disabled` says the same thing to assistive
  // technology while keeping the element focusable; the guard below does the blocking.
  const cannotRun = isFetching || telegraphicMessage.trim().length === 0;

  const makeSentences = async (): Promise<void> => {
    if (cannotRun) {
      return;
    }
    setIsFetching(true);
    sentenceCompletionsSignal.value = { status: "working", telegraphicMessage };
    try {
      const { sentences, model } = await requestSentences(telegraphicMessage);
      // If user edits the input sentence while the model query is in progress, resets the signal
      // to `idle`. The reply belongs to a message the user has changed, so it must not appear.
      if (sentenceCompletionsSignal.peek().status !== "working") {
        return;
      }
      sentenceCompletionsSignal.value = { status: "ready", sentences, model, telegraphicMessage };

      // Single-sentence mode: speak without waiting for a tap, and log it as auto-spoken
      // rather than chosen -- nobody confirmed it.
      if (adaptivePaletteGlobals.config.telegraphicTranslation?.numSentences === 1) {
        speak(sentences[0]);
        saveSentenceRecord({
          telegraphicMessage,
          model,
          candidates: sentences,
          sentence: sentences[0],
          source: "auto"
        });
      }
    } catch (error) {
      console.error(`Could not make sentences: ${String(error)}`);
      if (sentenceCompletionsSignal.peek().status === "working") {
        sentenceCompletionsSignal.value = { status: "error" };
      }
    } finally {
      setIsFetching(false);
    }
  };

  return html`
    <button
      id="${id}"
      class="btn-makeSentence"
      style="${gridStyles}"
      aria-controls=${ariaControls}
      aria-disabled=${cannotRun}
      onClick=${() => void makeSentences()}>
      ${composition
    ? html`<${BlissSymbol}
          composition=${normalizeComposition(composition)}
          label=${label}
          isPresentation=true
        />`
    : label}
    </button>
  `;
}
