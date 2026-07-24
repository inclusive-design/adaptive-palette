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
import { BlissSymbolInfoType, LayoutInfoType } from "./index.d";
import { BlissSymbol } from "./BlissSymbol";
import { changeEncodingContents } from "./GlobalData";
import { generateGridStyle, speak } from "./GlobalUtils";
import { findIndicators, findClassifierFromLeft } from "./SvgUtils";
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
  const disabled = changeEncodingContents.value.caretPosition === -1;

  const cellClicked = () => {
    // Get the symbol at the caret position in the editing area and find the
    // locations within it to replace any existing indicator.
    const { caretPosition, payloads } = changeEncodingContents.value;
    const symbolToEdit = payloads[caretPosition];
    let newComposition = symbolToEdit.composition;
    if (Array.isArray(newComposition)) {
      const indicatorPositions = findIndicators(newComposition);
      const classifierIndex = findClassifierFromLeft(newComposition);
      // If there are no indicators on the symbol, then place the indicator
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
    payloads[caretPosition] = {
      // TODO:  what should the following two fields be?  For now the ID is
      // the combination of the previous symbol plus the indicator.  The label
      // is the same as before, but is spoken aloud with the indicator label.
      "id": symbolToEdit.id + props.id,
      "label": symbolToEdit.label,
      "composition": newComposition,
      "modifierInfo": symbolToEdit.modifierInfo
    };
    changeEncodingContents.value = {
      payloads: payloads,
      caretPosition: caretPosition
    };
    speak(`${symbolToEdit.label}, ${props.options.label}`);
  };

  return html`
    <button id="${props.id}" class="actionIndicatorCell" style="${gridStyles}" onClick=${cellClicked} disabled="${disabled}">
      <${BlissSymbol}
        composition=${indicatorId}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}
