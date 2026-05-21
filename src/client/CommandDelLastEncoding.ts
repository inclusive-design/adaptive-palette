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
import { generateGridStyle, speak } from "./GlobalUtils";
import { deleteAtCaret } from "./CursorActions";

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
    const updatedContentSignal = deleteAtCaret(contentSignal.value);
    if (updatedContentSignal !== contentSignal.value) {
      contentSignal.value = updatedContentSignal;
      speak(label);
    }
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
