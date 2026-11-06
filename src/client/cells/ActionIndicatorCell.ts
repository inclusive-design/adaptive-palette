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
import { BlissSymbolInfoType, LayoutInfoType } from "../index.d";
import { BlissSymbol } from "../components/BlissSymbol";
import { spokenLabel } from "../components/AiBadge";
import { changeEncodingContents, wordBuildSignal } from "../state/GlobalData";
import { editMessage } from "../core/MessageEdit";
import { generateGridStyle } from "../utils/GridUtils";
import { caretComposition, replaceAtCaret } from "../utils/SymbolEncodingUtils";
import { announceIfEnabled, speakUnavailable } from "../utils/SpeechUtils";
import { findWordIndicators, findClassifierFromLeft } from "../utils/SvgUtils";
import { getStaticNewLabel, relabel } from "../utils/SymbolLabelUtils";
import "./ActionIndicatorCell.scss";

type ActionIndicatorCodeCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

export function ActionIndicatorCell (props: ActionIndicatorCodeCellPropsType): VNode {
  const {
    columnStart, columnSpan, rowStart, rowSpan, label
  } = props.options;
  const indicatorId = props.options.composition as number;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  // Marked unavailable rather than `disabled` so the button keeps its place in the tab
  // order for switch and eye-gaze users. A picture at the caret takes no indicator, and
  // neither does the message while a new word is being built.
  const caretSymbolComposition = caretComposition(changeEncodingContents.value);
  const unavailable = caretSymbolComposition === undefined || wordBuildSignal.value !== null;

  const cellClicked = () => {
    if (unavailable || caretSymbolComposition === undefined) { speakUnavailable(label); return; }
    // Get the symbol at the caret position in the editing area and find the
    // locations within it to replace any existing indicator.
    const { caretPosition, payloads } = changeEncodingContents.value;
    const symbolToEdit = payloads[caretPosition];
    let newComposition = caretSymbolComposition;
    if (Array.isArray(newComposition)) {
      newComposition = [...newComposition];
      const indicatorPositions = findWordIndicators(newComposition);
      const classifierIndex = findClassifierFromLeft(newComposition);
      // If the word has no indicator of its own, then place the indicator
      // above the first symbol that is not a modifier.  Otherwise, replace the
      // current indicator with the new one at the same position.
      // 1. `classifierIndex` is the index of the classifier in the array,
      // 2. the next index is the separator between the classifier and the next
      //    symbol, e.g., "/": `classifierIndex+1`,
      // 3. insert the ";" separator for indicators followed by the indicator id,
      // 4. insert the rest of the array as it was.
      if (indicatorPositions.length === 0) {
        newComposition = [
          ...newComposition.slice(0, classifierIndex+1),
          ";", indicatorId,
          ...newComposition.slice(classifierIndex+1)
        ];
      }
      indicatorPositions.forEach((position) => {
        (newComposition as (string|number)[])[position] = indicatorId;
      });
    }
    // The composition is a single identifier, not an svg builder array.
    else {
      newComposition = [ newComposition, ";", indicatorId ];
    }
    const edited = relabel({
      "label": symbolToEdit.label,
      "composition": newComposition,
      "userSelectedSymbolId": symbolToEdit.userSelectedSymbolId,
      "modifierInfo": symbolToEdit.modifierInfo,
      "indicatorId": indicatorId,
      "baseLabel": symbolToEdit.baseLabel ?? symbolToEdit.label
    });
    // Held by the guard: the label on screen is unchanged, so name the indicator alongside it.
    if (!editMessage({ payloads: replaceAtCaret(payloads, caretPosition, edited), caretPosition: caretPosition })) {
      announceIfEnabled(`${symbolToEdit.label}, ${label}`);
      return;
    }
    // A label from the table or the model is spoken as it is. One the model is still working out,
    // or has no answer for, is spoken with the indicator's name, so the click says what changed.
    const isNewLabel = edited.pendingLabel === undefined &&
      (edited.isAiLabel || getStaticNewLabel(edited.userSelectedSymbolId, indicatorId) !== undefined);
    announceIfEnabled(isNewLabel ? spokenLabel(edited) : `${edited.label}, ${label}`);
  };

  return html`
    <button id="${props.id}" class="actionIndicatorCell" style="${gridStyles}" onClick=${cellClicked} aria-disabled=${unavailable}>
      <${BlissSymbol}
        composition=${indicatorId}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}
