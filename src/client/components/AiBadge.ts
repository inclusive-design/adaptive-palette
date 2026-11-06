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
import { t } from "../i18n/I18n";
import { adaptivePaletteGlobals } from "../state/GlobalData";
import type { SymbolEncodingType } from "../index.d";
import "./AiBadge.scss";

/**
 * The accessible name for a suggestion a model made. The badge is hidden from screen readers
 * because "AI" read on its own is easy to mishear, so the fuller phrase is used instead.
 * @param {string} text - The suggestion's own text: a word's label, a sentence, or an indicator label.
 * @returns {string}
 */
export function aiSuggestionLabel (text: string): string {
  return t("aiSuggestion", { text });
}

/**
 * What a cell says after changing a symbol's label: the label, as a model's suggestion when it
 * is one and marking is on.
 * @param {SymbolEncodingType} payload - The changed symbol.
 * @returns {string}
 */
export function spokenLabel (payload: SymbolEncodingType): string {
  return payload.isAiLabel && adaptivePaletteGlobals.config.markAiSuggestions
    ? aiSuggestionLabel(payload.label)
    : payload.label;
}

/**
 * The badge marking a suggestion as a model's. Always `aria-hidden`, because "AI" announced
 * beside the suggestion reads poorly. A suggested word and a sentence make up for it with an
 * `aria-label` from `aiSuggestionLabel()` on the button carrying them. A symbol's label in the
 * message does not: assistive technology reading the message back gets the label alone,
 * deliberately. A cell that changes a label says where it came from as it announces it
 * (`spokenLabel()`); a model's answer that arrives later is not announced.
 * @returns {VNode}
 */
export function AiBadge (): VNode {
  return html`<span class="aiBadge" aria-hidden="true">${t("aiBadge")}</span>`;
}
