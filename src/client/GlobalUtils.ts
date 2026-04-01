/*
 * Copyright 2024 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */
import {
  JsonPaletteType, SymbolEncodingType, ContentSignalDataType, BciAvIdType
} from "./index.d";

/**
 * Global Utility Functions
 */

/**
 * Generate the grid css.
 * @param {number} columnStart - The number of the column that the grid item will start from.
 * @param {number} columnSpan - The number of columns that the item will span across.
 * @param {number} rowStart - The number of the row that the grid item will start from.
 * @param {number} rowSpan - The number of rows that the item will span across.
 * @return {String} - The grid css.
 */
function generateGridStyle(columnStart: number, columnSpan: number, rowStart: number, rowSpan: number): string {
  return `grid-column: ${columnStart} / span ${columnSpan};grid-row: ${rowStart} / span ${rowSpan};`;
}

/**
 * Use the text-to-speech to announce the given text. If the previous announcement is still going
 * on, cancel it.
 * @param {String} text - The text to be announced.
 */
function speak(text): void {
  // If the text-to-speech feature is unavailable, do nothing. This happens when running node tests.
  if (!window.speechSynthesis) {
    return;
  }

  // Cancel the previous announcement
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
  }
  // Announce the current text
  const utterThis = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterThis);
}

/**
 * Load a palette from the given JSON file using `fetch()`. The location of the
 * JSON file is provided as a variable. If the loading fails, a console error with
 * detailed error message is reported.
 *
 * @param {String} jsonFilePath - Path of the JSON file to load, without the
 *                                ".json" extension (added herein).
 * @return {JsonPaletteType}    - The palette itself, or `null` if it could not be
 *                                loaded.
 */
async function loadPaletteFromJsonFile (jsonFilePath: string): Promise<JsonPaletteType> {
  try {
    const response = await fetch(jsonFilePath);
    if (!response.ok) {
      console.error(`Error loading ${jsonFilePath}: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error loading ${jsonFilePath}:, ${error}`);
  }
}

/**
 * Given a current set of Bliss-words, the caret position and a Bliss-word to
 * add, insert the new word at the caret position in the set of symbols and
 * update to the new caret position.
 * @param {SymbolEncodingType} wordToAdd   - The new Bliss-word to add.
 * @param {SymbolEncodingType[]} symbolSet - The set of Bliss-words to add to.
 * @param {number} caretPos                - The insertion point within
 *                                           `symbolSet`.
 * @return {ContentSignalDataType} - the modified symbol set and new position of
 *                                   the insertion caret.
 */
function insertWordAtCaret (wordToAdd: SymbolEncodingType, symbolSet: SymbolEncodingType[], caretPos: number ): ContentSignalDataType {
  let newSymbolSet;
  // If the `caretPos` is the last symbol in the `symbolSet`, append the new
  // `wordToAdd`.  If the `caretPos` is somwhere within the `symbolSet`, put the
  // new symbol right after the `caretPos`.  In both cases add one to the caret
  // position.
  const newCaretPos = caretPos + 1;
  if (caretPos === symbolSet.length-1) {
    newSymbolSet = {
      payloads: [...symbolSet, wordToAdd],
      caretPosition: newCaretPos
    };
  }
  else {
    symbolSet.splice(newCaretPos, 0, wordToAdd);
    newSymbolSet = {
      payloads: symbolSet,
      caretPosition: newCaretPos
    };
  }
  return newSymbolSet;
}

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
function clamp (value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Add the given symbol to the current contents at the given caret position.
 *
 * @param {BciAvIdType} bciAvIdToAdd - Symbol to add to current symbol
 * @param {string} label - The label associated with `bciAvIdToAdd`
 * @param {boolean} isModifier - Indicates if `bciAvIdToAdd` is a modifier symbol
 * @param {ContentSignalDataType} encodingContents - Contents to add the symbol to.
 * @param {boolean} prepend - Optional flag to allow prepending, default is to
 *                            append (`false`)
 * @return {ContentSignalDataType} - the modified contents.
 */
function composeBlissWord (bciAvIdToAdd: BciAvIdType, label: string, isModifier: boolean, encodingContents: ContentSignalDataType, prepend?: boolean): ContentSignalDataType {
  // Guarantee that `bciAvIdToAdd` is the array form
  bciAvIdToAdd = ( typeof bciAvIdToAdd === "number" ? [bciAvIdToAdd] : bciAvIdToAdd );

  // Get the symbol at the caret position.
  const { caretPosition, payloads } = encodingContents;
  let symbolToEdit;
  let newBciAvId;
  if (caretPosition < 0) {
    newBciAvId = bciAvIdToAdd;
    symbolToEdit = {
      id: "foobar",
      label: label,
      bciAvId: newBciAvId,
      modifiefInfo: []
    };
  }
  else {
    symbolToEdit = payloads[caretPosition];
    newBciAvId = (
      typeof symbolToEdit.bciAvId === "number" ?
        [symbolToEdit.bciAvId] :
        symbolToEdit.bciAvId
    );
    if (prepend) {
      newBciAvId = [ ...bciAvIdToAdd, "/", ...newBciAvId ];
    }
    else {
      newBciAvId = [ ...newBciAvId, "/", ...bciAvIdToAdd ];
    }
  }
  // If the `bciAvIdToAdd` is a modifier, push the new modifier information
  // into the `modifierInfo` of the `symbolToEdit`, tracking the order in which
  // the modifiers were added.
  let newLabel;
  if (isModifier) {
    symbolToEdit.modifierInfo.push({
      modifierId: bciAvIdToAdd,
      modifierGloss: label,
      isPrepended: prepend
    });
    newLabel = `${label} ${symbolToEdit.label}`;
  }
  else {
    newLabel = ( prepend ? `${label} ${symbolToEdit.label}` : `${symbolToEdit.label} ${label}` );
  }
  payloads[caretPosition] = {
    "id": symbolToEdit.id + newBciAvId.join(""),
    "label": newLabel,
    "bciAvId": newBciAvId,
    "modifierInfo": symbolToEdit.modifierInfo
  };
  return {
    payloads: payloads,
    caretPosition: caretPosition
  };
}

/**
 * Remove the last symbol at the caret the given contents.
 * Note: what is really wanted is something that removes the last
 * Bliss-character.
 *
 * @param {ContentSignalDataType} encodingContents - Contents to add the symbol to.
 * @return {ContentSignalDataType} - the modified contents.
 */
function removeLastSymbol (encodingContents: ContentSignalDataType): ContentSignalDataType {
  //   // Get the symbol at the caret position
  //   const { caretPosition, payloads } = encodingContents;
  //   const symbolToEdit = payloads[caretPosition];
  //   const symbolBciAvId = (
  //     Array.isArray(symbolToEdit.bciAvId) ?
  //     symbolToEdit.bciAvId :
  //     [ symbolToEdit.bciAvId ]
  //   );
  //   const bciAvIdToEdit = symbolBciAvId as Array<string | number>;
  //   console.debug(`TYPEOF bciAvIdToEdit is ${typeof bciAvIdToEdit}, Array.isArray() is ${Array.isArray(bciAvIdToEdit)}`);
  //
  //   // Find the last "/" in the bciAvId, and truncate from there.
  //   const forFun = [ 55, "/", 77];
  //   const lastSlashForFun = forFun.findLastIndex( (item) => item === "/");
  //   console.debug(`lastSlashForFun is ${lastSlashForFun}`);
  //
  //   const lastSlashIndex = bciAvIdToEdit.findLastIndex( (item) => item === "/");
  //   const newBciAvId = bciAvIdToEdit.slice(0, lastSlashIndex);
  //   payloads[caretPosition] = {
  //     "id": symbolToEdit.id,
  //     "label": symbolToEdit.label,
  //     "bciAvId": newBciAvId,
  //     "modifierInfo": symbolToEdit.modifierInfo // Might be incorrect becauase of this function
  //   };
  //   return {
  //     payloads: payloads,
  //     caretPosition: caretPosition
  //   };
  return {
    payloads: encodingContents.payloads,
    caretPosition: encodingContents.caretPosition
  };
}

export {
  generateGridStyle,
  speak,
  loadPaletteFromJsonFile,
  insertWordAtCaret,
  clamp,
  composeBlissWord,
  removeLastSymbol
};
