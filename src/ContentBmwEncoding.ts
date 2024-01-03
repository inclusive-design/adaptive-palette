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
import { BlissSymbol } from "./BlissSymbol";
import { usePaletteState } from "./GlobalData";
import { ContentBmwEncodingType } from "./index.d";
import "./ContentBmwEncoding.scss";

type ContentBmwEncodingProps = {
  id: string,
  options: ContentBmwEncodingType
}

export function ContentBmwEncoding (props: ContentBmwEncodingProps) {
  const  { fullEncoding } = usePaletteState();
  const { id, options } = props;
  const { columnStart, columnSpan, rowStart, rowSpan } = options;

  // TODO: use a common utility function to calculate the grid position
  const styles = `
    grid-column: ${columnStart} / span ${columnSpan};
    grid-row: ${rowStart} / span ${rowSpan};
  `;

  return html`
    <div id="${id}" class="bmwEncodingArea" role="region" aria-label="BMW Encoding Area" style="${styles}">
      ${fullEncoding.map((payload) => html`
        <div class="blissSymbol"><${BlissSymbol} bciAvId=${payload.bciAvId} label=${payload.label} /></div>
      `)}
    </div>
  `;
}
