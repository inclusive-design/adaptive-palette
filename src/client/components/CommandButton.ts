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
import { BlissSymbol } from "./BlissSymbol";
import type { BlissSymbolInfoType, LayoutInfoType } from "../index.d";
import { generateGridStyle } from "../utils/GridUtils";
import { speakUnavailable } from "../utils/SpeechUtils";

type CommandButtonPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType,
  ariaControls?: string,
  // Marked unavailable rather than `disabled`: a disabled button leaves the tab order, which
  // costs a switch or eye-gaze user their scan position. Left out, the button is never unavailable.
  unavailable?: boolean,
  onClick: () => void
};

/*
 * The button a command cell draws: its symbol and label at its grid position. A click on an
 * unavailable button says so and does not run `onClick`.
 */
export function CommandButton (props: CommandButtonPropsType): VNode {
  const { id, options, ariaControls, unavailable, onClick } = props;
  const { label, composition, columnStart, columnSpan, rowStart, rowSpan } = options;

  const cellClicked = (): void => {
    if (unavailable) {
      speakUnavailable(label);
      return;
    }
    onClick();
  };

  return html`
    <button
      id="${id}"
      class="btn-command"
      style="${generateGridStyle(columnStart, columnSpan, rowStart, rowSpan)}"
      aria-controls=${ariaControls}
      aria-disabled=${unavailable}
      onClick=${cellClicked}>
      <${BlissSymbol} composition=${composition} label=${label} />
    </button>
  `;
}
