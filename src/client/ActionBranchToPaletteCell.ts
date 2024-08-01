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
import { loadPaletteFromJsonFile } from "./GlobalUtils";
import { Palette } from "./Palette";
import { BlissSymbol } from "./BlissSymbol";
import { speak } from "./GlobalUtils";
import "./ActionBranchToPaletteCell.scss";

type ActionBranchToPalettePropsType = {
  id: string,
  options: BlissSymbolCellType
};

/*
 * Event handler for an ActionBranchToPaletteCell button/cell that, when clicked,
 * finds and renders the palette referenced by this cell.
 */
const navigateToPalette = async (event: Event): Promise<void> => {
  const { paletteStore, navigationStack } = adaptivePaletteGlobals;
  const button = event.currentTarget as HTMLElement;
  speak(button.innerText);

  const buttonsPaletteName = button.parentElement.getAttribute("data-palettename");
  const branchToPaletteName = button.getAttribute("data-branchto");
  const paletteDefinition = await paletteStore.getNamedPalette(branchToPaletteName, loadPaletteFromJsonFile);
  if (paletteDefinition) {
    const displayElement = button.parentElement.parentElement;
    const goBackPalette = await paletteStore.getNamedPalette(buttonsPaletteName);
    navigationStack.push({ palette: goBackPalette, htmlElement: displayElement });
    render (html`<${Palette} json=${paletteDefinition}/>`, displayElement);
    navigationStack.currentPalette = { palette: paletteDefinition, htmlElement: displayElement };
  }
  else {
    console.error(`navigateToPalette():  Unable to locate the palette definition for ${branchToPaletteName}`);
  }
};

export function ActionBranchToPaletteCell (props: ActionBranchToPalettePropsType): VNode {
  const {
    columnStart, columnSpan, rowStart, rowSpan, branchTo, bciAvId, label
  } = props.options;

  const gridStyles = `
    grid-column: ${columnStart} / span ${columnSpan};
    grid-row: ${rowStart} / span ${rowSpan};
  `;

  return html`
    <button
      id="${props.id}" class="actionBranchToPaletteCell" style="${gridStyles}"
      data-branchto="${branchTo}" onClick=${navigateToPalette}>
      <${BlissSymbol} bciAvId=${bciAvId} label=${label} />
    </button>
  `;
}
