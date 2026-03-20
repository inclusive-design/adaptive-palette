/*
 * Copyright 2023-2026 Inclusive Design Research Centre, OCAD University
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
import { Signal } from "@preact/signals";

import { BlissSymbol } from "./BlissSymbol";
import { contentSignalMap } from "./GlobalData";
import { ContentBmwEncodingType, EncodingType, ContentSignalDataType } from "./index.d";
import { generateGridStyle, clamp, speak } from "./GlobalUtils";
import "./ContentBmwEncoding.scss";

const isApplePlatform = navigator.platform.startsWith("Mac") || navigator.platform.startsWith("iPhone") || navigator.platform.startsWith("iPad");

type ContentEncodingInputFieldProps = {
  id: string,
  options: ContentBmwEncodingType,
  contentsSignal: Signal<ContentSignalDataType>,
  ariaLabel: string
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

function moveCursor (positionChange: number = 1, contentSignal: Signal<ContentSignalDataType>) {
  // Note: the new caretPosition can equal -1 indicating that the caret is before the
  // first symbol in the `payloads` array.  But, it cannot be less than -1.
  const newPosition = clamp(contentSignal.value.caretPosition + positionChange, -1, contentSignal.value.payloads.length - 1);
  contentSignal.value = {
    payloads: contentSignal.value.payloads,
    caretPosition: newPosition
  };
};

export function incrementCursor (contentSignal: Signal<ContentSignalDataType>) {
  moveCursor(1, contentSignal);
}

export function decrementCursor (contentSignal: Signal<ContentSignalDataType>) {
  moveCursor(-1, contentSignal);
}

export function moveCursorToHome (contentSignal: Signal<ContentSignalDataType>) {
  moveCursor(Number.NEGATIVE_INFINITY, contentSignal);
};

export function moveCursorToEnd (contentSignal: Signal<ContentSignalDataType>) {
  moveCursor(Number.POSITIVE_INFINITY, contentSignal);
};

function handleKeyDown(event: KeyboardEvent) {
  const element = event.target as HTMLElement;
  const contentSignal = contentSignalMap[element.id];
  if ((!(isApplePlatform && event.metaKey) && event.key === "ArrowLeft") || event.key === "ArrowDown") {
    decrementCursor(contentSignal);
    speak("backward");
  }

  if ((!(isApplePlatform && event.metaKey) && event.key === "ArrowRight") || event.key === "ArrowUp") {
    incrementCursor(contentSignal);
    speak("forward");
  }

  if (
    event.key === "Home" ||
    (event.ctrlKey && event.key === "a") ||
    (isApplePlatform && event.metaKey && event.key === "ArrowLeft")
  ) {
    event.preventDefault();
    moveCursorToHome(contentSignal);
    speak("move cursor to start");
  }

  if (
    event.key === "End" ||
    (event.ctrlKey && event.key === "e") ||
    (isApplePlatform && event.metaKey && event.key === "ArrowRight")
  ) {
    event.preventDefault();
    moveCursorToEnd(contentSignal);
    speak("move cursor to end");
  }
}

export function ContentEncodingInputField (props: ContentEncodingInputFieldProps): VNode {
  const { id, options, contentsSignal, ariaLabel } = props;
  const { columnStart, columnSpan, rowStart, rowSpan } = options;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  const contentsMarkupArray = generateMarkupArray(
    contentsSignal.value.payloads, contentsSignal.value.caretPosition
  );

  return html`
    <div
      id="${id}"
      class="bmwEncodingArea"
      role="textbox"
      aria-label="${ariaLabel}"
      aria-readonly="true"
      style="${gridStyles}"
      tabindex="0"
      onKeyDown=${handleKeyDown}>
      ${contentsMarkupArray}
    </div>
  `;
}
