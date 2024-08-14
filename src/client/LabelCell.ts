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
import { generateGridStyle } from "./GlobalUtils";
import { BlissSymbol } from "./BlissSymbol";
import "./LabelCell.scss";

type LabelCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

export function LabelCell (props: LabelCellPropsType): VNode {

  const {
    columnStart, columnSpan, rowStart, rowSpan, bciAvId, label
  } = props.options;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  return html`
    <label id="${props.id}" class="labelCell" style="${gridStyles}">
      <${BlissSymbol} bciAvId=${bciAvId} />
      ${label}
    </label>
  `;
}
