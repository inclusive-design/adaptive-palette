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

import type {
  ContentSignalDataType,
  SymbolEncodingType
} from "./index.d";

import { clamp } from "./GlobalUtils";

/**
 * Check if payloads is a wrapped in combine symbols
 * 
 * @param {Array<SymbolEncodingType>} payloads - An array of input symbols
 * @param {number} combineSymbolId - Id of the combine symbol
 * 
 */
function isCombined(payloads: Array<SymbolEncodingType>, combineSymbolId: number): boolean {
  return (
    payloads.length >=2 &&
    payloads[0].composition === combineSymbolId &&
    payloads[payloads.length - 1].composition === combineSymbolId
  );
}

/**
 * Find next non combine symbol in the direction traversing
 * 
 * @param {Array<SymbolEncodingType>} payloads - An array of input symbols
 * @param {number} startIndex - Beginning index of the traverse
 * @param {number} direction - Direction of the traverse, -1 or 1
 * @param {number} combineSymbolId - Id of the combine symbol
 * 
 */
function findNextNonCombineSymbol(payloads: Array<SymbolEncodingType>, startIndex: number, direction: number, combineSymbolId: number) {
  let currentIndex = startIndex;
  while (currentIndex >= 0 && currentIndex < payloads.length && payloads[currentIndex].composition === combineSymbolId) {
    currentIndex += direction;
  }
  return currentIndex;
}

/**
 * Update the cursor movement by updating the content signal
 * 
 * @param {number} positionChange - Position change of the cursor, negative value indicating cursor moving left
 * @param {ContentSignalDataType} contentSignal - Signal representing the current payloads
 * @param {number} combineSymbolId - Id of the combine symbol
 * 
 */
function moveCursor (positionChange: number, contentSignal: ContentSignalDataType, combineSymbolId: number) {
  const { payloads, caretPosition } = contentSignal;
  const max = payloads.length - 1;
  // If the payloads are composed symbol, the caret must stay inside the combine symbols
  // disallow -1 as a landing position. Otherwise -1 remains valid.
  const min = isCombined(payloads, combineSymbolId) ? 0 : -1;

  let newPosition = clamp(caretPosition + positionChange, min, max);

  const direction = Math.sign(positionChange);
  if (direction !== 0) {
    // Use the helper function to find the next position
    const candidatePosition = findNextNonCombineSymbol(payloads, newPosition, direction, combineSymbolId);
    
    // If the next position pushes us out of bounds, revert to original caretPosition
    newPosition = (candidatePosition < min || candidatePosition > max) ? caretPosition: candidatePosition;
  }

  if (newPosition === caretPosition) {
    return contentSignal;
  }

  return {
    payloads,
    caretPosition: newPosition
  };
};

/**
 * Delete symbol at current caret position
 * 
 * @param {ContentSignalDataType} contentSignal - Signal representing the current payloads
 * @param {number} combineSymbolId - Id of the combine symbol
 * 
 */
function deleteAtCaret (contentSignal: ContentSignalDataType, combineSymbolId: number): ContentSignalDataType {
  const { payloads, caretPosition } = contentSignal;

  // Nothing to do if:
  // - there are no symbols (payloads), or
  // - there are symbols, but the caret is for inserting before the first
  //   symbol
  if (payloads.length === 0 || caretPosition === -1) {
    return contentSignal;
  }
	
  const newEncodingContents = [...payloads];
  newEncodingContents.splice(caretPosition, 1);

  // Walk the caret left, skipping over any combine symbols
  let newCaretPosition = findNextNonCombineSymbol(newEncodingContents, caretPosition - 1, -1, combineSymbolId);

  // If the position fell off the left side but the array still leads with a combine symbol
  // the caret is now outside the wrap. Try to find a symbol inside the wrap by going right

  if (newCaretPosition === -1 && newEncodingContents.length > 0 && newEncodingContents[0].composition === combineSymbolId) {
    const updatedPosition = findNextNonCombineSymbol(newEncodingContents, 1, 1, combineSymbolId);

    if (updatedPosition >= newEncodingContents.length) {
      // Only combine symbols in the payloads, remove the symbols and reset
      return { payloads: [], caretPosition: -1 };
    }

    newCaretPosition = updatedPosition;
  }

  return { payloads: newEncodingContents, caretPosition: newCaretPosition };
}

/**
 * Wrap current content with combine symbols
 * 
 * @param {ContentSignalDataType} contentSignal - Signal representing the current payloads
 * @param {SymbolEncodingType} combineSymbol - Symbol Encoding of combine symbol
 * 
 */
function combineContent (contentSignal: ContentSignalDataType, combineSymbol: SymbolEncodingType): ContentSignalDataType {
  const { payloads, caretPosition } = contentSignal;
  if (payloads.length === 0) return contentSignal;

  return {
    payloads: [combineSymbol, ...payloads, combineSymbol],
    caretPosition: caretPosition === -1 ? 1 : caretPosition + 1
  };
}

/**
 * Unwrap current content with combine symbols
 * 
 * @param {ContentSignalDataType} contentSignal - Signal representing the current payloads
 * @param {SymbolEncodingType} combineSymbol - Symbol Encoding of combine symbol
 * 
 */
function uncombineContent (contentSignal: ContentSignalDataType, combineSymbolId: number): ContentSignalDataType {
  const { payloads, caretPosition } = contentSignal;

  const firstCombineIndex = payloads.findIndex((p) => p.composition === combineSymbolId);
  const lastCombineIndex = payloads.findLastIndex((p) => p.composition === combineSymbolId);

  if (firstCombineIndex === -1 || firstCombineIndex === lastCombineIndex) {
    return contentSignal;
  }

  const newPayloads = payloads.filter((_, i) => i !== firstCombineIndex && i !== lastCombineIndex);

  let newCaretPosition: number;

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

  return { payloads: newPayloads, caretPosition: newCaretPosition };
}

export {
  isCombined,
  moveCursor,
  deleteAtCaret,
  combineContent,
  uncombineContent
};


