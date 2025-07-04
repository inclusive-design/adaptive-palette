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

/**
 * Determine is there are any modifiers in the current BciAvIType
 * @param {BciAvIdType} bciAvId - A symbol that potentially has one or more
 *                                modifiers
 * @return {boolean} - `true` if there are any modifiers in the given symbol;
 *                     `false` otherwise.
 */
function hasModifier (bciAvId: BciAvIdType): boolean {
  if (typeof bciAvId === "number") {
    bciAvId = [ bciAvId ];
  }
  let hasMod = false;
  for (let i = 0; i < bciAvId.length; i++) {
    const element = bciAvId[i];
    if (typeof element === "number") {
      if (isModifierId(Number(bciAvId[i]))) {
        hasMod = true;
        break;
      }
    }
  }
  return hasMod;
}

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
    disabled = !hasModifier(lastValue.bciAvId);
  }
  const cellClicked = () => {
    // Get the last symbol in the editing area and find the location of any
    // existing modifier starting from the left
    const allButLastSymbol = [...changeEncodingContents.value];
    const lastSymbol = allButLastSymbol.pop();
    let newBciAvId = (
      typeof lastSymbol.bciAvId === "number" ?
        [lastSymbol.bciAvId] :
        lastSymbol.bciAvId
    );
    // Note: findIndex() returns undefined (falsey) if there is no modifier.
    const modIndex = lastSymbol.bciAvId.findIndex(isModifierId);
    if (modIndex !== undefined) {
      // `modIndex` is either the first element (index 0) for modifiers that are
      // prepended, or somewhere in the middle of the array.  In the first case,
      // just slice of the first two elements, the modifier and the following
      // "/".
      if (modIndex === 0) {
        newBciAvId = newBciAvId.slice(2);
      }
      // If somewhere in the middle, slice off two middle elements: the "/" and
      // the modifier
      else {
        newBciAvId = [
          ...newBciAvId.slice(0, modIndex-1),
          ...newBciAvId.slice(modIndex+1)
        ];
      }
      const payload = {
        "id": lastSymbol.id,
        "label": lastSymbol.label,  // How to massage label??? (Id-to-string map)
        "bciAvId": newBciAvId
      };
      changeEncodingContents.value = [...allButLastSymbol, payload];
      speak("modifier removed");
    }
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
