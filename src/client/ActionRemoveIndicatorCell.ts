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
import { BlissSymbolInfoType, EncodingType, LayoutInfoType } from "./index.d";
import { BlissSymbol } from "./BlissSymbol";
import { changeEncodingContents } from "./GlobalData";
import { generateGridStyle, speak } from "./GlobalUtils";
import { findIndicators } from "./SvgUtils";
import "./ActionIndicatorCell.scss";

type ActionIndicatorCodeCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

/*
 * Given an array of symbols, find the position of the last symbol's indicator
 * if any.
 * @param {Array<EncodingType} symbolArray: Array of symbol encodings
 * @return {number} - The index of the indicator in the symbols BciAvType, or
 *                    -1 if there is no indicator.
 */
function lastSymbolIndicatorPosition (symbolArray: Array<EncodingType>): number {
  let indicatorPositions = [];
  if (symbolArray.length !== 0) {
    const lastSymbolBciAvId = symbolArray[symbolArray.length-1].bciAvId;
    indicatorPositions = findIndicators(lastSymbolBciAvId);
  }
  return ( indicatorPositions.length === 0 ? -1 : indicatorPositions[0]);
}

export function ActionRemoveIndicatorCell (props: ActionIndicatorCodeCellPropsType): VNode {
  const {
    columnStart, columnSpan, rowStart, rowSpan, label
  } = props.options;
  const removeIndicatorBciAvId = props.options.bciAvId;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  // Enable the remove-indicator button only if there is an indicator on the
  // last symbol in the encoding contents array.
  const indicatorPosition = lastSymbolIndicatorPosition(changeEncodingContents.value.payloads);
  const disabled = indicatorPosition === -1;

  const cellClicked = () => {
    // Get the last symbol in the editing area and find the location of any
    // existing indicator to remove.
    const indicatorIndex = lastSymbolIndicatorPosition(changeEncodingContents.value.payloads);
    const allButLastSymbol = [...changeEncodingContents.value.payloads];
    const lastSymbol = allButLastSymbol.pop();
    let newBciAvId = lastSymbol.bciAvId;
    newBciAvId = [
      ...newBciAvId.slice(0, indicatorIndex-1),
      ...newBciAvId.slice(indicatorIndex+1)
    ];
    const payload = {
      "id": lastSymbol.id + props.id,
      "label": lastSymbol.label,
      "bciAvId": newBciAvId,
      "modifierInfo": lastSymbol.modifierInfo
    };
    changeEncodingContents.value.payloads = [...allButLastSymbol, payload];
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
