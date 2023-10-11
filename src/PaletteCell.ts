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
import "./PaletteCell.scss";

export function PaletteCell (props) {

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
    grid-column: ${props.columnStart} / span ${props.columnSpan};
    grid-row: ${props.rowStart} / span ${props.rowSpan};
  `;
  if (props.style) {
    styles = `${styles} ${props.style}`;
  }

  // Placeholder for svg graphic for the cell
  const svgString = html`
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="presentation">
      <circle cx="5" cy="5" r="4" fill="transparent" stroke="black" stroke-width="1"/>
    </svg>
  `;

  return html`
    <button id="${props.id}" class="${classes}" style="${styles}" disabled=${disabled}>
      ${svgString}
      ${props.labelText}
    </button>
  `;
}
