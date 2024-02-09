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

import { render } from "preact";
import { html } from "htm/preact";
import { BlissSymbolCellType } from "./index.d";
import { adaptivePaletteGlobals, loadPaletteFromJsonFile } from "./GlobalData";
import { Palette } from "./Palette";
import { BlissSymbol } from "./BlissSymbol";
import { speak } from "./GlobalUtils";
import "./ActionBranchToPalette.scss";

// Msp of palette name and their files.  TODO: put this in a better place,
// GlobalData? Read from a file?
const paletteNameAndFile = {
  "My Family Palette": "./src/keyboards/myfamily.json",
  "People": "./src/keyboards/people.json",
  "BMW Palette": "./src/keyboards/bmw_palette.json",
  "Palettes": "./src/keyboards/palettes.json"
};

// TODO:  this is identical to `ActionBmwCodeCellPropsType`.  Should it be?
type ActionBranchToPalettePropsType = {
  id: string,
  options: BlissSymbolCellType
};

/*
 * Event handler for an ActionBranchToPalette button/cell that, when clicked,
 * finds and renders the palette referenced by this cell.
 */
const navigateToPalette = async (event) => {
  const { paletteStore, navigationStack } = adaptivePaletteGlobals;
  const button = event.currentTarget;
  speak(button.innerText);

  const branchToPaletteName = button.getAttribute("data-branchto");
  let paletteDefinition = paletteStore.getNamedPalette(branchToPaletteName);
  if (!paletteDefinition) {
    const paletteFile = paletteNameAndFile[branchToPaletteName];
    paletteDefinition = await loadPaletteFromJsonFile(`${paletteFile}`);
    paletteStore.addPalette(paletteDefinition);
  }
  if (paletteDefinition) {
    const mainPaletteDisplayArea = document.getElementById("mainPaletteDisplayArea");
    navigationStack.push(navigationStack.currentPalette);
    render (html`<${Palette} json=${paletteDefinition}/>`, mainPaletteDisplayArea);
    navigationStack.currentPalette = paletteDefinition;
  }
  else {
    console.error(`navigateToPalette():  Unable to locate the palette definition for ${branchToPaletteName}`);
  }
};

export function ActionBranchToPalette (props: ActionBranchToPalettePropsType) {
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
