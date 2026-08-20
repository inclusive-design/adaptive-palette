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
 * This lives in `core/` rather than in the feature that vetoes edits, so that no cell imports
 * a feature.
 */
import { changeEncodingContents } from "../state/GlobalData";
import type { ContentSignalDataType } from "../index.d";

/**
 * Decides whether an edit may be published. Returning `true` holds it: the guard has taken
 * the edit on and will either apply it later or drop it.
 */
export type EditGuard = (next: ContentSignalDataType) => boolean;

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
 * @returns {boolean} - `true` when the edit was published, `false` when the guard held it.
 */
export function editMessage (next: ContentSignalDataType): boolean {
  // Frozen before the guard is asked, so an edit the guard holds is already safe from later
  // in-place changes by the time the guard applies it.
  deepFreeze(next);
  if (guard?.(next)) {
    return false;
  }
  changeEncodingContents.value = next;
  return true;
}
