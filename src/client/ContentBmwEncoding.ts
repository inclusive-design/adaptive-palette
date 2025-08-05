/*
 * Copyright 2023-2024 Inclusive Design Research Centre, OCAD University
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
import { BlissSymbol } from "./BlissSymbol";
import { changeEncodingContents, cursorPositionSignal } from "./GlobalData";
import { getSymbolIndexAtCursor } from "./Cursor";
import { ContentBmwEncodingType } from "./index.d";
import { generateGridStyle } from "./GlobalUtils";
import "./ContentBmwEncoding.scss";

export const INPUT_AREA_ID = "bmw-encoding-area";   // better way?

type ContentBmwEncodingProps = {
  id: string,
  options: ContentBmwEncodingType
}

function generateMarkupArray (payloadArray, cursorPos: number): VNode {
  // If no `cursorPos` specified, or it's outside of the array of symbols,
  // set it to after the last symbol.
  if (cursorPos === 0) {
    console.debug("CursorPos is ZERO");
  }
  if ((cursorPos >= payloadArray.length) || (cursorPos < 0)) {
    cursorPos = payloadArray.length - 1;
    console.debug(`CursorPos is ${cursorPos}`);
  }
  return payloadArray.map((payload, index) => {
    console.debug(`index: ${index}, cursorPos: ${cursorPos}`);
    if (index === cursorPos) {
      return html`
        <div class="blissSymbol cursorCaret">
          <${BlissSymbol} bciAvId=${payload.bciAvId} label=${payload.label} isPresentation="true" />
        </div>
      `;
    }
    else {
      return html`
        <div class="blissSymbol">
          <${BlissSymbol} bciAvId=${payload.bciAvId} label=${payload.label} isPresentation="true" />
        </div>
      `;
    }
  });
}

export function ContentBmwEncoding (props: ContentBmwEncodingProps): VNode {
  const { id, options } = props;
  const { columnStart, columnSpan, rowStart, rowSpan } = options;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  const contentsMarkupArray = generateMarkupArray(
    changeEncodingContents.value, cursorPositionSignal.value
  );

  const inputAreaClicked = (): void => {
    cursorPositionSignal.value = getSymbolIndexAtCursor(document.getElementById(INPUT_AREA_ID));
    console.debug(`NEW cursor position: ${cursorPositionSignal.value}`);
  };

  return html`
    <div id="${id}" class="bmwEncodingArea" role="textbox" aria-label="Input Area" aria-readonly="true" style="${gridStyles}" onClick="${inputAreaClicked}">
      ${contentsMarkupArray}
    </div>
  `;
}
