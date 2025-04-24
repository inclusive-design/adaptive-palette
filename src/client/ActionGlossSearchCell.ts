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
import { decomposeBciAvId } from "./SvgUtils";
import "./ActionBmwCodeCell.scss";

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

  const cellClicked = (event) => {
    console.debug(event.target);
    if (event.target.id === `input-${props.id}`) {
      event.stopPropogation();
      return;
    }
    const composition = decomposeBciAvId(bciAvId);
    const labelInput = document.getElementById(`input-${props.id}`) as HTMLInputElement;
    const theLabel = labelInput.value;
    const payload = {
      "id": props.id,
      "label": theLabel,
      "bciAvId": ( composition ? composition : props.options.bciAvId )
    };
    changeEncodingContents.value = [...changeEncodingContents.value, payload];
    speak(theLabel);
  };

  return html`
    <button id="${props.id}" class="actionBmwCodeCell" style="${gridStyles}" onClick=${cellClicked}>
      <${BlissSymbol}
        bciAvId=${bciAvId}
        label=${label}
        isPresentation=true
      />
    <input id=input-${props.id} value=${proposedLabel}  />
    </button>
  `;
}
