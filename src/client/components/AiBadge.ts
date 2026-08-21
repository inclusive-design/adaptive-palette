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
 * because "AI" read on its own is easy to mishear, so the fuller phrase is spoken instead.
 * @param {string} text - The suggestion's own text: a word's label, or a sentence.
 * @returns {string}
 */
export function aiSuggestionLabel (text: string): string {
  return `AI suggestion, ${text}`;
}

/**
 * The badge marking a suggestion as a model's. Hidden from screen readers: the button carrying
 * it takes an `aria-label` from `aiSuggestionLabel()` instead, which reads better than a badge
 * announced beside the suggestion.
 * @returns {VNode}
 */
export function AiBadge (): VNode {
  return html`<span class="aiBadge" aria-hidden="true">${AI_BADGE_TEXT}</span>`;
}
