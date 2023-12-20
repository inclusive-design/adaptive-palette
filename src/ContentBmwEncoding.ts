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
import { useState } from "preact/hooks";
import { onMessage } from "./GlobalMessageHandler";
import { BlissSymbol } from "./BlissSymbol";
import { BciAvIdType } from "./index.d";
import "./ContentBmwEncoding.scss";

type ContentBmwEncodingProps = {
  id: string,
  columnSpan: number,
  options: {
    columnStart: number,
    rowStart: number,
    rowSpan: number
  }
}

type AddBmwCodeMsgPayload = {
  id: string,
  label: string,
  bciAvId: BciAvIdType
}

export function ContentBmwEncoding (props: ContentBmwEncodingProps) {
  const { id, options, columnSpan } = props;
  const { columnStart, rowStart, rowSpan } = options;
  const [fullEncoding, setFullEncoding] = useState([]);

  // TODO: use a common utility function to calculate the grid position
  const styles = `
    grid-column: ${columnStart} / span ${columnSpan};
    grid-row: ${rowStart} / span ${rowSpan};
  `;

  onMessage("addBmwCode", (payload: AddBmwCodeMsgPayload) => {
    setFullEncoding([...fullEncoding, payload]);
  });

  return html`
    <div id="${id}" class="bmwEncodingArea" role="region" aria-label="BMW Encoding Area" style="${styles}">
      ${fullEncoding.map((payload) => html`
        <div class="blissSymbol"><${BlissSymbol} bciAvId=${payload.bciAvId} label=${payload.label} /></div>
      `)}
    </div>
  `;
}
