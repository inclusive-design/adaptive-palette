/*
 * Copyright 2024-2025 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
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
  const indicatorBciAvId = props.options.bciAvId;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  const cellClicked = () => {
    // Get the last symbol in the editing area and find the locations to replace
    // any existing indicator.
    const allButLastSymbol = [...changeEncodingContents.value];
    const lastSymbol = allButLastSymbol.pop();
    let newBciAvId = lastSymbol.bciAvId;
    if (newBciAvId.constructor === Array) {
      const indicatorPositions = findIndicators(newBciAvId);
      const classifierIndex = findClassifierFromLeft(newBciAvId);
      // If there are no indicators on the symbol, then place the indicator
      // above the first symbol that is not a modifier.  Otherwise, replace the
      // current indicator with the new one at the same position.
      // 1. `classifierIndex` is the index of the classifier in the array,
      // 2. the next index is the separator between the classifier and the next
      //    symbol, e.g., "/": `classifierIndex+1`,
      // 3. insert the ";" separator for indicators followed by the indicator id,
      // 4. insert the rest of the array as it was.
      if (indicatorPositions.length === 0) {
        newBciAvId = [
          ...newBciAvId.slice(0, classifierIndex+1),
          ";", indicatorBciAvId,
          ...newBciAvId.slice(classifierIndex+1)
        ];
      }
      indicatorPositions.forEach((position) => {
        newBciAvId[position] = indicatorBciAvId;
      });
    }
    // The BCI AV ID is a single identifier, not an svg builder array.
    else {
      newBciAvId = [ newBciAvId, ";", indicatorBciAvId ];
    }
    const payload = {
      // TODO:  what should the following two fields be?  For now the ID is
      // the combination of the previous symbol plus the indicator.  The label
      // is the same as before, but is spoken aloud with the indicator label.
      "id": lastSymbol.id + props.id,
      "label": lastSymbol.label,
      "bciAvId": newBciAvId
    };
    changeEncodingContents.value = [...allButLastSymbol, payload];
    speak(`${lastSymbol.label}, ${props.options.label}`);
  };

  return html`
    <button id="${props.id}" class="actionIndicatorCell" style="${gridStyles}" onClick=${cellClicked}>
      <${BlissSymbol}
        bciAvId=${indicatorBciAvId}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}
