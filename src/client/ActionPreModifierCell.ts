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
import "./ActionModifierCell.scss";

type ActionModifierCodeCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

/*
 * A "pre" modifier is a modifier symbol that is prepended to the current symbol
 * in the input area
 */
export function ActionPreModifierCell (props: ActionModifierCodeCellPropsType): VNode {
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
  const disabled = changeEncodingContents.value.caretPosition === -1;

  const cellClicked = () => {
    // Get the symbol in the editing area at the caret position.
    const { caretPosition, payloads } = changeEncodingContents.value;
    const symbolToEdit = payloads[caretPosition];
    let newBciAvId = (
      typeof symbolToEdit.bciAvId === "number" ?
        [symbolToEdit.bciAvId] :
        symbolToEdit.bciAvId
    );
    newBciAvId = [ ...modifierBciAvId, "/", ...newBciAvId ];

    // Push the current modifier information to the `modifierInfo` aspect of the
    // `symbolToEdit` to track that it is the last one added (at this point).
    symbolToEdit.modifierInfo.push({
      modifierId: modifierBciAvId,
      modifierGloss: label,
      isPrepended: true
    });
    payloads[caretPosition] = {
      "id": symbolToEdit.id + props.id,
      "label": `${props.options.label} ${symbolToEdit.label}`,
      "bciAvId": newBciAvId,
      "modifierInfo": symbolToEdit.modifierInfo
    };
    changeEncodingContents.value = {
      payloads: payloads,
      caretPosition: caretPosition
    };
    speak(payloads[caretPosition].label);
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

