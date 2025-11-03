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
import { generateGridStyle, speak, insertWordAtCaret } from "./GlobalUtils";
import { decomposeBciAvId } from "./SvgUtils";
import "./ActionGlossSearchCell.scss";

type ActionGlossSearchCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

export function ActionGlossSearchCell (props: ActionGlossSearchCellPropsType): VNode {
  const {
    columnStart, columnSpan, rowStart, rowSpan, bciAvId, label
  } = props.options;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  let proposedLabel = label.split(":")[0];
  if (proposedLabel.length === 0) {
    proposedLabel = props.options.label;
  }
  const composition = decomposeBciAvId(bciAvId);
  let compositionString;
  if (composition.constructor === Array) {
    compositionString = composition.join("");
  }
  else {
    compositionString = bciAvId.toString();
  }

  const cellClicked = (event) => {
    console.debug(event.target);
    if (event.target.id === `input-${props.id}`) {
      event.stopPropogation();
      return;
    }
    const composition = decomposeBciAvId(bciAvId);
    const labelInput = document.getElementById(`input-${props.id}`) as HTMLInputElement;
    const theLabel = labelInput.value;
    const payloadBciAvId = ( composition ? composition : props.options.bciAvId );
    const payload = {
      "id": props.id,
      "label": theLabel,
      "bciAvId": payloadBciAvId,
      "modifierInfo": []
    };
    changeEncodingContents.value = insertWordAtCaret(
      payload, changeEncodingContents.value.payloads, changeEncodingContents.value.caretPosition
    );
    speak(theLabel);
  };

  return html`
    <div style="${gridStyles}" class="actionGlossSearchCell">
      <button id="${props.id}" onClick=${cellClicked}>
        <${BlissSymbol}
          bciAvId=${bciAvId}
          label=${label}
          isPresentation=true
        />
      </button>
      <input id=input-${props.id} value=${proposedLabel} />
      <span>${compositionString}</span>
    </div>
  `;
}
