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
    columnStart, columnSpan, rowStart, rowSpan, label
  } = props.options;

  // Get the modifier BCI AV ID and make sure it's an array.
  const modifierBciAvId = (
    typeof props.options.bciAvId === "number" ?
      [props.options.bciAvId] :
      props.options.bciAvId
  );

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  const ariaControls = ( isComposing.value ? COMPOSE_AREA_ID : INPUT_AREA_ID);
  const contentsSignal = contentSignalMap[ariaControls];
  const disabled = contentsSignal.value.caretPosition === -1;

  const cellClicked = () => {
    // Get the symbol at the caret position in the editing area.
    const { caretPosition, payloads } = changeEncodingContents.value;
    const symbolToEdit = payloads[caretPosition];
    let newBciAvId = (
      typeof symbolToEdit.bciAvId === "number" ?
        [symbolToEdit.bciAvId] :
        symbolToEdit.bciAvId
    );
    if (prepend) {
      newBciAvId = [ ...modifierBciAvId, "/", ...newBciAvId ];
    }
    else {
      newBciAvId = [ ...newBciAvId, "/", ...modifierBciAvId ];
    }
    // Push the current modifier information onto the `modifierInfo` of the
    // `symbolToEdit`, tracking the order in which the modifiers were added.
    if (!symbolToEdit.modifierInfo) {
      symbolToEdit.modifierInfo = [];
    }
    symbolToEdit.modifierInfo.push({
      modifierId: modifierBciAvId,
      modifierGloss: label,
      isPrepended: prepend
    });
    payloads[caretPosition] = {
      "id": symbolToEdit.id + props.id,
      "label": `${label} ${symbolToEdit.label}`,
      "bciAvId": newBciAvId,
      "modifierInfo": symbolToEdit.modifierInfo
    };
    changeEncodingContents.value = {
      payloads: payloads,
      caretPosition: caretPosition
    };
    speak(`${label} ${symbolToEdit.label}`);
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
        bciAvId=${modifierBciAvId}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}
