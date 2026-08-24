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
import "./AiBadge.scss";

/**
 * The badge's visible text. Short, because it sits in a palette-sized cell.
 */
export const AI_BADGE_TEXT = "AI";

/**
 * The accessible name for a suggestion a model made. The badge is hidden from screen readers
 * because "AI" read on its own is easy to mishear, so the fuller phrase is used instead.
 * @param {string} text - The suggestion's own text: a word's label, a sentence, or an indicator label.
 * @returns {string}
 */
export function aiSuggestionLabel (text: string): string {
  return `AI suggestion, ${text}`;
}

/**
 * The badge marking a suggestion as a model's. Always `aria-hidden`, because "AI" announced
 * beside the suggestion reads poorly. A suggested word and a sentence make up for it with an
 * `aria-label` from `aiSuggestionLabel()` on the button carrying them. An indicator label does
 * not: assistive technology reading the composed message back gets the label alone, deliberately,
 * and the announcement spoken as the label lands carries where it came from instead.
 * @returns {VNode}
 */
export function AiBadge (): VNode {
  return html`<span class="aiBadge" aria-hidden="true">${AI_BADGE_TEXT}</span>`;
}
