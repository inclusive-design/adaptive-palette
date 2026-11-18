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

/**
 * The one way to change the message being composed.
 *
 * Every cell that edits the message calls `editMessage()`. A feature with work that an edit
 * would destroy registers a guard through `setEditGuard()`, and the guard decides whether the
 * edit is published. An edit the guard holds never reaches the signal, so there is nothing to
 * take back.
 *
 * This lives in `core/` rather than in the feature that vetoes edits or clears the message, so
 * that no cell imports a feature.
 */
import { changeEncodingContents, wordBuildSignal } from "../state/GlobalData";
import { insertWordAtCaret, replaceAtCaret } from "../utils/SymbolEncodingUtils";
import { announceIfEnabled } from "../utils/SpeechUtils";
import type { ContentSignalDataType, SymbolEncodingType } from "../index.d";

/**
 * Decides whether an edit may be published. Returning `true` holds it: the guard has taken
 * the edit on and will either apply it later, then call `afterApply`, or drop both.
 */
export type EditGuard = (next: ContentSignalDataType, afterApply?: () => void) => boolean;

/**
 * The guard consulted before every edit, if one is registered.
 */
let guard: EditGuard | null = null;

/**
 * Register the guard consulted before every edit. Called from `core/InitGlobals.ts`.
 * With no guard registered, `editMessage()` is a plain write, so a feature that is switched
 * off or absent needs no special case.
 * @param {EditGuard | null} fn - The guard, or `null` to remove the one registered.
 * @returns {void}
 */
export function setEditGuard (fn: EditGuard | null): void {
  guard = fn;
}

/**
 * Empties the message together with what a feature keeps that belongs to it, such as the
 * sentences made from it. Registered from `core/InitGlobals.ts`.
 */
let clearer: (() => void) | null = null;

/**
 * Register what Delete all does. With none registered, it empties the message alone.
 * @param {Function | null} fn - The clearer, or `null` to remove the one registered.
 * @returns {void}
 */
export function setMessageClearer (fn: (() => void) | null): void {
  clearer = fn;
}

/**
 * Delete the whole message, through the registered clearer if there is one.
 * @returns {void}
 */
export function clearMessage (): void {
  if (clearer) {
    clearer();
    return;
  }
  editMessage({ payloads: [], caretPosition: -1 });
}

/**
 * Freeze a message so a writer cannot change it in place after publishing it. Everything a
 * writer builds is covered: the array of symbols with each symbol in it, and each symbol's
 * `modifierInfo` with its entries. A symbol's `composition` is left alone -- every writer copies
 * one before changing it, and a frozen symbol already refuses `payload.composition = ...`.
 *
 * Freezes the message it is given rather than returning a copy, and a later write to it
 * throws rather than passing unnoticed, because ES modules are strict mode throughout.
 * @param {ContentSignalDataType} contents - The message to freeze. Frozen in place.
 * @returns {void}
 */
function deepFreeze (contents: ContentSignalDataType): void {
  for (const payload of contents.payloads) {
    if (payload.modifierInfo) {
      for (const modifier of payload.modifierInfo) {
        Object.freeze(modifier);
      }
      Object.freeze(payload.modifierInfo);
    }
    Object.freeze(payload);
  }
  Object.freeze(contents.payloads);
  Object.freeze(contents);
}

/**
 * Publish a change to the message being composed, unless the registered guard holds it.
 * @param {ContentSignalDataType} next - The message as it would be after the edit.
 * @param {Function} afterApply - Optional. Called once the edit is published, now or when the
 *                                guard applies a held edit. Not called for an edit that is dropped.
 * @returns {boolean} - `true` when the edit was published, `false` when the guard held it.
 */
export function editMessage (next: ContentSignalDataType, afterApply?: () => void): boolean {
  // Frozen before the guard is asked, so an edit the guard holds is already safe from later
  // in-place changes by the time the guard applies it.
  deepFreeze(next);
  if (guard?.(next, afterApply)) {
    return false;
  }
  changeEncodingContents.value = next;
  afterApply?.();
  return true;
}

/**
 * Replace the symbol at the caret with an edited one, as the modifier and indicator cells do.
 * When the guard holds the edit, the label on screen is unchanged, so the old label is spoken
 * with the cell's label.
 * @param {SymbolEncodingType} edited - The symbol with its new parts and label.
 * @param {string} cellLabel          - The label of the cell that made the change.
 * @returns {boolean} - As for `editMessage()`. On `true` the caller announces the new label.
 */
export function editSymbolAtCaret (edited: SymbolEncodingType, cellLabel: string): boolean {
  const { payloads, caretPosition } = changeEncodingContents.value;
  if (editMessage({ payloads: replaceAtCaret(payloads, caretPosition, edited), caretPosition })) {
    return true;
  }
  announceIfEnabled(`${payloads[caretPosition].label}, ${cellLabel}`);
  return false;
}

/**
 * Add a word after the caret, with a comma before it inside a new word's combine markers. Every
 * cell that adds a word adds it this way.
 * @param {SymbolEncodingType} word - The word to add.
 * @param {Function} afterApply     - Optional. As for `editMessage()`.
 * @returns {boolean} - As for `editMessage()`.
 */
export function insertWord (word: SymbolEncodingType, afterApply?: () => void): boolean {
  const { payloads, caretPosition } = changeEncodingContents.value;
  const withComma = wordBuildSignal.value?.combine ?? false;
  return editMessage(insertWordAtCaret(word, payloads, caretPosition, withComma), afterApply);
}
