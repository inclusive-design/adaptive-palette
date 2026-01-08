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
import { changeEncodingContents } from "./GlobalData";
import { ContentBmwEncodingType, EncodingType } from "./index.d";
import { generateGridStyle, clamp } from "./GlobalUtils";
import "./ContentBmwEncoding.scss";

export const INPUT_AREA_ID = "bmw-encoding-area";   // better way?

type ContentBmwEncodingProps = {
  id: string,
  options: ContentBmwEncodingType
}

/*
 * Given an array of symbols and a caret position create the proper markup for
 * each symbol in the array:
 * - generate markup for each symbol,
 * - if the symbol is at the caret position, add caret styles to the markup,
 * - if the caret position is -1, and there are symbols in the array, add a
 *   special caret markup to indicate insertion is possible before the first
 *   symbol.
 * @param {ContentSignalDataType} symbols: Array of symbols and caret position.
 * @return {Array<VNode>} - Array of markup for the symbols
 */
function generateMarkupArray (payloadArray: Array<EncodingType>, caretPos: number): Array<VNode> {
  // NOTE:  if there are no payloads in the `payloadArray`, the map() function
  // immediately returns an empty array.  That is, the function passed to map()
  // will execute only if `payloadArray.length` is non-zero -- there is no need
  // to check for a length of zero within the mapping function.
  return payloadArray.map((payload, index) => {
    // Check inserting before first symbol
    if (index === 0 && caretPos === -1) {
      return html`
        <div class="blissSymbol insertionCaret">
          <${BlissSymbol} bciAvId=${payload.bciAvId} label=${payload.label} isPresentation="true" />
        </div>
      `;
    }
    else if (index === caretPos) {
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

export function moveCursor (positionChange: number = 1) {
  positionChange = Math.round(positionChange);

  // Note: the new caretPosition can equal -1 indicating that the caret is before the
  // first symbol in the `payloads` array.  But, it cannot be less than -1.
  const newPosition = clamp(changeEncodingContents.value.caretPosition + positionChange, -1, changeEncodingContents.value.payloads.length - 1);
  changeEncodingContents.value = {
    payloads: changeEncodingContents.value.payloads,
    caretPosition: newPosition
  };
};

export function incrementCursor () {
  moveCursor(1);
}

export function decrementCursor () {
  moveCursor(-1);
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
    decrementCursor();
  }

  if (event.key === "ArrowRight" || event.key === "ArrowUp") {
    incrementCursor();
  }
}

export function ContentBmwEncoding (props: ContentBmwEncodingProps): VNode {
  const { id, options } = props;
  const { columnStart, columnSpan, rowStart, rowSpan } = options;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  const contentsMarkupArray = generateMarkupArray(
    changeEncodingContents.value.payloads, changeEncodingContents.value.caretPosition
  );

  return html`
    <div
      id="${id}"
      class="bmwEncodingArea"
      role="textbox"
      aria-label="Input Area"
      aria-readonly="true"
      style="${gridStyles}"
      tabindex="0"
      onKeyDown=${handleKeyDown}>
      ${contentsMarkupArray}
    </div>
  `;
}
