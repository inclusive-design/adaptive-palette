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
import { SymbolEncodingType, ContentSignalDataType, ModifierInfoType, SymbolCompositionType } from "../index.d";

/**
 * Operations on the symbols of a composed message: inserting one at the caret, rebuilding a
 * symbol's label from its tracked modifiers, and normalizing a symbol's composition.
 */

// The Bliss comma. It may separate the words of a new word (§8.7).
export const COMMA_ID = 5;

/**
 * A space part: separates two words in a new word. It has no symbol, so
 * modifiers and indicators are unavailable on it, as on a picture.
 */
export const SPACE_PART: SymbolEncodingType = { label: "", isSpace: true };

/**
 * Whether a part is a word rather than a space or a comma. A space goes in only between two words.
 * @param {SymbolEncodingType | undefined} payload - The part, or `undefined` for none.
 * @returns {boolean}
 */
export function isWordPart (payload: SymbolEncodingType | undefined): boolean {
  return payload !== undefined && !payload.isSpace && payload.composition !== COMMA_ID;
}

/**
 * Given a current set of Bliss-words, the caret position and a Bliss-word to add, return the
 * set with the new word inserted right after the caret and the caret moved onto it. A caret of
 * -1 is before the first symbol, so the word goes at the front.
 * @param {SymbolEncodingType} wordToAdd   - The new Bliss-word to add.
 * @param {SymbolEncodingType[]} symbolSet - The set of Bliss-words to add to. Not modified.
 * @param {number} caretPos                - The insertion point within `symbolSet`.
 * @param {boolean} spaced                 - Whether words are spaced, as inside a new word's
 *                                           combine markers. A word added after a word then gets
 *                                           a space before it.
 * @return {ContentSignalDataType} - A new symbol set and the new caret position.
 */
export function insertWordAtCaret (
  wordToAdd: SymbolEncodingType, symbolSet: SymbolEncodingType[], caretPos: number, spaced = false
): ContentSignalDataType {
  const added = spaced && isWordPart(wordToAdd) && isWordPart(symbolSet[caretPos])
    ? [SPACE_PART, wordToAdd]
    : [wordToAdd];
  const insertAt = caretPos + 1;
  return {
    payloads: [...symbolSet.slice(0, insertAt), ...added, ...symbolSet.slice(insertAt)],
    caretPosition: caretPos + added.length
  };
}

/**
 * Delete the symbol at the caret and move the caret onto the one before. Deleting a word also
 * deletes a space just before it. Nothing changes when the caret is before the first symbol.
 * @param {SymbolEncodingType[]} symbolSet - The symbols. Not modified.
 * @param {number} caretPos                - The caret position.
 * @returns {ContentSignalDataType}
 */
export function deleteAtCaret (symbolSet: SymbolEncodingType[], caretPos: number): ContentSignalDataType {
  if (caretPos < 0) {
    return { payloads: symbolSet, caretPosition: caretPos };
  }
  const from = isWordPart(symbolSet[caretPos]) && symbolSet[caretPos - 1]?.isSpace ? caretPos - 1 : caretPos;
  return {
    payloads: [...symbolSet.slice(0, from), ...symbolSet.slice(caretPos + 1)],
    caretPosition: from - 1
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
 * The composition of the Bliss symbol at the caret, or `undefined` when there is none: the caret
 * is before the first symbol, or on a picture. Indicators and modifiers need one to change.
 * @param {ContentSignalDataType} contents - The message and its caret.
 * @returns {SymbolCompositionType | undefined}
 */
export function caretComposition (contents: ContentSignalDataType): SymbolCompositionType | undefined {
  return contents.payloads[contents.caretPosition]?.composition;
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
 * The reverse of `applyModifiersToLabel()` for one modifier: remove its text from the start
 * for a prefix, from the end for a suffix, so a short gloss such as "one" does not cut into the
 * word ("phone one" → "phone"). A label reworded since the modifier was added falls back to
 * removing the first whole-word match.
 * @param {string} label - The label holding the modifier's text.
 * @param {string} gloss - The modifier's text.
 * @param {boolean} isPrepended - Whether the modifier is a prefix.
 * @returns {string} - The label without the modifier's text.
 */
export function removeModifierFromLabel (label: string, gloss: string, isPrepended: boolean): string {
  if (isPrepended && label.startsWith(`${gloss} `)) {
    return label.slice(gloss.length + 1);
  }
  if (!isPrepended && label.endsWith(` ${gloss}`)) {
    return label.slice(0, -(gloss.length + 1));
  }
  const escaped = gloss.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return label.replace(new RegExp(`(^|\\s)${escaped}(?=\\s|$)`), "").replace(/\s+/g, " ").trim();
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
