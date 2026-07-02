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
  SymbolEncodingType,
  SymbolCompositionType
} from "./index.d";

import { clamp } from "./GlobalUtils";
import { combineSymbolId } from "./GlobalData";

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

function moveCursor (positionChange: number, contentSignal: ContentSignalDataType, combineSymbolId: number) {
  const { payloads, caretPosition } = contentSignal;
  const max = payloads.length - 1;
  // If the payloads are composed symbol, the caret must stay inside the combine symbols
  // disallow -1 as a landing position. Otherwise -1 remains valid.
  const min = isCombined(payloads, combineSymbolId) ? 0 : -1;

  let newPosition = clamp(caretPosition + positionChange, min, max);

  const direction = Math.sign(positionChange);
  if (direction !== 0) {
    while (newPosition >= 0 && newPosition <= max && payloads[newPosition].composition === combineSymbolId) {
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
  let newCaretPosition = caretPosition - 1;
  while (newCaretPosition >= 0 && newEncodingContents[newCaretPosition].composition === combineSymbolId) {
    newCaretPosition -= 1;
  }

  // If the position fell off the left side but the array still leads with a combine symbol
  // the caret is now outside the wrap. Try to find a symbol inside the wrap by going right

  if (newCaretPosition === -1 && newEncodingContents.length > 0 && newEncodingContents[0] === combineSymbolId) {
    let updatedPosition = 1;
    while (updatedPosition < newEncodingContents.length && newEncodingContents[updatedPosition].composition === combineSymbolId) {
      updatedPosition += 1;
    }

    if (updatedPosition >= newEncodingContents.length) {
      // Only combine symbols in the payloads, remove the symbols and reset
      return { payloads: [], caretPosition: -1 };
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

function uncombineContent (contentSignal: ContentSignalDataType, combineSymbolId: number): ContentSignalDataType {
  const { payloads, caretPosition } = contentSignal;

  const firstCombineIndex = payloads.findIndex(p => p.composition === combineSymbolId);
  const lastCombineIndex = payloads.findLastIndex(p => p.composition === combineSymbolId);

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


