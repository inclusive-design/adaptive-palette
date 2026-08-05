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

import { MatchType } from "./index.d";
import { BlissSymbol } from "./BlissSymbol";
import "./GlossSearchResults.scss";

export const SELECTED_TEXT = "✓ selected";

type GlossSearchResultsProps = {
  matches: MatchType[],
  selectedId: number | null,
  onSelect: (match: MatchType) => void
};

/**
 * Render one selectable result cell.
 *
 * `aria-pressed` is toggle semantics used for a single-select list. `aria-selected` and
 * `aria-checked` would be more literal, but both require a `listbox`, `radiogroup` or
 * `grid` ancestor role, and adopting one of those would replace the per-result tab stops
 * with roving-tabindex arrow-key traversal -- worse for switch scanning.
 * @param {MatchType} match - The symbol this cell offers.
 * @param {boolean} isSelected - Whether this cell is the current selection.
 * @param {Function} onSelect - Called with `match` when the cell is activated.
 * @returns {VNode}
 */
function resultCell (
  match: MatchType,
  isSelected: boolean,
  onSelect: (match: MatchType) => void
): VNode {
  return html`
    <button
      type="button"
      key=${match.id}
      class="glossSearchResult"
      aria-pressed=${isSelected}
      onClick=${() => onSelect(match)}>
      <${BlissSymbol}
        composition=${match.composition ?? match.id}
        label=${match.label}
        isPresentation="true"
      />
      <span class="glossSearchResultSelected">${SELECTED_TEXT}</span>
    </button>
  `;
}

/**
 * The grid of symbols matching the current search. Each result is its own tab stop
 * rather than one roving-tabindex radiogroup, because a stop per result suits switch
 * scanning better than arrow-key traversal.
 * @param {GlossSearchResultsProps} props - Matches, current selection, and callback.
 * @returns {VNode}
 */
export function GlossSearchResults (props: GlossSearchResultsProps): VNode {
  const { matches, selectedId, onSelect } = props;

  return html`
    <div class="glossSearchResults">
      ${matches.map((match) => resultCell(match, match.id === selectedId, onSelect))}
    </div>
  `;
}
