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
import { adaptivePaletteGlobals } from "./GlobalData";
import { Palette } from "./Palette";
import { BlissSymbol } from "./BlissSymbol";
import "./ActionBmwCodeCell.scss";

function debugProps(x) {
  console.debug("DEBUGPROPS(): %O", x);
}

/*
 * Event handler for an ActionBranchToPalette button/cell that, when clicked,
 * finds and renders the palette referenced by this cell.
 */
const navigateToPalette = (event) => {
  const { paletteStore } = adaptivePaletteGlobals;
  const button = event.currentTarget;

  const branchToPaletteName = button.getAttribute("data-branchto");
  const paletteDefinition = paletteStore.getNamedPalette(branchToPaletteName);
  if (paletteDefinition) {
    render (html`<${Palette} json=${paletteDefinition}/>`, document.getElementById("bmwKeyCodes"));
  }
  else {
    console.error(`navigateToPalette():  Unable to locate the palette definition for ${paletteDefinition}`);
  }
};

export function ActionBranchToPalette (props: ActionBmwCodeCellProps) {
  debugProps(props);

  const { columnStart, columnSpan, rowStart, rowSpan, branchTo } = props.options;
  const { bciAvId, label } = props.options;

  const gridStyles = `
    grid-column: ${columnStart} / span ${columnSpan};
    grid-row: ${rowStart} / span ${rowSpan};
  `;

  return html`
    <button
      id="${props.id}" class="actionBmwCodeCell" style="${gridStyles}"
      data-branchto="${branchTo}" onClick=${navigateToPalette}>
      <${BlissSymbol} bciAvId=${bciAvId} label=${label} />
    </button>
  `;
}
