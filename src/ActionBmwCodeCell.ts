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
import { OptionsType } from "./index.d";
import { BlissSymbol } from "./BlissSymbol";
import "./ActionBmwCodeCell.scss";


type ActionBmwCodeCellPropsType = {
  id: string,
  options: OptionsType
};

export function ActionBmwCodeCell (props: ActionBmwCodeCellPropsType) {
  const {
    columnStart, columnSpan, rowStart, rowSpan, bciAvId, label
  } = props.options;

  const gridStyles = `
    grid-column: ${columnStart} / span ${columnSpan};
    grid-row: ${rowStart} / span ${rowSpan};
  `;

  return html`
    <button id="${props.id}" class="actionBmwCodeCell" style="${gridStyles}" >
      <${BlissSymbol}
        bciAvId=${bciAvId}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}
