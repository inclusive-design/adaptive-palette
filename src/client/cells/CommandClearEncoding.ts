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
import { clearMessage, editMessage } from "../core/MessageEdit";
import { wordBuildSignal } from "../state/GlobalData";
import type { BlissSymbolInfoType, LayoutInfoType } from "../index.d";
import { announceIfEnabled } from "../utils/SpeechUtils";

type CommandClearEncodingProps = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType & {
    ariaControls: string
  }
}

export function CommandClearEncoding (props: CommandClearEncodingProps): VNode {
  const { id, options } = props;

  const cellClicked = (): void => {
    // While a word is being built, only its parts go. The message and its sentences wait for it.
    if (wordBuildSignal.value) {
      editMessage({ payloads: [], caretPosition: -1 });
    } else {
      clearMessage();
    }
    announceIfEnabled(options.label, options.labelLanguage);
  };

  return html`
    <${CommandButton} id=${id} options=${options} ariaControls=${options.ariaControls} onClick=${cellClicked} />
  `;
}
