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
import { atRootWithNoOverlay, hideNavigationOverlay, navigationOverlayOpen } from "../core/NavigationOverlay";
import { CommandButton } from "../components/CommandButton";

type CommandGoBackCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

/*
 * The implementation of the function invoked by, for example, activating a
 * CommandGoBackCell button/cell.  An open layer over the palette is one level: Back closes
 * it and stays on the palette.  Otherwise this determines which palette to go back to by
 * consulting the navigation stack and adjusts the stack accordingly.  The component
 * watching the stack redraws.
 */
export function goBackImpl (): void {
  if (navigationOverlayOpen()) {
    hideNavigationOverlay();
    return;
  }
  const { navigationStack } = adaptivePaletteGlobals;

  // The stack holds the palette itself, so there is nothing to look up: looking it up by
  // `name` would miss a palette stored under a key that differs from its name.
  const paletteToGoBackTo = navigationStack.peek();
  if (paletteToGoBackTo) {
    navigationStack.popAndSetCurrent(paletteToGoBackTo);
  }
};

export function CommandGoBackCell (props: CommandGoBackCellPropsType): VNode {
  const { label, labelLanguage } = props.options;

  // Unavailable when there is nowhere to go back to.
  const unavailable = atRootWithNoOverlay();

  const cellClicked = (): void => {
    announceIfEnabled(label, labelLanguage);
    goBackImpl();
  };

  return html`
    <${CommandButton}
      id=${props.id} options=${props.options}
      ariaControls=${adaptivePaletteGlobals.mainPaletteContainerId}
      unavailable=${unavailable} onClick=${cellClicked} />
  `;
}
