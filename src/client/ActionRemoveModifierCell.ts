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
import "./ActionIndicatorCell.scss";

type ActionRemoveModifierPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

export function ActionRemoveModifierCell (props: ActionRemoveModifierPropsType): VNode {
  const {
    columnStart, columnSpan, rowStart, rowSpan, label
  } = props.options;
  const removeModifierBciAvId = props.options.bciAvId;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  // Disabled state of the remove button depends on if the last symbol in the
  // input field (if any) has a modifier.
  let disabled = true;
  const { payloads, caretPosition } = changeEncodingContents.value;
  if (payloads.length !== 0) {
    const caretSymbol = payloads[caretPosition];
    disabled = caretSymbol.modifierInfo.length === 0;
  }
  // Handle the request to remove the last placed modifier.
  const cellClicked = () => {
    // Get the last symbol in the editing area, and create an initial
    // `newBciAvId` and `newLabel`.
    const { caretPosition, payloads } = changeEncodingContents.value;
    const symbolToEdit = payloads[caretPosition];
    let newBciAvId = (
      typeof symbolToEdit.bciAvId === "number" ?
        [symbolToEdit.bciAvId] :
        symbolToEdit.bciAvId
    );
    let newLabel = symbolToEdit.label;

    // Check for any modifier to remove -- if the symbol has no modifiers,
    // leave the `newBciAvId` as is.
    const removeInfo = symbolToEdit.modifierInfo.pop();
    if (removeInfo) {
      // Either the last modifer added was prepended to the beginning or
      // appended to the end. If it was prepended ...
      if (removeInfo.isPrepended) {
        // ... the modifier is the first symbol in the `newBciAvId`.  Remove it
        // plus the following "/"
        newBciAvId = newBciAvId.slice(removeInfo.modifierId.length + 1);
      }
      // If the last modifier added was appended to the end ...
      else {
        // ... the modifier is the last symbol in the `newBciAvId`.  Remove it
        // from the end of the array.  Note: the "-1" is to account for the
        // "/" preceding the modfier's bciAvId.
        newBciAvId = newBciAvId.slice(
          0, newBciAvId.length - removeInfo.modifierId.length - 1
        );
      }
      newLabel = newLabel.replace(removeInfo.modifierGloss, "").trim();
    }
    payloads[caretPosition] = {
      "id": symbolToEdit.id,
      "label": newLabel,
      "bciAvId": newBciAvId,
      "modifierInfo": symbolToEdit.modifierInfo
    };
    changeEncodingContents.value = {
      payloads: payloads,
      caretPosition: caretPosition
    };
    speak(newLabel);
  };

  return html`
    <button id="${props.id}" class="actionIndicatorCell" style="${gridStyles}" onClick=${cellClicked} disabled="${disabled}">
      <${BlissSymbol}
        bciAvId=${removeModifierBciAvId}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}
