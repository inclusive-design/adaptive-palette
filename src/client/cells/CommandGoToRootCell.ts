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
import type { BlissSymbolInfoType, LayoutInfoType } from "../index.d";
import { adaptivePaletteGlobals } from "../state/GlobalData";
import { announceIfEnabled } from "../utils/SpeechUtils";
import { atRootWithNoOverlay, hideNavigationOverlay } from "../core/NavigationOverlay";
import { CommandButton } from "../components/CommandButton";

type CommandGoToRootCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

/*
 * Close any layer over the palette, then make the palette at the bottom of the navigation
 * stack -- the one seeded at startup -- the current one, and empty the stack.  Reading the
 * stack instead of naming a palette keeps this correct if the root palette is ever changed.
 * Hiding comes first, even from another palette, so Home never lands on the sentence layer.
 */
export function goToRootImpl (): void {
  hideNavigationOverlay();
  const { navigationStack } = adaptivePaletteGlobals;
  const root = navigationStack.peekLast();
  if (!root) {
    return;
  }
  navigationStack.flushReset(root);
}

export function CommandGoToRootCell (props: CommandGoToRootCellPropsType): VNode {
  const { label, labelLanguage } = props.options;

  // Unavailable when the root palette is already displayed with no layer over it.
  const unavailable = atRootWithNoOverlay();

  const cellClicked = (): void => {
    announceIfEnabled(label, labelLanguage);
    goToRootImpl();
  };

  return html`
    <${CommandButton}
      id=${props.id} options=${props.options}
      ariaControls=${adaptivePaletteGlobals.mainPaletteContainerId}
      unavailable=${unavailable} onClick=${cellClicked} />
  `;
}
