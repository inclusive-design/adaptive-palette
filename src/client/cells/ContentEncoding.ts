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
import { adaptivePaletteGlobals, changeEncodingContents, settingsSavedCount, wordBuildSignal } from "../state/GlobalData";
import { editMessage } from "../core/MessageEdit";
import { ContentEncodingType, SymbolEncodingType } from "../index.d";
import { COMBINE_MARKER_ID } from "../utils/SvgUtils";
import { generateGridStyle } from "../utils/GridUtils";
import { announceIfEnabled } from "../utils/SpeechUtils";
import { t } from "../i18n/I18n";
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

// The caret position given for the message around a word being built: no symbol in it has the
// caret, since the caret is in the word.
const NO_CARET = -2;

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
export function generateMarkupArray (payloadArray: Array<SymbolEncodingType>, caretPos: number): Array<VNode> {
  // Read once here rather than per symbol.
  const markAiSuggestions = adaptivePaletteGlobals.config.markAiSuggestions;
  // NOTE:  if there are no payloads in the `payloadArray`, the map() function
  // immediately returns an empty array.  That is, the function passed to map()
  // will execute only if `payloadArray.length` is non-zero -- there is no need
  // to check for a length of zero within the mapping function.
  return payloadArray.map((payload, index) => {
    const isMarked = payload.isAiLabel && markAiSuggestions;
    // The caret before the first symbol, the caret on this symbol, or no caret.
    const caretClass = index === 0 && caretPos === -1 ? " insertionCaret" : index === caretPos ? " cursorCaret" : "";
    // A space has no symbol: an outlined gap, named for a screen reader.
    if (payload.isSpace) {
      return html`<div class=${`blissSymbol wordSpace${caretClass}`}><span>${t("wordSpace")}</span></div>`;
    }
    return html`
      <div class=${`blissSymbol${caretClass}`}>
        <${BlissSymbol} composition=${payload.composition} picture=${payload.picture} label=${payload.label} isPresentation="true" isMarked=${isMarked} />
      </div>
    `;
  });
}

/**
 * The word being built: a dashed box inside the message, with a tag naming it, then its parts,
 * between two combine markers when the marker is on. An empty word shows the caret alone.
 * @param {SymbolEncodingType[]} parts - The word's parts.
 * @param {number} caretPos - The caret's position in the parts.
 * @param {boolean} combine - Whether the combine marker is on.
 * @return {VNode}
 */
function newWordMarkup (parts: SymbolEncodingType[], caretPos: number, combine: boolean): VNode {
  // A function, so each end gets an element of its own.
  const marker = (): VNode | null => combine
    ? html`<div class="blissSymbol combineMarker">
        <${BlissSymbol} composition=${COMBINE_MARKER_ID} label=${t("combineMarker")} isPresentation="true" />
      </div>`
    : null;
  const partsMarkup = parts.length === 0
    ? html`<div class="blissSymbol insertionCaret emptyWord"></div>`
    : generateMarkupArray(parts, caretPos);
  return html`
    <div class="newWord">
      <span class="newWordTag">${t("newWordTag")}</span>
      ${marker()}${partsMarkup}${marker()}
    </div>
  `;
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
    announceIfEnabled(t("cursorBackward"));
  }

  if ((!(isApplePlatform && event.metaKey) && event.key === "ArrowRight") || event.key === "ArrowUp") {
    incrementCursor();
    announceIfEnabled(t("cursorForward"));
  }

  if (
    event.key === "Home" ||
    (event.ctrlKey && event.key === "a") ||
    (isApplePlatform && event.metaKey && event.key === "ArrowLeft")
  ) {
    event.preventDefault();
    moveCursorToHome();
    announceIfEnabled(t("cursorStart"));
  }

  if (
    event.key === "End" ||
    (event.ctrlKey && event.key === "e") ||
    (isApplePlatform && event.metaKey && event.key === "ArrowRight")
  ) {
    event.preventDefault();
    moveCursorToEnd();
    announceIfEnabled(t("cursorEnd"));
  }
}

export function ContentEncoding (props: ContentEncodingProps): VNode {
  // Read so this draws again after a save. See `settingsSavedCount`.
  void settingsSavedCount.value;
  const { id, options } = props;
  const { columnStart, columnSpan, rowStart, rowSpan } = options;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  const { payloads, caretPosition } = changeEncodingContents.value;
  const build = wordBuildSignal.value;
  // While a word is built, the input area holds its parts. The message is drawn around them,
  // with the word where it will go: after the message's caret.
  const splitAt = build ? build.message.caretPosition + 1 : 0;
  const contentsMarkupArray = build
    ? [
      ...generateMarkupArray(build.message.payloads.slice(0, splitAt), NO_CARET),
      newWordMarkup(payloads, caretPosition, build.combine),
      ...generateMarkupArray(build.message.payloads.slice(splitAt), NO_CARET)
    ]
    : generateMarkupArray(payloads, caretPosition);

  return html`
    <div
      id="${id}"
      class="contentEncodingArea"
      role="textbox"
      aria-label=${t("inputArea")}
      aria-readonly="true"
      style="${gridStyles}"
      tabindex="0"
      onKeyDown=${handleKeyDown}>
      ${contentsMarkupArray}
    </div>
  `;
}
