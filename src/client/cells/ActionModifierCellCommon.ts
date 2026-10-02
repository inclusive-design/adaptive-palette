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
import { BlissSymbolInfoType, LayoutInfoType } from "../index.d";
import { BlissSymbol } from "../components/BlissSymbol";
import { changeEncodingContents } from "../state/GlobalData";
import { editMessage } from "../core/MessageEdit";
import { generateGridStyle } from "../utils/GridUtils";
import { announceIfEnabled, speakUnavailable } from "../utils/SpeechUtils";
import { replaceAtCaret } from "../utils/SymbolEncodingUtils";
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
  // Marked unavailable rather than `disabled` so the button keeps its place in the tab
  // order for switch and eye-gaze users.
  const unavailable = changeEncodingContents.value.caretPosition === -1;

  const cellClicked = () => {
    if (unavailable) { speakUnavailable(label); return; }
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
    // Track the order in which modifiers were added, without touching the modifier list the
    // symbol already has: the message a cell is handed is never edited in place.
    const newModifierInfo = [
      ...(symbolToEdit.modifierInfo ?? []),
      {
        modifierId: modifierComposition,
        modifierGloss: label,
        isPrepended: prepend
      }
    ];
    const newLabel = prepend ? `${label} ${symbolToEdit.label}` : `${symbolToEdit.label} ${label}`;
    const edited = replaceAtCaret(payloads, caretPosition, {
      "label": newLabel,
      "composition": newComposition,
      "userSelectedSymbolId": symbolToEdit.userSelectedSymbolId,
      "modifierInfo": newModifierInfo,
      "indicatorId": symbolToEdit.indicatorId,
      "baseLabel": symbolToEdit.baseLabel,
      "baseModifierCount": symbolToEdit.baseModifierCount,
      // A modifier wraps the label, it does not replace it: the model's text is still in there.
      "isAiLabel": symbolToEdit.isAiLabel
    });
    editMessage({ payloads: edited, caretPosition: caretPosition });
    announceIfEnabled(newLabel);
  };

  return html`
    <button id="${props.id}" class="actionModifierCell" style="${gridStyles}" onClick=${cellClicked} aria-disabled=${unavailable}>
      <${BlissSymbol}
        composition=${modifierComposition}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}
