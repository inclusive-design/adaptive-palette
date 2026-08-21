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
import { blissSlots } from "./BlissSentenceUtils";
import "./BlissSentence.scss";

export const BLISS_SENTENCE_CLASS = "blissSentence";

type BlissSentencePropsType = {
  sentence: string
};

/**
 * The row of Bliss symbols for one English sentence, drawn above the sentence itself.
 *
 * Each symbol is labelled with the English span it covers, so a reader can see which words it
 * accounted for. A span with no symbol is shown as plain text rather than dropped.
 *
 * The whole row is `aria-hidden`: it sits inside the sentence choice button, and its labels
 * would otherwise be read as part of that button's name. The English sentence beside it is
 * what a screen reader announces.
 *
 * The slots are memoized on the sentence because `SentenceChoices` re-renders on every
 * keystroke in its text box, and re-parsing every sentence per keystroke is wasteful.
 * @param {BlissSentencePropsType} props - The sentence to draw.
 * @returns {VNode}
 */
export function BlissSentence (props: BlissSentencePropsType): VNode {
  const slots = useMemo(() => blissSlots(props.sentence), [props.sentence]);
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
