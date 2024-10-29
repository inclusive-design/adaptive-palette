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
import { changeEncodingContents } from "./GlobalData";
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
    // Get the last symbol in the editing area
    const allButLastSymbol = [...changeEncodingContents.value];
    const lastSymbol = allButLastSymbol.pop();
    console.debug("lastSymbol: %O", lastSymbol);

    const payload = {
      "id": lastSymbol.id + props.id, // TODO:  what should this be?
      "label": lastSymbol.label,
      "bciAvId": [ lastSymbol.bciAvId, ";", indicatorBciAvId ]
    };
    changeEncodingContents.value = [...allButLastSymbol, payload];
    speak(`${lastSymbol.label}, ${props.options.label}`);
  };

  return html`
    <button id="${props.id}" class="actionIndicatorCodeCell" style="${gridStyles}" onClick=${cellClicked}>
      <${BlissSymbol}
        bciAvId=${indicatorBciAvId}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}
