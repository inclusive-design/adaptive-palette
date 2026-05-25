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

import type {
  ContentSignalDataType,
  SymbolEncodingType,
  BciAvIdType
} from "./index.d";

import { clamp } from "./GlobalUtils";

// Append BciAvId of symbols to skip navigating using moveCursor function to this list
const bciAvIdToSkip = [13382];

/**
 * Check if BciAvId is equal, as BciAvId can be an array or string.
 * 
 * @param {BciAvIdType} a - A BciAvId to be compared
 * @param {BciAvIdType} b - A BciAvId to be compared
 * @return {boolean} - result of the comparison
 */
function bciAvIdEqual (a: BciAvIdType, b: BciAvIdType): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return false;
  }
  return a == b;
}

/**
 * Check if payload contains BciAvIds to be skipped
 * 
 * @param {SymbolEncodingType} payload - An array of input symbols
 * @param {Array<BciAvIdType>} skipBciAvIds - An array of BciAvIds to be skipped
 * 
 */
function isSkipSymbol (payload: SymbolEncodingType, skipBciAvIds: Array<BciAvIdType>): boolean {
  return skipBciAvIds.some((id) => bciAvIdEqual(payload.bciAvId, id));
}

/**
 * Check if payloads is a combine symbol
 * 
 * @param {Array<SymbolEncodingType>} payloads - An array of input symbols
 * @param {Array<BciAvIdType>} skipBciAvIds - An array of BciAvIds to be skipped
 * 
 */
function isCombined(payloads: Array<SymbolEncodingType>, skipBciAvIds: Array<BciAvIdType>): boolean {
  return (
    payloads.length >=2 &&
		isSkipSymbol(payloads[0], skipBciAvIds) &&
		isSkipSymbol(payloads[payloads.length - 1], skipBciAvIds)
  );
}

function moveCursor (positionChange: number, contentSignal: ContentSignalDataType, skipBciAvIds: Array<BciAvIdType> = bciAvIdToSkip) {
  const { payloads, caretPosition } = contentSignal;
  const max = payloads.length - 1;
  // If the payloads are composed symbol, the caret must stay inside the combine symbols
  // disallow -1 as a landing position. Otherwise -1 remains valid.
  const min = isCombined(payloads, skipBciAvIds) ? 0 : -1;

  let newPosition = clamp(caretPosition + positionChange, min, max);

  const direction = Math.sign(positionChange);
  if (direction !== 0 && skipBciAvIds.length > 0) {
    while (newPosition >= 0 && newPosition <= max && isSkipSymbol(payloads[newPosition], skipBciAvIds)) {
      const updatedPosition = newPosition + direction;
      if (updatedPosition < min || updatedPosition > max) {
        newPosition = caretPosition;
        break;
      }
      newPosition = updatedPosition;
    }
  }

  if (newPosition === caretPosition) {
    return contentSignal;
  }

  return {
    payloads,
    caretPosition: newPosition
  };
};

function deleteAtCaret (contentSignal: ContentSignalDataType, skipBciAvIds: Array<BciAvIdType> = bciAvIdToSkip): ContentSignalDataType {
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

  // Walk the caret left, skipping over any skip symbols
  let newCaretPosition = caretPosition - 1;
  while (newCaretPosition >= 0 && isSkipSymbol(newEncodingContents[newCaretPosition], skipBciAvIds)) {
    newCaretPosition -= 1;
  }

  // If the position fell off the left side but the array still leads with a skip
  // the caret is now outside the wrap. Try to find a symbol inside the wrap by going right

  if (newCaretPosition === -1 && newEncodingContents.length > 0 && isSkipSymbol(newEncodingContents[0], skipBciAvIds)) {
    let updatedPosition = 1;
    while (updatedPosition < newEncodingContents.length && isSkipSymbol(newEncodingContents[updatedPosition], skipBciAvIds)) {
      updatedPosition += 1;
    }

    if (updatedPosition >= newEncodingContents.length) {
      // Only skip symbols in the payloads, remove the symbols and reset
      return { payloads: [], caretPosition: -1 };
      // speak(label);
    }

    newCaretPosition = updatedPosition;
  }

  return { payloads: newEncodingContents, caretPosition: newCaretPosition };
}

function combineContent (contentSignal: ContentSignalDataType, combineSymbol: SymbolEncodingType): ContentSignalDataType {
  const { payloads, caretPosition } = contentSignal;
  if (payloads.length === 0) return contentSignal;

  return {
    payloads: [combineSymbol, ...payloads, combineSymbol],
    caretPosition: caretPosition === -1 ? 1 : caretPosition + 1
  };
}

function uncombineContent (contentSignal: ContentSignalDataType, skipBciAvIds: Array<BciAvIdType>): ContentSignalDataType {
  const { payloads, caretPosition } = contentSignal;

  const firstCombineIndex = payloads.findIndex(p => isSkipSymbol(p, skipBciAvIds));
  let lastCombineIndex = -1;
  for (let i = payloads.length -1; i >=0; i--) {
    if (isSkipSymbol(payloads[i], skipBciAvIds)) {
      lastCombineIndex = i;
      break;
    }
  }

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
  bciAvIdEqual,
  bciAvIdToSkip,
  isSkipSymbol,
  isCombined,
  moveCursor,
  deleteAtCaret,
  combineContent,
  uncombineContent
};


