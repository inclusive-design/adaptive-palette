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
import { html } from "htm/preact";
import { BlissSymbolInfoType, LayoutInfoType } from "./index.d";
import { BlissSymbol } from "./BlissSymbol";
import { changeEncodingContents, adaptivePaletteGlobals } from "./GlobalData";
import { generateGridStyle, speak, insertWordAtCaret } from "./GlobalUtils";
import "./ActionBmwCodeCell.scss";

type ActionBmwCodeCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

export function ActionBmwCodeCell (props: ActionBmwCodeCellPropsType): VNode {
  const {
    columnStart, columnSpan, rowStart, rowSpan, composition, label
  } = props.options;

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  const cellClicked = () => {
    const symbol = typeof composition === "number"
      ? adaptivePaletteGlobals.symbols.find(s => s.id === composition)
      : null;
    // The payload includes an empty `modifierInfo` for this new symbol.
    const payloadComposition = (symbol?.composition ?? props.options.composition);
    const payload = {
      "id": props.id,
      "label": props.options.label,
      "composition": payloadComposition,
      "modifierInfo": []
    };
    const{ caretPosition, payloads } = changeEncodingContents.value;
    changeEncodingContents.value = insertWordAtCaret(payload, payloads, caretPosition);
    speak(props.options.label);
  };

  return html`
    <button id="${props.id}" class="actionBmwCodeCell" style="${gridStyles}" onClick=${cellClicked}>
      <${BlissSymbol}
        composition=${composition}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}
