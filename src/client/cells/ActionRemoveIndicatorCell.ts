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

import type { VNode } from "preact";
import { html } from "htm/preact";
import type { BlissSymbolInfoType, LayoutInfoType, ContentSignalDataType } from "../index.d";
import { CommandButton } from "../components/CommandButton";
import { spokenLabel } from "../components/AiBadge";
import { changeEncodingContents, wordBuildSignal } from "../state/GlobalData";
import { editSymbolAtCaret } from "../core/MessageEdit";
import { caretComposition } from "../utils/SymbolEncodingUtils";
import { announceIfEnabled } from "../utils/SpeechUtils";
import { findWordIndicators } from "../utils/SvgUtils";
import { baseOf, relabel } from "../core/SymbolLabelUtils";

type ActionIndicatorCodeCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

/*
 * Given an array of symbols examine the symbol at the caret position to find
 * its indicator, if any. A picture has none.
 * @param {ContentSignalDataType} symbols: Array of symbols and caret position.
 * @return {number} - The index of the indicator in the symbol's composition, or
 *                    -1 if it has no indicator.
 */
function caretSymbolIndicatorPosition (symbols: ContentSignalDataType): number {
  const composition = caretComposition(symbols);
  const indicatorPositions = composition === undefined ? [] : findWordIndicators(composition);
  return ( indicatorPositions.length === 0 ? -1 : indicatorPositions[0]);
}

export function ActionRemoveIndicatorCell (props: ActionIndicatorCodeCellPropsType): VNode {
  const { label } = props.options;

  // Enable the remove-indicator button only if there is an indicator on the
  // symbol at the caret.
  const indicatorPosition = caretSymbolIndicatorPosition(changeEncodingContents.value);
  // Not available while a new word is being built.
  const unavailable = indicatorPosition === -1 || wordBuildSignal.value !== null;

  const cellClicked = () => {
    // Get the symbol at the caret position in the editing area and find the
    // locations within it to replace any existing indicator.
    const { caretPosition, payloads } = changeEncodingContents.value;
    const indicatorIndex = caretSymbolIndicatorPosition(changeEncodingContents.value);
    const symbolToEdit = payloads[caretPosition];
    let newComposition = symbolToEdit.composition;
    const newCompositionArr = newComposition as (string|number)[];
    // A ";" normally precedes the indicator (added when it was applied) and
    // must be removed along with it. Malformed hand-authored palette JSON
    // could place an indicator with no preceding ";" -- guard rather than
    // blindly consuming one extra element.
    const hasSeparator = indicatorIndex > 0 && newCompositionArr[indicatorIndex - 1] === ";";
    newComposition = hasSeparator
      ? [
        ...newCompositionArr.slice(0, indicatorIndex - 1),
        ...newCompositionArr.slice(indicatorIndex + 1)
      ]
      : [
        ...newCompositionArr.slice(0, indicatorIndex),
        ...newCompositionArr.slice(indicatorIndex + 1)
      ];
    // The label comes from the symbol's parts. Without the indicator, that is the modifiers'
    // text joined to the base label, or the model's word for them.
    const edited = relabel({
      "label": symbolToEdit.label,
      "composition": newComposition,
      "userSelectedSymbolId": symbolToEdit.userSelectedSymbolId,
      "modifierInfo": symbolToEdit.modifierInfo,
      ...baseOf(symbolToEdit)
    });
    if (!editSymbolAtCaret(edited, label)) {
      return;
    }
    announceIfEnabled(spokenLabel(edited));
  };

  return html`
    <${CommandButton} id=${props.id} options=${props.options} unavailable=${unavailable} onClick=${cellClicked} />
  `;
}
