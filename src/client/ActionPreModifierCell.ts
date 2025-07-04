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
import { findClassifierFromLeft } from "./SvgUtils";
import "./ActionModifierCell.scss";

type ActionModifierCodeCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

// For these modifier symbols, the indicator that they normally have must be
// removed when used as a modifier.  The correct form of the BciAvIdType are
// given here.
const MANY_MODIFIER = 14647;
const MORE_MODIFIER = 24879;
const MOST_MODIFIER = 24944;

/**
 * Function for checking for the modifier symbols that have an indicator as part
 * of their makeup, and returning a new BciAvIdType without the indicator.
 * @param {Array} modifierToCheck - Array form of the modifier's BciAvIdType
 * @return {Array} - If the given modifier has an indicator as part of its
 *                   composition, the return is the array form of its
 *                   BciAvIdType without the indicator.  Otherwise, it is
 *                   returned unmodified.
 */
function checkModifierForIndicator (modifierToCheck: Array<number|string>): Array<number|string> {
  if (modifierToCheck.indexOf(MANY_MODIFIER) !== -1) {
    modifierToCheck = [ MANY_MODIFIER ];
  }
  else if (modifierToCheck.indexOf(MORE_MODIFIER) !== -1) {
    modifierToCheck = [ MORE_MODIFIER ];
  }
  else if (modifierToCheck.indexOf(MOST_MODIFIER) !== -1){
    modifierToCheck = [ MOST_MODIFIER ];
  }
  return modifierToCheck;
}

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
  const disabled = changeEncodingContents.value.length === 0;

  const cellClicked = () => {
    const modifierWithoutIndicator = checkModifierForIndicator(modifierBciAvId);

    // Get the last symbol in the editing area and prepend the modifier.
    const allButLastSymbol = [...changeEncodingContents.value];
    const lastSymbol = allButLastSymbol.pop();
    let newBciAvId = (
      typeof lastSymbol.bciAvId === "number" ?
        [lastSymbol.bciAvId] :
        lastSymbol.bciAvId
    );
    newBciAvId = [ ...modifierWithoutIndicator, "/", ...newBciAvId ];
    const payload = {
      "id": lastSymbol.id + props.id,
      "label": `${props.options.label} ${lastSymbol.label}`,
      "bciAvId": newBciAvId
    };
    changeEncodingContents.value = [...allButLastSymbol, payload];
    speak(payload.label);
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

