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

import { changeEncodingContents } from "./GlobalData";
import { BlissSymbol } from "./BlissSymbol";
import { generateGridStyle, normalizeComposition, speak, speakUnavailable } from "./GlobalUtils";
import { messageText, saveMessageRecord } from "./MessageLog";
import { BlissSymbolInfoType, LayoutInfoType } from "./index.d";
import "./ActionSpeakCell.scss";

type ActionSpeakCellPropsType = {
  id: string,
  options: LayoutInfoType & Partial<BlissSymbolInfoType> & {
    label: string,
    ariaControls?: string
  }
};

/**
 * Speaks the message aloud and records it as one the user has said.
 *
 * Recording it here is what feeds word prediction: a message is only worth predicting from
 * once the user has actually said it. The message is left in the input area afterwards so it
 * can be repeated or edited; clearing it stays with the "Delete all" command.
 * @param {ActionSpeakCellPropsType} props - The cell id and its palette options.
 * @returns {VNode}
 */
export function ActionSpeakCell (props: ActionSpeakCellPropsType): VNode {
  const { id, options } = props;
  const { label, composition, columnStart, columnSpan, rowStart, rowSpan, ariaControls } = options;
  const { payloads } = changeEncodingContents.value;
  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  // Marked `aria-disabled` rather than `disabled` so the cell keeps its place in the tab
  // order: a switch or eye-gaze user who loses focus mid-scan has to start over.
  const cannotRun = payloads.length === 0;

  const cellClicked = (): void => {
    if (cannotRun) {
      speakUnavailable(label);
      return;
    }
    speak(messageText(payloads));
    saveMessageRecord(payloads);
  };

  return html`
    <button
      id="${id}"
      class="ActionSpeakCell btn-command"
      style="${gridStyles}"
      aria-controls=${ariaControls}
      aria-disabled=${cannotRun}
      onClick=${cellClicked}>
      ${composition
    ? html`<${BlissSymbol}
          composition=${normalizeComposition(composition)}
          label=${label}
          isPresentation=true
        />`
    : label}
    </button>
  `;
}
