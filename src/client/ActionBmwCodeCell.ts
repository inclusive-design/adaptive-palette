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
import { changeEncodingContents, isComposing } from "./GlobalData";
import { generateGridStyle, speak, insertWordAtCaret, composeBlissWord } from "./GlobalUtils";
import { decomposeBciAvId } from "./SvgUtils";
import "./ActionBmwCodeCell.scss";

const NOT_A_MODIFIER = false;

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
    const payloadBciAvId = ( composition ? composition : props.options.bciAvId );
    // If composing, append the `payloadBciAvId` symbol to the symbol and the
    // current caret position.
    const { caretPosition, payloads } = changeEncodingContents.value;
    let newLabel;
    if (isComposing.value) {
      const newContents = composeBlissWord(payloadBciAvId, label, NOT_A_MODIFIER, changeEncodingContents.value);
      newLabel = newContents.payloads[newContents.caretPosition].label;
      changeEncodingContents.value = newContents;
    }
    else {
      const payload = {
        "id": props.id,
        "label": props.options.label,
        "bciAvId": payloadBciAvId,
        "modifierInfo": []
      };
      newLabel = payload.label;
      changeEncodingContents.value = insertWordAtCaret(payload, payloads, caretPosition);
    }
    speak(newLabel);
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
