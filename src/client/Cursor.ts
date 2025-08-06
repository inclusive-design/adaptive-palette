/*
 * Copyright 2025 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { VNode } from "preact";
import { html } from "htm/preact";
import { BlissSymbol } from "./BlissSymbol";
import { BlissSymbolInfoType, LayoutInfoType } from "./index.d";
import { generateGridStyle, speak } from "./GlobalUtils";
import { INPUT_AREA_ID } from "./ContentBmwEncoding";

const CURSOR_CARET_ID = "cursorCaret";

type CursorPropsType = {
  containerEl: HTMLElement
};

/**
 * Determing if the cursor is within the symbol input area in the DOM.
 * @param {HTMLElement} inputAreaEl - The input area element.
 * @return {HTMLElement} - if in the input area, return the HTMLElement
 *                         associated with the cursor.  Otherwise, return
 *                         `null`.
 */
export function isCursorInInputArea (inputAreaEl: HTMLElement): HTMLElement {
  let result = null;

  // If the `anchorNode` of the selection is the input area, technically
  // we are not inside of it.  Do not search up the tree.
  const anchorEl = document.getSelection().anchorNode;
  if (anchorEl !== inputAreaEl) {
    let currentEl = anchorEl;

    // Loop up the DOM tree until either the input area is found as an ancestor
    // or the `body` element is reached.
    while (currentEl && currentEl !== document.body) {
      if (currentEl === inputAreaEl) {
        result = anchorEl;
        break;
      }
      else {
        currentEl = currentEl.parentElement;
      }
    }
  }
  return result;
}

/**
 * Find the index of the symbol in the input area where the cursor is located.
 * @param {HTMLElement}  - The input area element.
 * @return {number}      -  If the cursor is within the input area, and a
 *                         symbol `<div>` is its ancestor, return its index
 *                         within input area's children HTMLCollection.
 *                         Otherwise, return `-1`.
 */
export function getSymbolIndexAtCursor (inputAreaEl: HTMLElement): number {
  let result = -1;

  const baseEl = isCursorInInputArea(inputAreaEl);
  if (baseEl) {
    let currentEl = baseEl;

    // Given a DOM node within the input area, search up the DOM tree for the
    // input area until a bliss symbol element is found.  Then retrieve its
    // index within the input area's children.
    while (currentEl && currentEl !== inputAreaEl) {
      if (currentEl.className === "blissSymbol") {
        const childArray = Array.from(inputAreaEl.children);
        result = childArray.indexOf(currentEl);
        break;
      }
      else {
        currentEl = currentEl.parentElement;
      }
    }
  }
  return result;
}

export function Cursor (props: CursorPropsType): VNode {
  return html`
    <span id="${CURSOR_CARET_ID}">|</span>
  `;
}
