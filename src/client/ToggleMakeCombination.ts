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
import { composeWordContents, COMPOSE_AREA_ID } from "./GlobalData";
import { generateGridStyle, speak } from "./GlobalUtils";
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

  const { caretPosition, payloads } = composeWordContents.value;
  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  const disabled = payloads.length === 0;
  if (payloads.length === 0) {
    setIsPressed(false);
  }

  const cellClicked = () => {

    // If there are no symobls to mark with the combine marker, make sure that
    // the `isPressed` state is `fales` and do nothing else.
    if (payloads.length === 0) {
      setIsPressed(false);
    }
    else {
      // If the previous click untoggled the cell the `isPressed` state is
      // `false` -- add the combine marker to the beginning and end of the
      // contents and set `isPressed` to `true`...
      let speech;
      if (!isPressed) {
        payloads.unshift(COMBINE_MARKER_PAYLOAD);
        payloads.push(COMBINE_MARKER_PAYLOAD);
        speech = "add combination";
      }
      // ... otherwise remove the combine marker.
      else {
        payloads.shift();
        payloads.pop();
        speech = "remove combination";
      }
      setIsPressed(!isPressed);
      console.debug(`isPressed is ${isPressed}`);
      //isPressed = !isPressed;
      composeWordContents.value = {
        payloads: payloads,
        caretPosition: caretPosition
      };
      speak(speech);
    }
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
