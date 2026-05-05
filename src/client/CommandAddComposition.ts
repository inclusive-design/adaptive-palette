/*
 * Copyright 2026 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
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
import "./ActionIndicatorCell.scss";

type CommandAddCompositionProps = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType & {
    ariaControls: string
  }
}

export function CommandAddComposition (props: CommandAddCompositionProps): VNode {
  const { id, options } = props;
  const { label, bciAvId, columnStart, columnSpan, rowStart, rowSpan, ariaControls } = options;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  const disabled = composeWordContents.value.payloads.length === 0;

  const cellClicked = (): void => {
    const composePayloads = composeWordContents.value.payloads;
    let composedBciAvId = [];
    let composedLabel = "";
    composePayloads.forEach( (payload) => {
      composedBciAvId = composedBciAvId.concat(payload.bciAvId);
      composedBciAvId.push("/");
      composedLabel = `${composedLabel} ${payload.label}`;
    });
    composedBciAvId.pop();  // remove the last "/"
    const composedPayload = {
      "id": uuidv4(),
      "label": composedLabel.trim(),
      "bciAvId": composedBciAvId,
      "modifierInfo": []
    };
    const { payloads, caretPosition } = changeEncodingContents.value;
    changeEncodingContents.value = insertWordAtCaret(
      composedPayload, payloads, caretPosition
    );
    speak(label);
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
      disabled="${disabled}">
      <${BlissSymbol} bciAvId=${bciAvId} label=${label}/>
    </button>
  `;
}
