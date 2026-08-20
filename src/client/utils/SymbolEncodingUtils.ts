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
import { SymbolEncodingType, ContentSignalDataType, ModifierInfoType } from "../index.d";

/**
 * Operations on the symbols of a composed message: inserting one at the caret, rebuilding a
 * symbol's label from its tracked modifiers, and normalizing a symbol's composition.
 */

/**
 * Given a current set of Bliss-words, the caret position and a Bliss-word to add, return the
 * set with the new word inserted right after the caret and the caret moved onto it. A caret of
 * -1 is before the first symbol, so the word goes at the front.
 * @param {SymbolEncodingType} wordToAdd   - The new Bliss-word to add.
 * @param {SymbolEncodingType[]} symbolSet - The set of Bliss-words to add to. Not modified.
 * @param {number} caretPos                - The insertion point within `symbolSet`.
 * @return {ContentSignalDataType} - A new symbol set and the new caret position.
 */
export function insertWordAtCaret (wordToAdd: SymbolEncodingType, symbolSet: SymbolEncodingType[], caretPos: number ): ContentSignalDataType {
  const newCaretPos = caretPos + 1;
  return {
    payloads: [...symbolSet.slice(0, newCaretPos), wordToAdd, ...symbolSet.slice(newCaretPos)],
    caretPosition: newCaretPos
  };
}

/**
 * Return a copy of the symbols with the one at the caret replaced. Used by the cells that
 * change the symbol already at the caret rather than adding one.
 *
 * `.map()` rather than `Array.prototype.with()`: `with()` is ES2023 and `tsconfig.json`
 * targets ES2022.
 * @param {SymbolEncodingType[]} payloads - The symbols in the message. Not modified.
 * @param {number} caretPos               - Which one to replace.
 * @param {SymbolEncodingType} payload    - What to put there.
 * @returns {SymbolEncodingType[]} - A new array.
 */
export function replaceAtCaret (
  payloads: SymbolEncodingType[], caretPos: number, payload: SymbolEncodingType
): SymbolEncodingType[] {
  return payloads.map((existing, index) => index === caretPos ? payload : existing);
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
