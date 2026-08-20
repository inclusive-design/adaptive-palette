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
import { BlissSymbolInfoType, LayoutInfoType } from "../index.d";
import { BlissSymbol } from "../components/BlissSymbol";
import { changeEncodingContents, adaptivePaletteGlobals } from "../state/GlobalData";
import { editMessage } from "../core/MessageEdit";
import { generateGridStyle } from "../utils/GridUtils";
import { insertWordAtCaret, normalizeComposition } from "../utils/SymbolEncodingUtils";
import { announceIfEnabled } from "../utils/SpeechUtils";
import "./ActionCodeCell.scss";

type ActionCodeCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

export function ActionCodeCell (props: ActionCodeCellPropsType): VNode {
  const {
    columnStart, columnSpan, rowStart, rowSpan, label
  } = props.options;
  let { composition } = props.options;
  composition = normalizeComposition(composition);
  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  const cellClicked = () => {
    const symbol = typeof composition === "number"
      ? adaptivePaletteGlobals.symbols.find(s => s.id === composition)
      : null;
    // The payload includes an empty `modifierInfo` for this new symbol.
    const payloadComposition = (symbol?.composition ?? props.options.composition);
    const payload = {
      "label": props.options.label,
      "composition": payloadComposition,
      "userSelectedSymbolId": typeof composition === "number" ? composition : undefined,
      "modifierInfo": []
    };
    const{ caretPosition, payloads } = changeEncodingContents.value;
    editMessage(insertWordAtCaret(payload, payloads, caretPosition));
    announceIfEnabled(props.options.label);
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
