/*
 * Copyright 2023-2024 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { VNode } from "preact";
import { html } from "htm/preact";
import { BlissSymbol } from "./BlissSymbol";
import { changeEncodingContents } from "./GlobalData";
import { ContentBmwEncodingType } from "./index.d";
import { generateGridStyle } from "./GlobalUtils";
import "./ContentBmwEncoding.scss";

type ContentBmwEncodingProps = {
  id: string,
  options: ContentBmwEncodingType
}

export function ContentBmwEncoding (props: ContentBmwEncodingProps): VNode {
  const { id, options } = props;
  const { columnStart, columnSpan, rowStart, rowSpan } = options;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  return html`
    <div id="${id}" class="bmwEncodingArea" role="textbox" aria-label="Input Area" aria-readonly="true" style="${gridStyles}">
      ${changeEncodingContents.value.map((payload) => html`
        <div class="blissSymbol"><${BlissSymbol} bciAvId=${payload.bciAvId} label=${payload.label} isPresentation="true" /></div>
      `)}
    </div>
  `;
}
