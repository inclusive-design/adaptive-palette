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
import { BlissSymbolInfoType, LayoutInfoType, ContentSignalDataType } from "../index.d";
import { BlissSymbol } from "../components/BlissSymbol";
import { changeEncodingContents } from "../state/GlobalData";
import { generateGridStyle } from "../utils/GridUtils";
import { applyModifiersToLabel } from "../utils/SymbolEncodingUtils";
import { announceIfEnabled, speakUnavailable } from "../utils/SpeechUtils";
import { findIndicators } from "../utils/SvgUtils";

type ActionIndicatorCodeCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

/*
 * Given an array of symbols examine the symbol at the caret position to find
 * its indicator, if any.
 * @param {ContentSignalDataType} symbols: Array of symbols and caret position.
 * @return {number} - The index of the indicator in the symbol's BciAvType, or
 *                    -1 if it has no indicator.
 */
function caretSymbolIndicatorPosition (symbols: ContentSignalDataType): number {
  let indicatorPositions: number[] = [];
  const { payloads, caretPosition } = symbols;
  if (payloads.length !== 0 && caretPosition !== -1) {
    const caretSymbolComposition = payloads[caretPosition].composition;
    indicatorPositions = findIndicators(caretSymbolComposition);
  }
  return ( indicatorPositions.length === 0 ? -1 : indicatorPositions[0]);
}

export function ActionRemoveIndicatorCell (props: ActionIndicatorCodeCellPropsType): VNode {
  const {
    columnStart, columnSpan, rowStart, rowSpan, label
  } = props.options;
  const removeIndicatorComposition = props.options.composition;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  // Enable the remove-indicator button only if there is an indicator on the
  // last symbol in the encoding contents array.
  const indicatorPosition = caretSymbolIndicatorPosition(changeEncodingContents.value);
  // Marked unavailable rather than `disabled` so the button keeps its place in the tab
  // order for switch and eye-gaze users.
  const unavailable = indicatorPosition === -1;

  const cellClicked = () => {
    if (unavailable) { speakUnavailable(label); return; }
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
    // `baseLabel` already has any modifier text that existed *before* the indicator was first
    // applied baked into it, so only reapply the modifiers added *after* that point -- tracked
    // by `baseModifierCount`, the length of `modifierInfo` at the moment `baseLabel` was captured.
    const restoredBare = symbolToEdit.baseLabel ?? symbolToEdit.label;
    const modifiersAppliedAfterIndicator = symbolToEdit.modifierInfo?.slice(symbolToEdit.baseModifierCount ?? 0);
    const restoredLabel = applyModifiersToLabel(restoredBare, modifiersAppliedAfterIndicator);
    payloads[caretPosition] = {
      "label": restoredLabel,
      "composition": newComposition,
      "userSelectedSymbolId": symbolToEdit.userSelectedSymbolId,
      "modifierInfo": symbolToEdit.modifierInfo
    };
    changeEncodingContents.value = {
      payloads: payloads,
      caretPosition: caretPosition
    };
    announceIfEnabled(`${restoredLabel}`);
  };

  return html`
    <button id="${props.id}" class="btn-command" style="${gridStyles}" onClick=${cellClicked} aria-disabled=${unavailable}>
      <${BlissSymbol}
        composition=${removeIndicatorComposition}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}
