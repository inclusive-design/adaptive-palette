/*
 * Copyright The Adaptive Palette copyright holders
 * See the AUTHORS.md file at the top-level directory of this distribution and at
 * https://github.com/inclusive-design/adaptive-palette/raw/main/AUTHORS.md.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { VNode } from "preact";
import { html } from "htm/preact";
import { ContentRemovedType } from "../index.d";
import { colorStyle, generateGridStyle } from "../utils/GridUtils";
import "./ContentRemoved.scss";

type ContentRemovedPropsType = {
  id: string,
  options: ContentRemovedType
};

/**
 * The cell that led to a grid removed for privacy: its label, then the notice on a second line,
 * as `scripts/clean_grid3.js` writes them. Text, not a button, so it does nothing when pressed
 * and switch scanning skips it. Screen readers read it.
 * @param {ContentRemovedPropsType} props - The cell id and its options.
 * @returns {VNode}
 */
export function ContentRemoved (props: ContentRemovedPropsType): VNode {
  const { id, options } = props;
  const { label, columnStart, columnSpan, rowStart, rowSpan, backgroundColor, textColor } = options;

  const style = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan) + colorStyle(backgroundColor, textColor);

  return html`
    <div id="${id}" class="contentRemoved" style="${style}"><span>${label}</span></div>
  `;
}
