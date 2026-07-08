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
import { Signal } from "@preact/signals";

import { BlissSymbol } from "./BlissSymbol";
import { ContentEncodingType, EncodingType, ContentSignalDataType } from "./index.d";
import { generateGridStyle, speak } from "./GlobalUtils";
import { combineSymbolId } from "./GlobalData";
import { moveCursor } from "./CursorActions";
import "./ContentEncoding.scss";

const isApplePlatform = /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

type ContentEncodingInputFieldProps = {
  id: string,
  options: ContentEncodingType,
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
    const isInsertion = index === 0 && caretPos === -1;
    const isCursor = index === caretPos;
    
    // Combine classes based on conditions
    let className = "blissSymbol";
    if (isInsertion) className += " insertionCaret";
    if (isCursor) className += " cursorCaret";

    return html`
      <div class="${className}">
        <${BlissSymbol} composition=${payload.composition} label=${payload.label} isPresentation="true" />
      </div>
    `;
  });
}

export function incrementCursor (contentSignal: Signal<ContentSignalDataType>) {
  contentSignal.value = moveCursor(1, contentSignal.value, combineSymbolId);
}

export function decrementCursor (contentSignal: Signal<ContentSignalDataType>) {
  contentSignal.value = moveCursor(-1, contentSignal.value, combineSymbolId);
}

export function moveCursorToHome (contentSignal: Signal<ContentSignalDataType>) {
  contentSignal.value = moveCursor(Number.NEGATIVE_INFINITY, contentSignal.value, combineSymbolId);
};

export function moveCursorToEnd (contentSignal: Signal<ContentSignalDataType>) {
  contentSignal.value = moveCursor(Number.POSITIVE_INFINITY, contentSignal.value, combineSymbolId);
};

export function ContentEncodingInputField (props: ContentEncodingInputFieldProps): VNode {
  const { id, options, contentsSignal, ariaLabel } = props;
  const { columnStart, columnSpan, rowStart, rowSpan } = options;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  const contentsMarkupArray = generateMarkupArray(
    contentsSignal.value.payloads, contentsSignal.value.caretPosition
  );

  const handleKeyDown = (event: KeyboardEvent) => {
    const element = event.target as HTMLElement;
    if ((!(isApplePlatform && event.metaKey) && event.key === "ArrowLeft") || event.key === "ArrowDown") {
      event.preventDefault();
      decrementCursor(contentsSignal);
      speak("backward");
    }

    if ((!(isApplePlatform && event.metaKey) && event.key === "ArrowRight") || event.key === "ArrowUp") {
      event.preventDefault();
      incrementCursor(contentsSignal);
      speak("forward");
    }

    if (
      event.key === "Home" ||
      (event.ctrlKey && event.key === "a") ||
      (isApplePlatform && event.metaKey && event.key === "ArrowLeft")
    ) {
      event.preventDefault();
      moveCursorToHome(contentsSignal);
      speak("move cursor to start");
    }

    if (
      event.key === "End" ||
      (event.ctrlKey && event.key === "e") ||
      (isApplePlatform && event.metaKey && event.key === "ArrowRight")
    ) {
      event.preventDefault();
      moveCursorToEnd(contentsSignal);
      speak("move cursor to end");
    }
  }

  return html`
    <div
      id="${id}"
      class="contentEncodingArea"
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
