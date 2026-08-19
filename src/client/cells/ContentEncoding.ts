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
import { BlissSymbol } from "../components/BlissSymbol";
import { changeEncodingContents } from "../state/GlobalData";
import { editMessage } from "../core/MessageEdit";
import { ContentEncodingType, BlissSymbolInfoType } from "../index.d";
import { generateGridStyle } from "../utils/GridUtils";
import { announceIfEnabled } from "../utils/SpeechUtils";
import "./ContentEncoding.scss";

export const INPUT_AREA_ID = "content-encoding-area";   // better way?

const isApplePlatform = navigator.platform.startsWith("Mac") || navigator.platform.startsWith("iPhone") || navigator.platform.startsWith("iPad");

/**
 * Returns the inputted value constrained to the `min` and `max` values.
 * The returned value will:
 *  - `min` if `value` was less than `min`
 *  - `max` if the `value` was greater than `max`
 *  - `value` if it fell within the `min` `max` range.
 *
 * @param {number} value - The value to evaluate
 * @param {number} min - The minimum value to be returned
 * @param {number} max - The maximum value to be returned
 * @returns {number} - The constrained value
 */
export function clamp (value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type ContentEncodingProps = {
  id: string,
  options: ContentEncodingType
}

/*
 * Given an array of symbols and a caret position create the proper markup for
 * each symbol in the array:
 * - generate markup for each symbol,
 * - if the symbol is at the caret position, add caret styles to the markup,
 * - if the caret position is -1, and there are symbols in the array, add a
 *   special caret markup to indicate insertion is possible before the first
 *   symbol.
 * This is the shared rendering primitive behind both `ContentEncoding` and `MessagePreview`.
 * @param {ContentSignalDataType} symbols: Array of symbols and caret position.
 * @return {Array<VNode>} - Array of markup for the symbols
 */
export function generateMarkupArray (payloadArray: Array<BlissSymbolInfoType>, caretPos: number): Array<VNode> {
  // NOTE:  if there are no payloads in the `payloadArray`, the map() function
  // immediately returns an empty array.  That is, the function passed to map()
  // will execute only if `payloadArray.length` is non-zero -- there is no need
  // to check for a length of zero within the mapping function.
  return payloadArray.map((payload, index) => {
    // Check inserting before first symbol
    if (index === 0 && caretPos === -1) {
      return html`
        <div class="blissSymbol insertionCaret">
          <${BlissSymbol} composition=${payload.composition} label=${payload.label} isPresentation="true" />
        </div>
      `;
    }
    else if (index === caretPos) {
      return html`
        <div class="blissSymbol cursorCaret">
          <${BlissSymbol} composition=${payload.composition} label=${payload.label} isPresentation="true" />
        </div>
      `;
    }
    else {
      return html`
        <div class="blissSymbol">
          <${BlissSymbol} composition=${payload.composition} label=${payload.label} isPresentation="true" />
        </div>
      `;
    }
  });
}

function moveCursor (positionChange: number = 1) {
  // Note: the new caretPosition can equal -1 indicating that the caret is before the
  // first symbol in the `payloads` array.  But, it cannot be less than -1.
  const newPosition = clamp(changeEncodingContents.value.caretPosition + positionChange, -1, changeEncodingContents.value.payloads.length - 1);
  // Through the gate like any other edit, though the symbols do not change. A guard that
  // compares the message text has nothing to object to, so a caret move normally passes.
  editMessage({
    payloads: changeEncodingContents.value.payloads,
    caretPosition: newPosition
  });
};

export function incrementCursor () {
  moveCursor(1);
}

export function decrementCursor () {
  moveCursor(-1);
}

export function moveCursorToHome () {
  moveCursor(Number.NEGATIVE_INFINITY);
};

export function moveCursorToEnd () {
  moveCursor(Number.POSITIVE_INFINITY);
};

function handleKeyDown(event: KeyboardEvent) {
  if ((!(isApplePlatform && event.metaKey) && event.key === "ArrowLeft") || event.key === "ArrowDown") {
    decrementCursor();
    announceIfEnabled("backward");
  }

  if ((!(isApplePlatform && event.metaKey) && event.key === "ArrowRight") || event.key === "ArrowUp") {
    incrementCursor();
    announceIfEnabled("forward");
  }

  if (
    event.key === "Home" ||
    (event.ctrlKey && event.key === "a") ||
    (isApplePlatform && event.metaKey && event.key === "ArrowLeft")
  ) {
    event.preventDefault();
    moveCursorToHome();
    announceIfEnabled("move cursor to start");
  }

  if (
    event.key === "End" ||
    (event.ctrlKey && event.key === "e") ||
    (isApplePlatform && event.metaKey && event.key === "ArrowRight")
  ) {
    event.preventDefault();
    moveCursorToEnd();
    announceIfEnabled("move cursor to end");
  }
}

export function ContentEncoding (props: ContentEncodingProps): VNode {
  const { id, options } = props;
  const { columnStart, columnSpan, rowStart, rowSpan } = options;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  const contentsMarkupArray = generateMarkupArray(
    changeEncodingContents.value.payloads, changeEncodingContents.value.caretPosition
  );

  return html`
    <div
      id="${id}"
      class="contentEncodingArea"
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
