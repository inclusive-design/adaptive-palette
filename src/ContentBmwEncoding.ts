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
import "./ContentBmwEncoding.scss";
import { onMessage } from "./GlobalMessageHandler";

type ContentBmwEncodingProps = {
  id: string,
  columnSpan: number,
  options: {
    columnStart: number,
    rowStart: number,
    rowSpan: number
  }
}

export function ContentBmwEncoding (props: ContentBmwEncodingProps) {
  const { id, options, columnSpan } = props;
  const { columnStart, rowStart, rowSpan } = options;
  const fullEncoding = [];

  // TODO: use a common utility function to calculate the grid position
  const styles = `
    grid-column: ${columnStart} / span ${columnSpan};
    grid-row: ${rowStart} / span ${rowSpan};
  `;

  onMessage("addBmwCode", (payload) => {
    // update the state of the BMW encoding content
    fullEncoding.push(payload);
    // append the new payload to the display area
    document.getElementById(id).innerHTML += payload.label;
  });

  onMessage("deleteAllBmwCodes", () => {
    document.getElementById(id).innerHTML = "";
  });

  return html`
    <div id="${id}" class="bmwEncodingArea" style="${styles}"></div>
  `;
}
