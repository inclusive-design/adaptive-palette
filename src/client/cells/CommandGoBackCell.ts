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
import { BlissSymbolInfoType, LayoutInfoType } from "../index.d";
import { adaptivePaletteGlobals } from "../state/GlobalData";
import { announceIfEnabled, speakUnavailable } from "../utils/SpeechUtils";
import { BlissSymbol } from "../components/BlissSymbol";
import "./ActionCodeCell.scss";

type CommandGoBackCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

/*
 * The implementation of the function invoked by, for example, activating a
 * CommandGoBackCell button/cell.  This determines which palette to go back to
 * by consulting the navigation stack and adjusts the stack accordingly.  The
 * component watching the stack redraws.
 */
export async function goBackImpl (): Promise<void> {
  const { paletteStore, navigationStack } = adaptivePaletteGlobals;

  const paletteToGoBackTo = navigationStack.peek();
  if (paletteToGoBackTo) {
    const paletteDefinition = await paletteStore.getNamedPalette(paletteToGoBackTo.name, true);
    if (paletteDefinition) {
      navigationStack.popAndSetCurrent(paletteDefinition);
    }
    else {
      console.error(`goBackImpl(): Unable to locate the palette definition for ${paletteToGoBackTo.name}`);
    }
  }
};

/*
 * Event handler for an CommandGoBackCellPropsType button/cell that, when
 * clicked, goes back one palette.
 */
const goBackToPalette = async (event: Event): Promise<void> => {
  const button = event.currentTarget as HTMLElement;
  if (adaptivePaletteGlobals.navigationStack.depth === 0) {
    speakUnavailable(button.innerText);
    return;
  }
  announceIfEnabled(button.innerText);
  return goBackImpl();
};

export function CommandGoBackCell (props: CommandGoBackCellPropsType): VNode {

  const {
    columnStart, columnSpan, rowStart, rowSpan, composition, label
  } = props.options;
  const ariaControlsId = adaptivePaletteGlobals.mainPaletteContainerId;

  // Marked unavailable rather than `disabled`: a disabled button leaves the tab order,
  // which costs a switch or eye-gaze user their scan position.  Depth zero means there
  // is nowhere to go back to.
  const unavailable = adaptivePaletteGlobals.navigationStack.depth === 0;

  const gridStyles = `
    grid-column: ${columnStart} / span ${columnSpan};
    grid-row: ${rowStart} / span ${rowSpan};
  `;

  return html`
    <button
      id="${props.id}" class="btn-command" style="${gridStyles}"
      aria-controls="${ariaControlsId}" aria-disabled=${unavailable}
      onClick=${goBackToPalette}>
      <${BlissSymbol} composition=${composition} label=${label} />
    </button>
  `;
}
