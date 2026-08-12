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
import { BlissSymbolInfoType, LayoutInfoType } from "./index.d";
import { adaptivePaletteGlobals, navigationDepth } from "./GlobalData";
import { loadPaletteFromJsonFile } from "./GlobalUtils";
import { announceIfEnabled, speakUnavailable } from "./SpeechUtils";
import { Palette } from "./Palette";
import { BlissSymbol } from "./BlissSymbol";
import "./ActionCodeCell.scss";

type CommandGoBackCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

/*
 * The implementation of the function invoked by, for example, activating a
 * CommandGoBackCell button/cell.  This determines which palette to go back to
 * by consulting the navigation stack, adjusts the stack accordingly, and
 * calls upon the palette-to-go-back-to to render itself.  The
 * `defaultContaineId` parameter is optional fallback and is only used if the
 * navigation stack entry does not specify an HTMLElement in which to render
 * the palette.  If not given, and the navigation stack also does not specify
 * a rendering container, then the container defaults to the document's
 * `body` element.
 * @param defaultContaineId {string} - Optional id of the HTMLELement in which
 *                                     to render the palette if none is
 *                                     specified in the navigation stack entry.
 */
export async function goBackImpl (defaultContaineId?: string | null ): Promise<void> {
  const { paletteStore, navigationStack } = adaptivePaletteGlobals;

  const paletteToGoBackTo = navigationStack.peek();
  if (paletteToGoBackTo && paletteToGoBackTo.palette) {
    const paletteDefinition = await paletteStore.getNamedPalette(paletteToGoBackTo.palette.name, loadPaletteFromJsonFile);
    if (paletteDefinition) {
      const paletteContainer = paletteToGoBackTo.htmlElement || document.getElementById(defaultContaineId ?? "") || document.body;
      navigationStack.popAndSetCurrent(paletteToGoBackTo);
      render (html`<${Palette} json=${paletteDefinition}/>`, paletteContainer);
    }
    else {
      console.error(`goBackImpl(): Unable to locate the palette definition for ${paletteToGoBackTo.palette.name}`);
    }
  }
};

/*
 * Event handler for an CommandGoBackCellPropsType button/cell that, when
 * clicked, goes back one palette.
 */
const goBackToPalette = async (event: Event): Promise<void> => {
  const button = event.currentTarget as HTMLElement;
  if (navigationDepth.value === 0) {
    speakUnavailable(button.innerText);
    return;
  }
  announceIfEnabled(button.innerText);
  return goBackImpl(button.getAttribute("aria-controls"));
};

export function CommandGoBackCell (props: CommandGoBackCellPropsType): VNode {

  const {
    columnStart, columnSpan, rowStart, rowSpan, composition, label
  } = props.options;
  const ariaControlsId = adaptivePaletteGlobals.mainPaletteContainerId;

  // Marked unavailable rather than `disabled`: a disabled button leaves the tab order,
  // which costs a switch or eye-gaze user their scan position.  Depth zero means there
  // is nowhere to go back to.
  const unavailable = navigationDepth.value === 0;

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
