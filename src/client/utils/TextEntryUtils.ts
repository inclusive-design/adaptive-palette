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
 * Whether a key press lands where the user is typing text.
 */
/** The class of the input area. Palettes name the cell as they like, so its id cannot be used. */
export const INPUT_AREA_CLASS = "contentEncodingArea";

/**
 * The input area. The message preview in the symbol dialogs shares its class, for its styles,
 * and comes first in the page, so it is left out.
 * @returns {HTMLElement | null}
 */
export function inputAreaElement (): HTMLElement | null {
  return document.querySelector<HTMLElement>(`.${INPUT_AREA_CLASS}:not(.messagePreviewArea)`);
}

const textInputTypes = [
  "date", "datetime-local", "email", "month", "number", "password", "search",
  "tel", "text", "time", "url", "week"
];

/**
 * Whether `element` takes typed text. The input area has `role="textbox"` but is not typed
 * into: keys there move its caret, so it does not count.
 * @param {unknown} element - Usually a key event's target.
 * @returns {boolean}
 */
export function elementAllowsTextEntry (element: unknown): boolean {
  if (!(element instanceof HTMLElement)) { return false; }
  return !element.classList.contains(INPUT_AREA_CLASS) && (
    (element instanceof HTMLInputElement && textInputTypes.includes(element.type)) ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element.getAttribute("role") === "textbox"
  );
}
