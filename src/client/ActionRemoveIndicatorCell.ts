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

// Given an array of symbols, find the positions of the last symbol's indicators
// if any.
function lastSymbolIndicatorPositions (symbolArray: Array<EncodingType>) {
  let indicatorPositions = [];
  if (symbolArray.length !== 0) {
    const lastSymbolBciAvId = symbolArray[symbolArray.length-1].bciAvId;
    indicatorPositions = findIndicators(lastSymbolBciAvId);
  }
  return indicatorPositions;
}

export function ActionRemoveIndicatorCell (props: ActionIndicatorCodeCellPropsType): VNode {
  const {
    columnStart, columnSpan, rowStart, rowSpan, label
  } = props.options;
  const removeIndicatorBciAvId = props.options.bciAvId;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  // Enable the remove-indicator button only if there is an indicator on the
  // last symbol in the encoding contents array.
  const indicators = lastSymbolIndicatorPositions(changeEncodingContents.value);
  const disabled = indicators.length === 0;

  const cellClicked = () => {
    // Get the last symbol in the editing area and find the locations of any
    // existing indicator(s) to remove them.
    const allButLastSymbol = [...changeEncodingContents.value];
    const lastSymbol = allButLastSymbol.pop();
    let newBciAvId = lastSymbol.bciAvId;
    const indicatorPositions = findIndicators(newBciAvId);
    indicatorPositions.forEach((position) => {
      newBciAvId = [
        ...newBciAvId.slice(0, position-1),
        ...newBciAvId.slice(position+1)
      ];
    });
    const payload = {
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
