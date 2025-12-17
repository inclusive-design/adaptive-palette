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
import { generateGridStyle, speak } from "./GlobalUtils";
import "./ActionModifierCell.scss";

type ActionModifierCodeCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

/*
 * The "combine" modifier permits creating new Bliss-words.
 */
export function ActionCombineModifierCell (props: ActionModifierCodeCellPropsType): VNode {
  const {
    columnStart, columnSpan, rowStart, rowSpan, label
  } = props.options;
  const modifierBciAvId = props.options.bciAvId;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  const disabled = true;

  // TBD
  const cellClicked = () => {
    console.debug("Combine modifier clicked -- NOT IMPLEMENTED");
    speak(`${label}. NOT IMPLEMENTED`);
  };

  return html`
    <button id="${props.id}" class="actionModifierCell" style="${gridStyles}" onClick=${cellClicked} disabled="${disabled}">
      <${BlissSymbol}
        bciAvId=${modifierBciAvId}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}

