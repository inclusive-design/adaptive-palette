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

import { render, VNode } from "preact";
import { html } from "htm/preact";
import { BlissSymbolInfoType, LayoutInfoType } from "../index.d";
import { adaptivePaletteGlobals, navigationDepth } from "../state/GlobalData";
import { generateGridStyle } from "../utils/GridUtils";
import { announceIfEnabled, speakUnavailable } from "../utils/SpeechUtils";
import { Palette } from "../components/Palette";
import { BlissSymbol } from "../components/BlissSymbol";
import "./ActionCodeCell.scss";

type CommandGoToRootCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

/*
 * Render the palette at the bottom of the navigation stack -- the one seeded at
 * startup -- and empty the stack.  Reading the stack instead of naming a palette keeps
 * this correct if the root palette is ever changed.
 */
export function goToRootImpl (): void {
  const { navigationStack } = adaptivePaletteGlobals;
  const root = navigationStack.peekLast();
  if (!root) {
    return;
  }
  render(html`<${Palette} json=${root.palette}/>`, root.htmlElement);
  navigationStack.flushReset({ palette: root.palette, htmlElement: root.htmlElement });
}

export function CommandGoToRootCell (props: CommandGoToRootCellPropsType): VNode {

  const {
    columnStart, columnSpan, rowStart, rowSpan, composition, label
  } = props.options;
  const ariaControlsId = adaptivePaletteGlobals.mainPaletteContainerId;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  // Marked unavailable rather than `disabled`: a disabled button leaves the tab order,
  // which costs a switch or eye-gaze user their scan position.  Depth zero means the
  // root palette is already displayed.
  const unavailable = navigationDepth.value === 0;

  const cellClicked = (): void => {
    if (unavailable) {
      speakUnavailable(label);
      return;
    }
    announceIfEnabled(label);
    goToRootImpl();
  };

  return html`
    <button
      id="${props.id}" class="btn-command" style="${gridStyles}"
      aria-controls="${ariaControlsId}" aria-disabled=${unavailable}
      onClick=${cellClicked}>
      <${BlissSymbol} composition=${composition} label=${label} />
    </button>
  `;
}
