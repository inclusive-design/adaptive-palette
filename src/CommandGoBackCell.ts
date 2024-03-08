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
import { BlissSymbolCellType } from "./index.d";
import { adaptivePaletteGlobals } from "./GlobalData";
import { importPaletteFromJsonFile } from "./GlobalUtils";
import { Palette } from "./Palette";
import { BlissSymbol } from "./BlissSymbol";
import { speak } from "./GlobalUtils";
import "./ActionBmwCodeCell.scss";

// TODO:  this is identical to `ActionBmwCodeCellPropsType`.  Should it be?
type CommandGoBackCellPropsType = {
  id: string,
  options: BlissSymbolCellType
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
  if (paletteToGoBackTo) {
    const paletteDefinition = await paletteStore.getNamedPalette(paletteToGoBackTo.name, importPaletteFromJsonFile);
    if (paletteDefinition) {
      const paletteContainer = document.getElementById(button.getAttribute("aria-controls")) || document.body;
      navigationStack.popAndSetCurrent(paletteDefinition);
      render (html`<${Palette} json=${paletteDefinition}/>`, paletteContainer);
    }
    else {
      console.error(`goBackToPalette():  Unable to locate the palette definition for ${paletteToGoBackTo}`);
    }
  }
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
