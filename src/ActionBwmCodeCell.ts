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
import "./ActionBwmCodeCell.scss";

function debugProps(x) {
  console.log("DEBUGPROPS(): %O", x);
}

type ActionBwmCodeCellProps = {
  id: string,
  options: {
    label: string,
    columnStart: number,
    columnSpan: number,
    rowStart: number,
    rowSpan: number,
    bciAvId: BciAvId
  }
}

export function ActionBwmCodeCell (props: ActionBwmCodeCellProps) {
  debugProps(props);

  const { columnStart, columnSpan, rowStart, rowSpan } = props.options;
  const { bciAvId, label } = props.options;

  const gridStyles = `
    grid-column: ${columnStart} / span ${columnSpan};
    grid-row: ${rowStart} / span ${rowSpan};
  `;

  return html`
    <button id="${props.id}" class="actionBwmCodeCell" style="${gridStyles}" >
      <${BlissSymbol} bciAvId=${bciAvId} label=${label} />
    </button>
  `;
}
