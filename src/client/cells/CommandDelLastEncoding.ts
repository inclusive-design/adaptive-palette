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

import type { VNode } from "preact";
import { html } from "htm/preact";
import { CommandButton } from "../components/CommandButton";
import { changeEncodingContents } from "../state/GlobalData";
import { editMessage } from "../core/MessageEdit";
import type { BlissSymbolInfoType, LayoutInfoType } from "../index.d";
import { deleteAtCaret } from "../utils/SymbolEncodingUtils";
import { announceIfEnabled } from "../utils/SpeechUtils";

type CommandDelLastEncodingProps = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType & {
    ariaControls: string
  }
}

export function CommandDelLastEncoding (props: CommandDelLastEncodingProps): VNode {
  const { id, options } = props;

  const cellClicked = (): void => {
    const { payloads, caretPosition } = changeEncodingContents.value;

    // Nothing to do if:
    // - there are no symbols (payloads), or
    // - there are symbols, but the caret is for inserting before the first
    //   symbol
    // A word also takes the space before it.
    if (payloads.length !== 0 && caretPosition !== -1) {
      editMessage(deleteAtCaret(payloads, caretPosition));
    }
    announceIfEnabled(options.label, options.labelLanguage);
  };

  return html`
    <${CommandButton} id=${id} options=${options} onClick=${cellClicked} />
  `;
}
