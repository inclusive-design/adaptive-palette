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
import { generateGridStyle } from "../utils/GridUtils";
import { announceIfEnabled, speakUnavailable } from "../utils/SpeechUtils";

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
  let unavailable = true;
  const { payloads, caretPosition } = changeEncodingContents.value;
  if (payloads.length !== 0 && caretPosition !== -1) {
    const caretSymbol = payloads[caretPosition];
    unavailable = !caretSymbol.modifierInfo || caretSymbol.modifierInfo.length === 0;
  }
  // Handle the request to remove the last placed modifier.
  const cellClicked = () => {
    if (unavailable) { speakUnavailable(label); return; }
    // Get the last symbol in the editing area, and create an initial
    // `newBciAvId` and `newLabel`.
    const { caretPosition, payloads } = changeEncodingContents.value;
    const symbolToEdit = payloads[caretPosition];
    let newComposition = (
      typeof symbolToEdit.composition === "number" ?
        [symbolToEdit.composition] :
        symbolToEdit.composition
    );
    let newLabel = symbolToEdit.label;
    let newBaseLabel = symbolToEdit.baseLabel;
    let newBaseModifierCount = symbolToEdit.baseModifierCount;

    // Check for any modifier to remove -- if the symbol has no modifiers,
    // leave the `newComposition` as is.
    const modifierCountBeforeRemoval = symbolToEdit.modifierInfo?.length ?? 0;
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
      // If the removed modifier predates `baseLabel`'s snapshot (i.e. it was
      // already folded into `baseLabel`'s text when an indicator was applied),
      // strip it from `baseLabel` too and shrink `baseModifierCount` to match --
      // otherwise a later indicator removal would reapply/resurrect a modifier
      // the user just explicitly removed.
      if (newBaseLabel !== undefined && modifierCountBeforeRemoval <= (newBaseModifierCount ?? 0)) {
        newBaseLabel = newBaseLabel.replace(removeInfo.modifierGloss, "").trim();
        newBaseModifierCount = (newBaseModifierCount ?? 0) - 1;
      }
    }
    payloads[caretPosition] = {
      "label": newLabel,
      "composition": newComposition,
      "userSelectedSymbolId": symbolToEdit.userSelectedSymbolId,
      "modifierInfo": symbolToEdit.modifierInfo,
      "indicatorId": symbolToEdit.indicatorId,
      "baseLabel": newBaseLabel,
      "baseModifierCount": newBaseModifierCount
    };
    changeEncodingContents.value = {
      payloads: payloads,
      caretPosition: caretPosition
    };
    announceIfEnabled(newLabel);
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
