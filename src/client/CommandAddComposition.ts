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

import { v4 as uuidv4 } from "uuid";
import { VNode } from "preact";
import { html } from "htm/preact";
import { BlissSymbol } from "./BlissSymbol";
import { changeEncodingContents, composeWordContents, isComposing } from "./GlobalData";
import { BlissSymbolInfoType, LayoutInfoType } from "./index.d";
import { insertWordAtCaret, generateGridStyle, speak } from "./GlobalUtils";

type CommandAddCompositionProps = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType & {
    ariaControls: string
  }
}

export function CommandAddComposition (props: CommandAddCompositionProps): VNode {
  const { id, options } = props;
  const { label, composition, columnStart, columnSpan, rowStart, rowSpan, ariaControls } = options;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  const disabled = composeWordContents.value.payloads.length === 0;

  const cellClicked = (): void => {
    const composePayloads = composeWordContents.value.payloads;
    let composedCompositionId: (number | string)[] = [];
    let composedLabel = "";
    composePayloads.forEach( (payload) => {
      const normalizedCompositionId: (number | string)[] = 
        typeof payload.composition === "number" ? [payload.composition] : payload.composition;
      
      composedCompositionId = composedCompositionId.concat(normalizedCompositionId);
      composedCompositionId.push("/");
      composedLabel = `${composedLabel} ${payload.label}`;
    });
    composedCompositionId.pop();  // remove the last "/"
    const composedPayload = {
      "id": uuidv4(),
      "label": composedLabel.trim(),
      "composition": composedCompositionId,
      "modifierInfo": []
    };
    const { payloads, caretPosition } = changeEncodingContents.value;
    changeEncodingContents.value = insertWordAtCaret(
      composedPayload, payloads, caretPosition
    );
    speak(composedLabel);
    composeWordContents.value = { payloads: [], caretPosition: -1 };
    isComposing.value = false;
  };

  return html`
    <button
      id="${id}"
      class="btn-command"
      style="${gridStyles}"
      aria-controls=${ariaControls}
      onClick=${cellClicked}
      disabled=${disabled}>
      <${BlissSymbol} composition=${composition} label=${label}/>
    </button>
  `;
}
