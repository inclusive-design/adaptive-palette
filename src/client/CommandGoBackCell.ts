/*
 * Copyright 2023 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
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
import { adaptivePaletteGlobals } from "./GlobalData";
import { loadPaletteFromJsonFile } from "./GlobalUtils";
import { Palette } from "./Palette";
import { BlissSymbol } from "./BlissSymbol";
import "./ActionBmwCodeCell.scss";

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
export async function goBackImpl (defaultContaineId?: string ): Promise<void> {
  const { paletteStore, navigationStack } = adaptivePaletteGlobals;

  const paletteToGoBackTo = navigationStack.peek();
  if (paletteToGoBackTo && paletteToGoBackTo.palette) {
    const paletteDefinition = await paletteStore.getNamedPalette(paletteToGoBackTo.palette.name, loadPaletteFromJsonFile);
    if (paletteDefinition) {
      const paletteContainer = paletteToGoBackTo.htmlElement || document.getElementById(defaultContaineId) || document.body;
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
  adaptivePaletteGlobals.buttonClick.play();
  return goBackImpl(button.getAttribute("aria-controls"));
};

export function CommandGoBackCell (props: CommandGoBackCellPropsType): VNode {

  const {
    columnStart, columnSpan, rowStart, rowSpan, bciAvId, label
  } = props.options;
  const ariaControlsId = adaptivePaletteGlobals.mainPaletteContainerId;

  const gridStyles = `
    grid-column: ${columnStart} / span ${columnSpan};
    grid-row: ${rowStart} / span ${rowSpan};
  `;

  return html`
    <button
      id="${props.id}" class="btn-command" style="${gridStyles}"
      aria-controls="${ariaControlsId}" onClick=${goBackToPalette}>
      <${BlissSymbol} bciAvId=${bciAvId} label=${label} />
    </button>
  `;
}
