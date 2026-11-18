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
  options: BlissSymbolInfoType & LayoutInfoType & { ariaControls?: string },
  // Overrides `options.ariaControls`.
  ariaControls?: string,
  // Marked unavailable rather than `disabled`: a disabled button leaves the tab order, which
  // costs a switch or eye-gaze user their scan position. Left out, the button is never unavailable.
  unavailable?: boolean,
  onClick: (event: Event) => void,
  // Any other attribute, such as `ref` or `aria-pressed`, goes on the button as given.
  [attribute: string]: unknown
};

/*
 * The button a command cell draws: its symbol and label at its grid position. A click on an
 * unavailable button says so and does not run `onClick`.
 */
export function CommandButton (props: CommandButtonPropsType): VNode {
  const { id, options, ariaControls, unavailable, onClick, ...attributes } = props;
  const { label, composition, columnStart, columnSpan, rowStart, rowSpan } = options;

  const cellClicked = (event: Event): void => {
    if (unavailable) {
      speakUnavailable(label);
      return;
    }
    onClick(event);
  };

  return html`
    <button
      id="${id}"
      class="btn-command"
      style="${generateGridStyle(columnStart, columnSpan, rowStart, rowSpan)}"
      aria-controls=${ariaControls ?? options.ariaControls}
      aria-disabled=${unavailable}
      ...${attributes}
      onClick=${cellClicked}>
      <${BlissSymbol} composition=${composition} label=${label} />
    </button>
  `;
}
