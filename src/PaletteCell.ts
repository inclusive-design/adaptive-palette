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

import { html } from "htm/preact";
import { BlissSymbol, BciAvId } from "./BlissSymbol";
import "./PaletteCell.scss";

function debugProps(x) {
  console.log("DEBUGPROPS(): %O", x);
}


type PaletteCellProps = {
  id: string,
  options: {
    label: string,
    columnStart: number,
    columnSpan: number,
    rowStart: number,
    rowSpan: number,
    bciAvId: BciAvId
  },
  class?: string,
  style?: string
}

export function PaletteCell (props: PaletteCellProps) {
  debugProps(props);

  const { columnStart, columnSpan, rowStart, rowSpan } = props.options;
  const { bciAvId, label } = props.options;

  // Basic styles are the `paletteCell` class defined in PaletteCell.css.
  // Concatenate any additional classes provided by `props`.
  let classes = "paletteCell";
  if (props.class) {
    classes = `${classes} ${props.class}`;
  }
  let disabled = false;
  if (classes.indexOf("disabled") >= 0) {
    disabled = true;
  }

  // Also concatenate local styles with given grid cell styles
  let styles = `
    grid-column: ${columnStart} / span ${columnSpan};
    grid-row: ${rowStart} / span ${rowSpan};
  `;
  if (props.style) {
    styles = `${styles} ${props.style}`;
  }

  // Get svg graphic for the cell
  return html`
    <button id="${props.id}" class="${classes}" style="${styles}" disabled=${disabled}>
      <${BlissSymbol} bciAvId=${bciAvId} label=${label} />
    </button>
  `;
}
