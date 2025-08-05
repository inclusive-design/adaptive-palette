/*
 * Copyright 2023-2025 Inclusive Design Research Centre, OCAD University
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
import { changeEncodingContents, cursorPositionSignal } from "./GlobalData";
import { generateGridStyle, speak } from "./GlobalUtils";
import { decomposeBciAvId, createModifierInfo } from "./SvgUtils";
import "./ActionBmwCodeCell.scss";

type ActionBmwCodeCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

export function ActionBmwCodeCell (props: ActionBmwCodeCellPropsType): VNode {
  const {
    columnStart, columnSpan, rowStart, rowSpan, bciAvId, label
  } = props.options;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  const cellClicked = () => {
    const composition = decomposeBciAvId(bciAvId);
    // The payload includes an empty `modifierInfo` for this new symbol.
    const payloadBciAvId = ( composition ? composition : props.options.bciAvId );
    const payload = {
      "id": props.id,
      "label": props.options.label,
      "bciAvId": payloadBciAvId,
      "modifierInfo": createModifierInfo(payloadBciAvId)
    };
    changeEncodingContents.value = [...changeEncodingContents.value, payload];
    cursorPositionSignal.value = changeEncodingContents.value.length - 1;

    speak(props.options.label);
  };

  return html`
    <button id="${props.id}" class="actionBmwCodeCell" style="${gridStyles}" onClick=${cellClicked}>
      <${BlissSymbol}
        bciAvId=${bciAvId}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}
