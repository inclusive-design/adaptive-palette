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
import { spokenLabel } from "../components/AiBadge";
import { changeEncodingContents } from "../state/GlobalData";
import { editMessage } from "../core/MessageEdit";
import { generateGridStyle } from "../utils/GridUtils";
import { announceIfEnabled, speakUnavailable } from "../utils/SpeechUtils";
import { caretComposition, replaceAtCaret } from "../utils/SymbolEncodingUtils";
import { baseOf, relabel } from "../utils/SymbolLabelUtils";

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
  // Marked unavailable rather than `disabled` so the button keeps its place in the tab
  // order for switch and eye-gaze users.
  // A picture has no symbol to remove a modifier from.
  const caretSymbolComposition = caretComposition(changeEncodingContents.value);
  const { payloads, caretPosition } = changeEncodingContents.value;
  const unavailable = caretSymbolComposition === undefined ||
    (payloads[caretPosition].modifierInfo?.length ?? 0) === 0;
  // Handle the request to remove the last placed modifier.
  const cellClicked = () => {
    if (unavailable || caretSymbolComposition === undefined) { speakUnavailable(label); return; }
    // Get the last symbol in the editing area, and create an initial
    // `newComposition`.
    const { caretPosition, payloads } = changeEncodingContents.value;
    const symbolToEdit = payloads[caretPosition];
    let newComposition = (
      typeof caretSymbolComposition === "number" ?
        [caretSymbolComposition] :
        caretSymbolComposition
    );

    // Check for any modifier to remove -- if the symbol has no modifiers,
    // leave the `newComposition` as is. The last modifier is read rather than popped: the
    // message a cell is handed is never edited in place, so the shortened list is a new array.
    // With no modifiers to drop, `slice` returns the empty or undefined list unchanged.
    const modifierCountBeforeRemoval = symbolToEdit.modifierInfo?.length ?? 0;
    const removeInfo = symbolToEdit.modifierInfo?.[modifierCountBeforeRemoval - 1];
    const newModifierInfo = symbolToEdit.modifierInfo?.slice(0, -1);
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
    }
    // The label comes from the symbol's parts, so removing the modifier also removes its text,
    // and any word the model gave for the symbol with it.
    const edited = relabel({
      "label": symbolToEdit.label,
      "composition": newComposition,
      "userSelectedSymbolId": symbolToEdit.userSelectedSymbolId,
      "modifierInfo": newModifierInfo,
      "indicatorId": symbolToEdit.indicatorId,
      ...baseOf(symbolToEdit)
    });
    editMessage({ payloads: replaceAtCaret(payloads, caretPosition, edited), caretPosition: caretPosition });
    announceIfEnabled(spokenLabel(edited));
  };

  return html`
    <button id="${props.id}" class="btn-command" style="${gridStyles}" onClick=${cellClicked} aria-disabled=${unavailable}>
      <${BlissSymbol}
        composition=${removeModifierComposition}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}
