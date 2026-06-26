/*
 * Copyright The Adaptive Palette copyright holders
 * See the AUTHORS.md file at the top-level directory of this distribution and at
 * https://github.com/inclusive-design/adaptive-palette/raw/main/AUTHORS.md.
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
import { INPUT_AREA_ID, COMPOSE_AREA_ID, contentSignalMap, isComposing } from "./GlobalData";
import { composeBlissWord, generateGridStyle, speak } from "./GlobalUtils";
import "./ActionModifierCell.scss";

const ISA_MODIFIER = true;

export type ActionModifierCodeCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType,
};

/*
 * The commond code for rendering modifier cells and handling their activation,
 * by for example a mouse click.
 */
export function ActionModifierCellCommon (props: ActionModifierCodeCellPropsType, prepend: boolean): VNode {
  const {
    columnStart, columnSpan, rowStart, rowSpan, label, composition
  } = props.options;

  // Get the modifier composition and make sure it's an array.
  const modifierComposition = (
    typeof composition === "number" ?
      [composition] :
      composition
  );

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  const ariaControls = ( isComposing.value ? COMPOSE_AREA_ID : INPUT_AREA_ID);
  const contentsSignal = contentSignalMap[ariaControls];
  const disabled = contentsSignal.value.caretPosition === -1;

  const cellClicked = () => {
    const newContents = composeBlissWord(modifierComposition, label, ISA_MODIFIER, contentsSignal.value, prepend);
    const { payloads, caretPosition } = newContents;
    contentsSignal.value = newContents;
    speak(payloads[caretPosition].label);
  };

  return html`
    <button
      id="${props.id}"
      class="actionModifierCell"
      style="${gridStyles}"
      onClick=${cellClicked}
      disabled="${disabled}"
      aria-controls="${ariaControls}">
      <${BlissSymbol}
        composition=${modifierComposition}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}
