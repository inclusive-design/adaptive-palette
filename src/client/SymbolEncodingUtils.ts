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
import { SymbolEncodingType, ContentSignalDataType, ModifierInfoType } from "./index.d";

/**
 * Operations on the symbols of a composed message: inserting one at the caret, rebuilding a
 * symbol's label from its tracked modifiers, and normalizing a symbol's composition.
 */

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
export function insertWordAtCaret (wordToAdd: SymbolEncodingType, symbolSet: SymbolEncodingType[], caretPos: number ): ContentSignalDataType {
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
 * Rebuild a label by folding a symbol's tracked modifiers around a base label in the
 * order they were applied.
 * @param {string} baseLabel - The base label to wrap, with no modifier text applied.
 * @param {ModifierInfoType[]} [modifierInfo] - The modifiers to fold in, in application order.
 * @returns {string} - The base label wrapped in every tracked modifier.
 */
export function applyModifiersToLabel (baseLabel: string, modifierInfo?: ModifierInfoType[]): string {
  return (modifierInfo ?? []).reduce(
    (label, modifier) => modifier.isPrepended ? `${modifier.modifierGloss} ${label}` : `${label} ${modifier.modifierGloss}`,
    baseLabel
  );
}

/**
 * Collapse a single-number composition array (e.g. `[1433]`) to the bare number `1433`.
 * Multi-element and string-containing arrays pass through unchanged.
 * @param {number|(number|string)[]} composition - The composition to normalize.
 * @returns {number|(number|string)[]} - The normalized composition.
 */
export function normalizeComposition (composition: number | (number|string)[]): number | (number|string)[] {
  return Array.isArray(composition) && composition.length === 1 && typeof composition[0] === "number" ? composition[0] : composition;
}
