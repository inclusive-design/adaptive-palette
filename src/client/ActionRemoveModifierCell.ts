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
import { BlissSymbolInfoType, BciAvIdType, LayoutInfoType } from "./index.d";
import { BlissSymbol } from "./BlissSymbol";
import { changeEncodingContents } from "./GlobalData";
import { generateGridStyle, speak } from "./GlobalUtils";
import { isModifierId } from "./SvgUtils";
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
  if (changeEncodingContents.value.length !== 0) {
    const lastValue = changeEncodingContents.value[changeEncodingContents.value.length - 1];
    disabled = lastValue.modifierInfo.length === 0;
  }
  const cellClicked = () => {
    // Get the last symbol in the editing area, and create an initial
    // `newBciAvId` and `newLabel`.
    const allButLastSymbol = [...changeEncodingContents.value];
    const lastSymbol = allButLastSymbol.pop();
    let newBciAvId = (
      typeof lastSymbol.bciAvId === "number" ?
        [lastSymbol.bciAvId] :
        lastSymbol.bciAvId
    );
    let newLabel = lastSymbol.label;

    // Check for any modifier to remove -- if the symbol has no modifiers,
    // leave the `newBciAvId` as is.
    const removeInfo = lastSymbol.modifierInfo.pop();
    if (removeInfo) {
      // Either the last modifer added was prepended to the beginning or
      // appended to the end. If it was prepended ...
      if (removeInfo.isPrepended) {
        // ... the modifier is the first symbol in the `newBciAvId`.  Remove it
        // plus the following "/"
        newBciAvId = newBciAvId.slice(removeInfo.modifierId.length + 1);

        // Update the start positions of any remaining modifiers (only applies
        // when removing prepended modifiers).  Note: the "+1" is to account
        // for the "/" following the removed modifier's bciAvId.
        lastSymbol.modifierInfo.forEach( (item) => {
          item.startPosition -= removeInfo.modifierId.length+1;
        });
      }
      // If the last modifier added was appended to the end ...
      else {
        // ... the modifier is the last symbol in the `newBciAvId`.  Remove it
        // from the end of the array.  Note: the "-1" is to account for the
        // "/" preceding the modfier's bciAvId.
        newBciAvId = newBciAvId.slice(0, removeInfo.startPosition-1);
      }
      newLabel = newLabel.replace(removeInfo.modifierGloss, "").trim();
    }
    const payload = {
      "id": lastSymbol.id,
      "label": newLabel,
      "bciAvId": newBciAvId,
      "modifierInfo": lastSymbol.modifierInfo
    };
    changeEncodingContents.value = [...allButLastSymbol, payload];
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
