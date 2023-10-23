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
import { dispatchMessage } from "./GlobalMessageHandler";
import "./ActionBmwCodeCell.scss";

function debugProps(x) {
  console.log("DEBUGPROPS(): %O", x);
}

type ActionBmwCodeCellProps = {
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

export function ActionBmwCodeCell (props: ActionBmwCodeCellProps) {
  debugProps(props);

  const { columnStart, columnSpan, rowStart, rowSpan } = props.options;
  const { bciAvId, label } = props.options;

  const gridStyles = `
    grid-column: ${columnStart} / span ${columnSpan};
    grid-row: ${rowStart} / span ${rowSpan};
  `;

  const cellClicked = () => {
    dispatchMessage("addBmwCode",{
      "id": props.id,
      "label": props.options.label,
      "bciAvId": props.options.bciAvId
    });
  };

  return html`
    <button id="${props.id}" class="actionBmwCodeCell" style="${gridStyles}" onClick=${cellClicked}>
      <${BlissSymbol} bciAvId=${bciAvId} label=${label}/>
    </button>
  `;
}
