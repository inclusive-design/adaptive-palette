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
import { incrementCursor } from "./ContentEncoding";
import type { BlissSymbolInfoType, LayoutInfoType } from "../index.d";
import { announceIfEnabled } from "../utils/SpeechUtils";

type CommandCursorForwardProps = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType & {
    ariaControls: string
  }
}

export function CommandCursorForward (props: CommandCursorForwardProps): VNode {
  const { id, options } = props;

  const cellClicked = (): void => {
    incrementCursor();
    announceIfEnabled(options.label, options.labelLanguage);
  };

  return html`
    <${CommandButton} id=${id} options=${options} onClick=${cellClicked} />
  `;
}
