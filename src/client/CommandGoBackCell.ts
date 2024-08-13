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
import { speak } from "./GlobalUtils";
import "./ActionBmwCodeCell.scss";

type CommandGoBackCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

/*
 * Event handler for an CommandGoBackCellPropsType button/cell that, when clicked,
 * goes back one palette.
 */
const goBackToPalette = async (event: Event): Promise<void> => {
  const { paletteStore, navigationStack } = adaptivePaletteGlobals;
  const button = event.currentTarget as HTMLElement;
  speak(button.innerText);

  const paletteToGoBackTo = navigationStack.peek();
  if (paletteToGoBackTo && paletteToGoBackTo.palette) {
    const paletteDefinition = await paletteStore.getNamedPalette(paletteToGoBackTo.palette.name, loadPaletteFromJsonFile);
    if (paletteDefinition) {
      const paletteContainer = paletteToGoBackTo.htmlElement || document.body;
      navigationStack.popAndSetCurrent(paletteToGoBackTo);
      render (html`<${Palette} json=${paletteDefinition}/>`, paletteContainer);
    }
    else {
      console.error(`goBackToPalette():  Unable to locate the palette definition for ${paletteToGoBackTo.palette.name}`);
    }
  }
};

export function CommandGoBackCell (props: CommandGoBackCellPropsType): VNode {

  const {
    columnStart, columnSpan, rowStart, rowSpan, bciAvId, label
  } = props.options;

  const gridStyles = `
    grid-column: ${columnStart} / span ${columnSpan};
    grid-row: ${rowStart} / span ${rowSpan};
  `;

  return html`
    <button
      id="${props.id}" class="btn-command" style="${gridStyles}"
      onClick=${goBackToPalette}>
      <${BlissSymbol} bciAvId=${bciAvId} label=${label} />
    </button>
  `;
}
