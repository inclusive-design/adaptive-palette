/*
 * Copyright 2024 Inclusive Design Research Centre, OCAD University
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
import { changeEncodingContents, findIndicators } from "./GlobalData";
import { generateGridStyle, speak } from "./GlobalUtils";
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
    console.debug("lastSymbol: %O", lastSymbol);
    if (newBciAvId.constructor === Array) {
      const indicatorPositions = findIndicators(newBciAvId);
      console.debug(`indicatorPositions: ${indicatorPositions}`);
      // If there are no indicators on the symbol, then place it above the first
      // symbol within the array.  Otherwise, replace the current indicator with
      // the new one at the same position.
      if (indicatorPositions.length === 0) {
        newBciAvId = [ newBciAvId[0], ";", indicatorBciAvId, ...newBciAvId.slice(1) ];
      }
      indicatorPositions.forEach((position) => {
        // TODO:  This will not work if a single BCI AV ID is a composite symobl
        // that already includes an indicator.  In that case, it's necessary to
        // decompose the symbol into its parts and then replace the indicators
        // therein.  Basically replace the single BciAvId with an array of
        // BciAvIds that result in the same graphic.
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
      // is the same as before, but is spoekm aloud with the indicator label.
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
