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
import { adaptivePaletteGlobals, getPaletteJson } from "./GlobalData";
import { Palette } from "./Palette";
import { BlissSymbol } from "./BlissSymbol";
import { speak } from "./GlobalUtils";
import "./ActionBmwCodeCell.scss";

// Msp of palette name and their files.  TODO: put this in a better place,
// GlobalData?
const paletteNameAndFile = {
  "My Family Palette": "./src/keyboards/myfamily.json",
  "People": "./src/keyboards/people.json",
  "BMW Palette": "./src/keyboards/bmw_palette.json"
};

// TODO:  this is identical to `ActionBmwCodeCellPropsType`.  Should it be?
type CommandGoBackCellPropsType = {
  id: string,
  options: BlissSymbolCellType
};

/*
 * Event handler for an CommandGoBackCellPropsType button/cell that, when clicked,
 * goes back one palette.
 */
const goBackToPalette = async (event) => {
  const { paletteStore, navigationStack } = adaptivePaletteGlobals;
  const button = event.currentTarget;
  speak(button.innerText);

  const paletteToGoBackTo = navigationStack.peek();
  let paletteDefinition = paletteStore.getNamedPalette(paletteToGoBackTo);
  if (!paletteDefinition) {
    const paletteFile = paletteNameAndFile[paletteToGoBackTo.name];
    paletteDefinition = await getPaletteJson(`${paletteFile}`);
    paletteStore.addPalette(paletteDefinition);
  }
  if (paletteDefinition) {
    navigationStack.pop();
    const mainPaletteDisplayArea = document.getElementById("mainPaletteDisplayArea");
    render (html`<${Palette} json=${paletteDefinition}/>`, mainPaletteDisplayArea);
    navigationStack.currentPalette = paletteDefinition;
  }
  else {
    console.error(`goBackToPalette():  Unable to locate the palette definition for ${paletteToGoBackTo}`);
  }
};

export function CommandGoBackCell (props: CommandGoBackCellPropsType) {

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
