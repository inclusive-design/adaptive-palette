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
import { AttributeCellType } from "../../index.d";
import { BlissSymbol } from "../../components/BlissSymbol";
import { generateGridStyle } from "../../utils/GridUtils";
import { announceIfEnabled } from "../../utils/SpeechUtils";
import { isAttributeSelected, toggleAttribute } from "./MessageAttributesState";
import "./ActionAttributeCell.scss";

type ActionAttributeCellPropsType = {
  id: string,
  options: AttributeCellType
};

/**
 * One attribute on the attributes palette: a toggle that sets it on the message being composed
 * or takes it off again.
 *
 * The pressed state is read from the signal rather than held here, so leaving the palette and
 * coming back shows what is set with no bookkeeping of its own.
 *
 * Uses `aria-pressed` rather than `aria-selected`/`aria-checked` for the same reason as
 * `resultCell()` in `GlossSearchResults.ts`: either would require a `listbox`, `radiogroup` or
 * `grid` ancestor role, replacing the per-cell tab stops with roving-tabindex arrow-key
 * traversal -- worse for switch scanning.
 * @param {ActionAttributeCellPropsType} props - The cell id and its options.
 * @returns {VNode}
 */
export function ActionAttributeCell (props: ActionAttributeCellPropsType): VNode {
  const { id, options } = props;
  const { label, category, composition, columnStart, columnSpan, rowStart, rowSpan } = options;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  const attribute = { category, label, composition };
  const isSelected = isAttributeSelected(attribute);
  // The category is in the name because the symbol and the label alone do not say which row
  // the button came from, and two rows may one day share a label.
  const accessibleName = `${category}: ${label}`;

  const cellClicked = (): void => {
    toggleAttribute(attribute);
    // Read after the toggle rather than closing over `isSelected`: reading `.value` in an
    // event handler creates no subscription, so this is safe, and it says what actually
    // happened instead of relying on a re-render having already landed.
    announceIfEnabled(`${accessibleName}, ${isAttributeSelected(attribute) ? "on" : "off"}`);
  };

  return html`
    <button
      id="${id}"
      class="actionAttributeCell"
      style="${gridStyles}"
      aria-label="${accessibleName}"
      aria-pressed=${isSelected}
      onClick=${cellClicked}>
      <${BlissSymbol} composition=${composition} label=${label} isPresentation="true" />
    </button>
  `;
}
