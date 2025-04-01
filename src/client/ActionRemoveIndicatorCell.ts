/*
 * Copyright 2025 Inclusive Design Research Centre, OCAD University
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
import { findIndicators, /*findClassifierFromLeft*/ } from "./SvgUtils";
import "./ActionIndicatorCell.scss";

type ActionIndicatorCodeCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

export function ActionRemoveIndicatorCell (props: ActionIndicatorCodeCellPropsType): VNode {
  const {
    columnStart, columnSpan, rowStart, rowSpan, label
  } = props.options;
  const removeIndicatorBciAvId = props.options.bciAvId;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  const disabled = changeEncodingContents.value.length === 0;

  const cellClicked = () => {
    // Get the last symbol in the editing area and find the locations to replace
    // any existing indicator.
    const allButLastSymbol = [...changeEncodingContents.value];
    const lastSymbol = allButLastSymbol.pop();
    let newBciAvId = lastSymbol.bciAvId;
    if (newBciAvId.constructor === Array) {
      // 1. `classifierIndex` is the index of the classifier in the array,
      // 2. the next index is the separator between the classifier and the next
      //    symbol, e.g., "/": `classifierIndex+1`,
      // 3. insert the ";" separator for indicators followed by the indicator id,
      // 4. insert the rest of the array as it was.
      const indicatorPositions = findIndicators(newBciAvId);
      //const classifierIndex = findClassifierFromLeft(newBciAvId);
      // If there are no indicators on the symbol, then do nothing -- nothing to
      // remove.
      if (indicatorPositions.length !== 0) {
        indicatorPositions.forEach((position) => {
          newBciAvId = [
            ...newBciAvId.slice(0, position-1),
            ...newBciAvId.slice(position+1)
          ];
        });
      }
    }
    // The BCI AV ID is a single identifier, can't remove any indicator without
    // decomposing it (TODO).
    else {
    //  newBciAvId = [ newBciAvId, ";", removeIndicatorBciAvId ];
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
    speak(`${lastSymbol.label}`);
  };

  return html`
    <button id="${props.id}" class="actionIndicatorCell" style="${gridStyles}" onClick=${cellClicked} disabled="${disabled}">
      <${BlissSymbol}
        bciAvId=${removeIndicatorBciAvId}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}
