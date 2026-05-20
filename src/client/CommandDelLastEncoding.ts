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
import { contentSignalMap } from "./GlobalData";
import { BlissSymbolInfoType, LayoutInfoType } from "./index.d";
import { generateGridStyle, speak, isSkipSymbol, bciAvIdToSkip } from "./GlobalUtils";

type CommandDelLastEncodingProps = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType & {
    ariaControls: string
  }
}

export function CommandDelLastEncoding (props: CommandDelLastEncodingProps): VNode {
  const { id, options } = props;
  const { label, bciAvId, columnStart, columnSpan, rowStart, rowSpan, ariaControls } = options;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  const cellClicked = (): void => {
    const contentSignal = contentSignalMap[ariaControls as keyof typeof contentSignalMap];
    const { payloads, caretPosition } = contentSignal.value;

    // Nothing to do if:
    // - there are no symbols (payloads), or
    // - there are symbols, but the caret is for inserting before the first
    //   symbol
    if (payloads.length === 0 || caretPosition === -1) {
      return;
    }
    
    const newEncodingContents = [...payloads];
    newEncodingContents.splice(caretPosition, 1);

    // Walk the caret left, skipping over any skip symbols
    let newCaretPosition = caretPosition - 1;
    while (newCaretPosition >= 0 && isSkipSymbol(newEncodingContents[newCaretPosition], bciAvIdToSkip)) {
      newCaretPosition -= 1;
    }

    // If the position fell off the left side but the array still leads with a skip
    // the caret is now outside the wrap. Try to find a symbol inside the wrap by going right

    if (newCaretPosition === -1 && newEncodingContents.length > 0 && isSkipSymbol(newEncodingContents[0], bciAvIdToSkip)) {
      let updatedPosition = 1;
      while (updatedPosition < newEncodingContents.length && isSkipSymbol(newEncodingContents[updatedPosition], bciAvIdToSkip)) {
        updatedPosition += 1;
      }

      if (updatedPosition >= newEncodingContents.length) {
        // Only skip symbols in the payloads, remove the symbols and reset
        contentSignal.value = { payloads: [], caretPosition: -1 };
        speak(label);
        return;
      }

      newCaretPosition = updatedPosition;
    }

    contentSignal.value = {
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
