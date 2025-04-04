/*
 * Copyright 2023-2024 Inclusive Design Research Centre, OCAD University
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

import { generateGridStyle, speak } from "./GlobalUtils";
import { BlissSymbolInfoType, LayoutInfoType } from "./index.d";
import "./ActionTextCell.scss";

type ActionTextCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

export function ActionTextCell (props: ActionTextCellPropsType): VNode {
  const {
    columnStart, columnSpan, rowStart, rowSpan, label
  } = props.options;
  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  const sentenceClicked = () => {
    speak(label.replace(/^[0-9]+./,"").trim());  // remove any leading "1. "
  };

  return html`
    <button id="${props.id}" class="actionTextCell" style="${gridStyles}" onClick=${sentenceClicked}>
      ${label}
    </button>
  `;
}
