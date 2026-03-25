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

import { BlissSymbolInfoType, LayoutInfoType } from "./index.d";
import { BlissSymbol } from "./BlissSymbol";
import { INPUT_AREA_ID, COMPOSE_AREA_ID, contentSignalMap, isComposing } from "./GlobalData";
import { generateGridStyle, speak } from "./GlobalUtils";
import { findIndicators, findClassifierFromLeft } from "./SvgUtils";
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
  const {
    columnStart, columnSpan, rowStart, rowSpan, label
  } = props.options;
  const combineMarkerBciAvId = props.options.bciAvId;

  const [isPressed, setIsPressed] = useState(false);

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  const ariaControls = ( isComposing.value ? COMPOSE_AREA_ID : INPUT_AREA_ID);
  const contentsSignal = contentSignalMap[ariaControls];
  const disabled = contentsSignal.value.payloads.length === 0;

  const cellClicked = () => {
    // Get the symbol at the caret position in the editing area and find the
    // locations within it to replace any existing indicator.
    const changeContents = contentSignalMap[ariaControls];
    const { caretPosition, payloads } = contentsSignal.value;

    // If the previous click untoggled the cell the `isPressed` state is `false`
    // Then, add the combine marker to the beginning and end of the contents
    // and set `isPressed` to `true`
    let speech;
    if (!isPressed) {
      payloads.unshift(COMBINE_MARKER_PAYLOAD);
      payloads.push(COMBINE_MARKER_PAYLOAD);
      speech = "add combination";
    }
    else {
      payloads.shift();
      payloads.pop();
      speech = "remove combination";
    }
    setIsPressed(!isPressed);
    contentsSignal.value = {
      payloads: payloads,
      caretPosition: caretPosition
    };
    speak(speech);
  };

  return html`
    <button
      id="${props.id}"
      class="actionIndicatorCell"
      style="${gridStyles}"
      onClick=${cellClicked}
      disabled="${disabled}"
      aria-controls="${ariaControls}"
      aria-pressed="${isPressed}">
      <${BlissSymbol}
        bciAvId=${combineMarkerBciAvId}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}
