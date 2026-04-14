/*
 * Copyright 2023-2026 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { VNode } from "preact";
import { useCallback } from "preact/hooks";
import { html } from "htm/preact";

import { generateGridStyle, speak } from "./GlobalUtils";
import { BlissSymbolInfoType, LayoutInfoType } from "./index"; // Removed .d
import "./ActionTextCell.scss";

type ActionTextCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

export function ActionTextCell(props: ActionTextCellPropsType): VNode {
  const { id, options } = props;
  const { columnStart, columnSpan, rowStart, rowSpan, label } = options;
  
  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  const sentenceClicked = useCallback(() => {
    // The sentences are listed with leading numbers like so:
    // 1. My brother's birthday is next Wednesday.
    // 2. My brother's special day is Wednesday.
    // 3. ...
    // Regex matches numbers at the start, a literal dot, and any trailing spaces
    speak(label.replace(/^[0-9]+\.\s*/, ""));
  }, [label]);

  return html`
    <button 
      id=${id} 
      class="actionTextCell" 
      style=${gridStyles} 
      onClick=${sentenceClicked}
    >
      ${label}
    </button>
  `;
}
