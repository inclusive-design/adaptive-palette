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

import { adaptivePaletteGlobals, changeEncodingContents } from "../../state/GlobalData";
import { saveMessageRecord } from "../../core/MessageLog";
import {
  currentTelegraphicMessage, makeSentences, sentenceCompletionsSignal
} from "./TelegraphicTranslationState";
import { dismissModelStatus } from "../word-prediction/WordPredictionState";
import { BlissSymbolInfoType, LayoutInfoType } from "../../index.d";
import { BlissSymbol } from "../../components/BlissSymbol";
import { generateGridStyle } from "../../utils/GridUtils";
import { normalizeComposition } from "../../utils/SymbolEncodingUtils";
import { speakUnavailable } from "../../utils/SpeechUtils";
import "./CommandMakeSentence.scss";

type CommandMakeSentenceProps = {
  id: string,
  options: LayoutInfoType & Partial<BlissSymbolInfoType> & {
    label: string,
    ariaControls?: string
  }
};

/**
 * This button is the entry point to trigger telegraphic translation. It renders nothing when
 * the feature is unavailable for example when no model is available.
 * @param {CommandMakeSentenceProps} props - The cell id and its palette options.
 * @returns {VNode | null}
 */
export function CommandMakeSentence (props: CommandMakeSentenceProps): VNode | null {
  const { id, options } = props;
  const { label, composition, columnStart, columnSpan, rowStart, rowSpan, ariaControls } = options;
  const isFetching = sentenceCompletionsSignal.value.status === "working";
  const telegraphicMessage = currentTelegraphicMessage();

  if (adaptivePaletteGlobals.models.length === 0 ||
      !adaptivePaletteGlobals.config.telegraphicTranslation) {
    return null;
  }

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  // Marked unavailable rather than `disabled`: a disabled button loses focus when
  // it is disabled, which costs a switch or eye-gaze user loses their scan position in
  // the middle of the interaction. `aria-disabled` says the same thing to assistive
  // technology while keeping the element focusable.
  const cannotRun = isFetching || telegraphicMessage.trim().length === 0;

  return html`
    <button
      id="${id}"
      class="btn-makeSentence"
      style="${gridStyles}"
      aria-controls=${ariaControls}
      aria-disabled=${cannotRun}
      onClick=${() => {
    if (cannotRun) {
      speakUnavailable(label);
      return;
    }
    // Asking for a sentence means the message is finished, so save it.
    saveMessageRecord(changeEncodingContents.value.payloads);
    // The message is finished, so the row stops reporting on it. Its words stay usable.
    dismissModelStatus();
    void makeSentences(telegraphicMessage);
  }}>
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
