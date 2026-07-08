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
  const removeModifierComposition = props.options.composition;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  // Disabled state of the remove button depends on if the last symbol in the
  // input field (if any) has a modifier AND if there is more than one symbol in
  // the encoding.
  let disabled = true;
  const ariaControls =  ( isComposing.value ? COMPOSE_AREA_ID : INPUT_AREA_ID );
  const contentsSignal = contentSignalMap[ariaControls];
  const { payloads, caretPosition } = contentsSignal.value;
  if (payloads.length !== 0 && caretPosition !== -1) {
    const caretSymbol = payloads[caretPosition];
    disabled = !caretSymbol.modifierInfo || caretSymbol.modifierInfo.length === 0;
  }
  // Handle the request to remove the last placed modifier.
  const cellClicked = () => {
    // Get the last symbol in the editing area, and create an initial
    // `newBciAvId` and `newLabel`.
    const { caretPosition, payloads } = contentsSignal.value;
    const symbolToEdit = payloads[caretPosition];
    let newComposition = (
      typeof symbolToEdit.composition === "number" ?
        [symbolToEdit.composition] :
        symbolToEdit.composition
    );
    let newLabel = symbolToEdit.label;

    // Check for any modifier to remove -- if the symbol has no modifiers,
    // leave the `newComposition` as is.
    const removeInfo = symbolToEdit.modifierInfo?.pop();
    if (removeInfo) {
      // Either the last modifer added was prepended to the beginning or
      // appended to the end. If it was prepended ...
      if (removeInfo.isPrepended) {
        // ... the modifier is the first symbol in the `newComposition`.  Remove it
        // plus the following "/"
        newComposition = newComposition.slice((removeInfo.modifierId as (string|number)[]).length + 1);
      }
      // If the last modifier added was appended to the end ...
      else {
        // ... the modifier is the last symbol in the `newComposition`.  Remove it
        // from the end of the array.  Note: the "-1" is to account for the
        // "/" preceding the modifier's composition.
        newComposition = newComposition.slice(
          0, newComposition.length - (removeInfo.modifierId as (string|number)[]).length - 1
        );
      }
      newLabel = newLabel.replace(removeInfo.modifierGloss, "").trim();
    }
    payloads[caretPosition] = {
      "id": symbolToEdit.id,
      "label": newLabel,
      "composition": newComposition,
      "modifierInfo": symbolToEdit.modifierInfo
    };
    contentsSignal.value = {
      payloads: payloads,
      caretPosition: caretPosition
    };
    speak(newLabel);
  };

  return html`
    <button id="${props.id}" class="actionIndicatorCell" style="${gridStyles}" onClick=${cellClicked} disabled=${disabled}>
      <${BlissSymbol}
        composition=${removeModifierComposition}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}
