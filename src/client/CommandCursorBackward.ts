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
import { changeEncodingContents } from "./GlobalData";
import { BlissSymbolInfoType, LayoutInfoType } from "./index.d";
import { generateGridStyle, speak } from "./GlobalUtils";

type CommandCursorBackwardProps = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType & {
    ariaControls: string
  }
}

// BCI-AV-ID "backward": 12613: "move backward": 12613;24670
// BCI-AV-ID "forward": 14390; "move forward": 14390;24670

export function CommandCursorBackward (props: CommandCursorBackwardProps): VNode {
  const { id, options } = props;
  const { label, bciAvId, columnStart, columnSpan, rowStart, rowSpan, ariaControls } = options;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  const cellClicked = (): void => {
    // Move the caret position back one.  Note that the new caretPosition can
    // equal -1 indicating that the caret is before the first symbol in the
    // `payloads` array.  But, it cannot be less than -1.
    if (changeEncodingContents.value.caretPosition > -1) {
      changeEncodingContents.value = {
        payloads: changeEncodingContents.value.payloads,
        caretPosition: changeEncodingContents.value.caretPosition - 1
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
      <${BlissSymbol} bciAvId=${bciAvId} label=${label}/>
    </button>
  `;
}
