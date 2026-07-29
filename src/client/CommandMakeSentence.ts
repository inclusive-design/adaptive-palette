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

import { adaptivePaletteGlobals } from "./GlobalData";
import {
  currentTelegraphicMessage, makeSentences, sentenceCompletionsSignal
} from "./TelegraphicTranslationState";
import { BlissSymbolInfoType, LayoutInfoType } from "./index.d";
import { BlissSymbol } from "./BlissSymbol";
import { generateGridStyle, normalizeComposition } from "./GlobalUtils";
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

  if (adaptivePaletteGlobals.LLMs.length === 0 ||
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
      onClick=${() => void makeSentences(telegraphicMessage)}>
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
