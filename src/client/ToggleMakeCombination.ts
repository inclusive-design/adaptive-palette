/*
 * Copyright 2026 Inclusive Design Research Centre, OCAD University
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
import { useState } from "preact/hooks";

import { BlissSymbolInfoType, LayoutInfoType, SymbolEncodingType } from "./index.d";
import { BlissSymbol } from "./BlissSymbol";
import { composeWordContents, COMPOSE_AREA_ID } from "./GlobalData";
import { clamp, generateGridStyle, speak, isSkipSymbol, bciAvIdToSkip } from "./GlobalUtils";
import "./ActionModifierCell.scss";

const COMBINE_MARKER_PAYLOAD = {
  "id": "foo",
  "label": "",
  "bciAvId": 13382,
  "modifierInfo": []
};

type ToggleMakeCombinationPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

export function ToggleMakeCombination (props: ToggleMakeCombinationPropsType): VNode {
  if (composeWordContents.value.payloads === undefined) {
    console.trace("payloads is undefined", composeWordContents.value);
  }
  const {
    columnStart, columnSpan, rowStart, rowSpan, label
  } = props.options;
  const combineMarkerBciAvId = props.options.bciAvId;

  const { caretPosition, payloads } = composeWordContents.value;
  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  const disabled = payloads.length === 0;

  // The toggle is "pressed" when the array is currently wrapped between combine symbols.
  const isPressed = payloads.length >= 2 &&
    isSkipSymbol(payloads[0], bciAvIdToSkip) &&
    isSkipSymbol(payloads[payloads.length - 1], bciAvIdToSkip);

  const cellClicked = () => {
    if (payloads.length === 0) {
      return;
    }

    let newPayloads: SymbolEncodingType[];
    let newCaretPosition: number;
    let speech: string;

    if (!isPressed) {
      // Wrap combine symbol at start and end. Every existing symbol shifts right by 1,
      // so the caret (when on a symbol) must follow.
      newPayloads = [COMBINE_MARKER_PAYLOAD, ...payloads, COMBINE_MARKER_PAYLOAD];
      // If the caret was at -1, it was outside everything, so pull it inside the combine symbol
      // onto the first symbol of the composed symbol. Otherwise just shit it right by 1.
      newCaretPosition = caretPosition === -1 ? 1 : caretPosition + 1;
      speech = "add combination";
    } else {
      const firstCombineIndex = payloads.findIndex(p => isSkipSymbol(p, bciAvIdToSkip));
      let lastCombineIndex = -1;
      for (let i = payloads.length -1; i >=0; i--) {
        if (isSkipSymbol(payloads[i], bciAvIdToSkip)) {
          lastCombineIndex = i;
          break;
        }
      }
      if (firstCombineIndex === -1 || firstCombineIndex === lastCombineIndex) {
        return;
      }

      newPayloads = payloads.filter(
        (_, i) => i !== firstCombineIndex && i !== lastCombineIndex
      );

      if (caretPosition === -1) {
        newCaretPosition = -1;
      } else if (caretPosition === firstCombineIndex || caretPosition === lastCombineIndex) {
        newCaretPosition = -1;
      } else {
        let updatedPosition = caretPosition;
        if (caretPosition > firstCombineIndex) {
          updatedPosition -= 1;
        }
        if (caretPosition > lastCombineIndex) {
          updatedPosition -= 1;
        }
        newCaretPosition = clamp(updatedPosition, -1, newPayloads.length -1);
      }
    
      speech = "remove combination";
    }

    composeWordContents.value = {
      payloads: newPayloads,
      caretPosition: newCaretPosition
    };
    speak(speech);
  };

  return html`
    <button
      id="${props.id}"
      class="actionModifierCell"
      style="${gridStyles}"
      onClick=${cellClicked}
      disabled="${disabled}"
      aria-controls="${COMPOSE_AREA_ID}"
      aria-pressed="${isPressed}">
      <${BlissSymbol}
        bciAvId=${combineMarkerBciAvId}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}
