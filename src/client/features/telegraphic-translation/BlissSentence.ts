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
import { useMemo } from "preact/hooks";
import { BlissSymbol } from "../../components/BlissSymbol";
import { blissSlots, spanSlots } from "./BlissSentenceUtils";
import type { SentenceSpanType } from "../../index.d";
import type { Language } from "../../i18n/I18n";
import "./BlissSentence.scss";

export const BLISS_SENTENCE_CLASS = "blissSentence";

type BlissSentencePropsType = {
  sentence: string,
  // The model's words, for a sentence in a language `compromise` cannot parse.
  words?: SentenceSpanType[],
  language: Language
};

/**
 * The row of Bliss symbols for one sentence, drawn above the sentence itself.
 *
 * Each symbol is labelled with the words it covers, so a reader can see which words it
 * accounted for. A span with no symbol is shown as plain text rather than dropped.
 *
 * The whole row is `aria-hidden`: it sits inside the sentence choice button, and its labels
 * would otherwise be read as part of that button's name. The sentence beside it is
 * what a screen reader announces.
 *
 * The slots are memoized on the sentence because `SentenceChoices` re-renders on every
 * keystroke in its text box, and re-parsing every sentence per keystroke is wasteful.
 * @param {BlissSentencePropsType} props - The sentence to draw.
 * @returns {VNode}
 */
export function BlissSentence (props: BlissSentencePropsType): VNode {
  const slots = useMemo(
    () => props.words ? spanSlots(props.words, props.language) : blissSlots(props.sentence),
    [props.sentence, props.words, props.language]
  );
  return html`
    <span class="${BLISS_SENTENCE_CLASS}" aria-hidden="true">
      ${slots.map((slot, index) => slot.payload
    ? html`
          <span key=${index} class="blissSentenceSlot">
            <${BlissSymbol}
              composition=${slot.payload.composition}
              label=${slot.text}
              isPresentation="true"
            />
          </span>`
    : html`
          <span key=${index} class="blissSentenceSlot blissSentenceTextOnly">${slot.text}</span>`
  )}
    </span>
  `;
}
