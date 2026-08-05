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
import { generateGridStyle, speak, applyModifiersToLabel } from "./GlobalUtils";
import { findIndicators, findClassifierFromLeft } from "./SvgUtils";
import { getStaticNewLabel, getNewLabelViaModelQuery } from "./IndicatorLabelsUtils";
import "./ActionIndicatorCell.scss";

type ActionIndicatorCodeCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

export function ActionIndicatorCell (props: ActionIndicatorCodeCellPropsType): VNode {
  const {
    columnStart, columnSpan, rowStart, rowSpan, label
  } = props.options;
  const indicatorId = props.options.composition as number;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  // Marked unavailable rather than `disabled` so the button keeps its place in the tab
  // order for switch and eye-gaze users.
  const unavailable = changeEncodingContents.value.caretPosition === -1;

  const cellClicked = async () => {
    if (unavailable) { return; }
    // Get the symbol at the caret position in the editing area and find the
    // locations within it to replace any existing indicator.
    const { caretPosition, payloads } = changeEncodingContents.value;
    const symbolToEdit = payloads[caretPosition];
    let newComposition = symbolToEdit.composition;
    if (Array.isArray(newComposition)) {
      newComposition = [...newComposition];
      const indicatorPositions = findIndicators(newComposition);
      const classifierIndex = findClassifierFromLeft(newComposition);
      // If there are no indicators on the symbol, then place the indicator
      // above the first symbol that is not a modifier.  Otherwise, replace the
      // current indicator with the new one at the same position.
      // 1. `classifierIndex` is the index of the classifier in the array,
      // 2. the next index is the separator between the classifier and the next
      //    symbol, e.g., "/": `classifierIndex+1`,
      // 3. insert the ";" separator for indicators followed by the indicator id,
      // 4. insert the rest of the array as it was.
      if (indicatorPositions.length === 0) {
        newComposition = [
          ...newComposition.slice(0, classifierIndex+1),
          ";", indicatorId,
          ...newComposition.slice(classifierIndex+1)
        ];
      }
      indicatorPositions.forEach((position) => {
        (newComposition as (string|number)[])[position] = indicatorId;
      });
    }
    // The composition is a single identifier, not an svg builder array.
    else {
      newComposition = [ newComposition, ";", indicatorId ];
    }
    const baseLabel = symbolToEdit.baseLabel ?? symbolToEdit.label;
    // Track the length of `modifierInfo` at the moment `baseLabel` was captured because
    // `baseLabel` already has any modifier text that existed when the indicator was applied.
    // When more modifiers are added after this point, only reapply those to `baseLabel`.
    const baseModifierCount = symbolToEdit.baseModifierCount ?? (symbolToEdit.modifierInfo?.length ?? 0);
    payloads[caretPosition] = {
      "label": symbolToEdit.label,
      "composition": newComposition,
      "userSelectedSymbolId": symbolToEdit.userSelectedSymbolId,
      "modifierInfo": symbolToEdit.modifierInfo,
      "indicatorId": indicatorId,
      "baseLabel": baseLabel,
      "baseModifierCount": baseModifierCount
    };
    changeEncodingContents.value = {
      payloads: payloads,
      caretPosition: caretPosition
    };

    // Compares `indicatorId`, not the full `composition`, because a modifier applied to the
    // same slot while this indicator's label is still resolving changes `composition` without
    // superseding the indicator itself -- the resolved label would otherwise be dropped even
    // though the indicator is still legitimately applied.
    const isStillCurrent = () => {
      const latest = changeEncodingContents.value;
      return latest.payloads[caretPosition] !== undefined &&
        latest.payloads[caretPosition].indicatorId === indicatorId;
    };

    // Apply modifier labels so their text isn't lost (e.g. "big walk" + indicator -> "big walked", not "walked").
    // When there's no `userSelectedSymbolId`, skip this because modifier text is already folded into
    // `baseLabel` before it reaches the Ollama prompt. Re-wrapping here would double it.
    const applyLabel = (label: string) => {
      const latest = changeEncodingContents.value;
      const finalLabel = symbolToEdit.userSelectedSymbolId !== undefined
        ? applyModifiersToLabel(label, symbolToEdit.modifierInfo)
        : label;
      latest.payloads[caretPosition] = {
        ...latest.payloads[caretPosition],
        "label": finalLabel
      };
      changeEncodingContents.value = {
        payloads: latest.payloads,
        caretPosition: latest.caretPosition
      };
      speak(finalLabel);
    };

    const unchangedMessage = `${symbolToEdit.label}, ${props.options.label}`;

    // Every branch below announces something immediately -- synchronously, before any real
    // async wait -- so a click always gets audio feedback even if a later click supersedes it
    // first. Only the resolution after a genuinely in-flight model query (the "pending" branch)
    // is gated on `isStillCurrent()`.
    const staticLabel = getStaticNewLabel(symbolToEdit.userSelectedSymbolId, indicatorId);
    if (staticLabel !== undefined) {
      applyLabel(staticLabel);
      return;
    }

    const modelResult = getNewLabelViaModelQuery(symbolToEdit.userSelectedSymbolId, symbolToEdit.label, baseLabel, indicatorId);

    if (modelResult.status === "cached" && modelResult.label !== undefined) {
      applyLabel(modelResult.label);
      return;
    }
    if (modelResult.status !== "pending") {
      speak(unchangedMessage);
      return;
    }

    speak(`${unchangedMessage} loading new label`);
    const newLabel = await modelResult.promise;
    if (!isStillCurrent()) {
      return;
    }
    if (newLabel !== undefined) {
      applyLabel(newLabel);
    } else {
      speak(unchangedMessage);
    }
  };

  return html`
    <button id="${props.id}" class="actionIndicatorCell" style="${gridStyles}" onClick=${cellClicked} aria-disabled=${unavailable}>
      <${BlissSymbol}
        composition=${indicatorId}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}
