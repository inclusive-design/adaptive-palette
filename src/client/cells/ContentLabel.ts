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
import { ContentLabelType } from "../index.d";
import { colorStyle, generateGridStyle } from "../utils/GridUtils";
import "./ContentLabel.scss";

type ContentLabelPropsType = {
  id: string,
  options: ContentLabelType
};

/**
 * Text in a grid slot, with no interaction: a heading for a row or a column of cells, or a Grid 3
 * rest cell, where a dwell user can leave the pointer.
 *
 * Always `aria-hidden`, so use it only where the cells it heads already name themselves.
 * On the attributes palette every button's `aria-label` starts with its category, so reading
 * the row heading as well would say it twice. Beside cells that do not repeat the heading it
 * would hide something a screen reader user needs.
 * @param {ContentLabelPropsType} props - The cell id and its options.
 * @returns {VNode}
 */
export function ContentLabel (props: ContentLabelPropsType): VNode {
  const { id, options } = props;
  const { label, columnStart, columnSpan, rowStart, rowSpan, backgroundColor, textColor } = options;

  const style = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan) + colorStyle(backgroundColor, textColor);

  return html`
    <div id="${id}" class="contentLabel" style="${style}" aria-hidden="true"><span>${label}</span></div>
  `;
}
