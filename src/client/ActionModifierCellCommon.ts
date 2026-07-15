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
import { changeEncodingContents } from "./GlobalData";
import { generateGridStyle, speak } from "./GlobalUtils";
import "./ActionModifierCell.scss";

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

  // Get the modifier composition and make sure it's an array.
  const modifierComposition = (
    typeof props.options.composition === "number" ?
      [props.options.composition] :
      props.options.composition
  );

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  const disabled = changeEncodingContents.value.caretPosition === -1;

  const cellClicked = () => {
    // Get the symbol at the caret position in the editing area.
    const { caretPosition, payloads } = changeEncodingContents.value;
    const symbolToEdit = payloads[caretPosition];
    let newComposition = (
      typeof symbolToEdit.composition === "number" ?
        [symbolToEdit.composition] :
        symbolToEdit.composition
    );
    if (prepend) {
      newComposition = [ ...modifierComposition, "/", ...newComposition ];
    }
    else {
      newComposition = [ ...newComposition, "/", ...modifierComposition ];
    }
    // Push the current modifier information onto the `modifierInfo` of the
    // `symbolToEdit`, tracking the order in which the modifiers were added.
    if (!symbolToEdit.modifierInfo) {
      symbolToEdit.modifierInfo = [];
    }
    symbolToEdit.modifierInfo.push({
      modifierId: modifierComposition,
      modifierGloss: label,
      isPrepended: prepend
    });
    payloads[caretPosition] = {
      "label": `${label} ${symbolToEdit.label}`,
      "composition": newComposition,
      "userSelectedSymbolId": symbolToEdit.userSelectedSymbolId,
      "modifierInfo": symbolToEdit.modifierInfo,
      "indicatorInfo": symbolToEdit.indicatorInfo,
      "baseLabel": symbolToEdit.baseLabel
    };
    changeEncodingContents.value = {
      payloads: payloads,
      caretPosition: caretPosition
    };
    speak(`${label} ${symbolToEdit.label}`);
  };

  return html`
    <button id="${props.id}" class="actionModifierCell" style="${gridStyles}" onClick=${cellClicked} disabled="${disabled}">
      <${BlissSymbol}
        composition=${modifierComposition}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}
