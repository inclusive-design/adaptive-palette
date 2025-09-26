/*
 * Copyright 2023-2025 Inclusive Design Research Centre, OCAD University
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
import { changeEncodingContents } from "./GlobalData";
import { BlissSymbolInfoType, LayoutInfoType } from "./index.d";
import { generateGridStyle, speak } from "./GlobalUtils";
import { INPUT_AREA_ID } from "./ContentBmwEncoding";

type CommandDelLastEncodingProps = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType & {
    ariaControls: string
  }
}

/**
 * Find the index of the symbol in the input area where the cursor is located.
 * @param {HTMLElement}  - The input area element.
 * @return {number}      -  If the cursor is within the input area, and a
 *                         symbol `<div>` is its ancestor, return its index
 *                         within input area's children HTMLCollection.
 *                         Otherwise, return `-1`.
 */
function getSymbolIndexAtCursor (inputAreaEl: HTMLElement): number {
  const childArray = Array.from(inputAreaEl.children);
  let caretIndex = childArray.length - 1;

  for (let i = 0; i < childArray.length; i++) {
    const childEl = childArray[i];
    if (childEl.className.includes("cursorCaret")) {
      caretIndex = i;
      break;
    }
  }
  return caretIndex;
}

export function CommandDelLastEncoding (props: CommandDelLastEncodingProps): VNode {
  const { id, options } = props;
  const { label, bciAvId, columnStart, columnSpan, rowStart, rowSpan, ariaControls } = options;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  const cellClicked = (): void => {
    const newEncodingContents = [...changeEncodingContents.value.payloads];
    const symbolIndex = getSymbolIndexAtCursor(document.getElementById(INPUT_AREA_ID));

    // If no symbol was found at the cursor, remove the last symbol
    if (symbolIndex === -1) {
      newEncodingContents.pop();
    }
    // Copy everything from the beginning to the `symbolIndex`, and then
    // everything thereafter
    else {
      newEncodingContents.splice(symbolIndex, 1);
    }
    // Update the caret position as necessary and then update the signal's
    // value.
    let newCaretPosition = changeEncodingContents.value.caretPosition;
    if (newEncodingContents.length === 0) {
      newCaretPosition = -1;
    }
    else if (symbolIndex - 1 < 0) {
      newCaretPosition = 0;
    }
    else {
      newCaretPosition = symbolIndex - 1;
    }
    changeEncodingContents.value = {
      payloads: newEncodingContents,
      caretPosition: newCaretPosition
    };
    speak(label);
  };

  return html`
    <button
      id="${id}"
      class="btn-command"
      style="${gridStyles}"
      aria-controls=${ariaControls}
      onClick=${cellClicked}>
      <${BlissSymbol} bciAvId=${bciAvId} label=${label}/>
    </button>
  `;
}
