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

import { VNode } from "preact";
import { html } from "htm/preact";
import { BlissSymbol } from "./BlissSymbol";
import { changeEncodingContents } from "./GlobalData";
import { BlissSymbolInfoType, LayoutInfoType } from "./index.d";
import { generateGridStyle, speak } from "./GlobalUtils";

type CommandDelLastEncodingProps = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType & {
    ariaControls: string
  }
}

export function CommandDelLastEncoding (props: CommandDelLastEncodingProps): VNode {
  const { id, options } = props;
  const { label, composition, columnStart, columnSpan, rowStart, rowSpan, ariaControls } = options;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  const cellClicked = (): void => {
    const { payloads, caretPosition } = changeEncodingContents.value;

    // Nothing to do if:
    // - there are no symbols (payloads), or
    // - there are symbols, but the caret is for inserting before the first
    //   symbol
    if (payloads.length !== 0 && caretPosition !== -1) {
      const newEncodingContents = [...changeEncodingContents.value.payloads];
      newEncodingContents.splice(caretPosition, 1);
      changeEncodingContents.value = {
        payloads: newEncodingContents,
        caretPosition: caretPosition - 1
      };
    }
    speak(label);
  };

  return html`
    <button
      id="${id}"
      class="btn-command"
      style="${gridStyles}"
      aria-controls=${ariaControls}
      onClick=${cellClicked}>
      <${BlissSymbol} composition=${composition} label=${label}/>
    </button>
  `;
}
