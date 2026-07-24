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
import { BlissSymbolInfoType, LayoutInfoType } from ".";
import { BlissSymbol } from "./BlissSymbol";
import { changeEncodingContents, adaptivePaletteGlobals } from "./GlobalData";
import { generateGridStyle, speak, insertWordAtCaret } from "./GlobalUtils";
import "./ActionCodeCell.scss";

type ActionCodeCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

export function ActionCodeCell (props: ActionCodeCellPropsType): VNode {
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
    <button id="${props.id}" class="ActionCodeCell" style="${gridStyles}" onClick=${cellClicked}>
      <${BlissSymbol}
        composition=${composition}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}
