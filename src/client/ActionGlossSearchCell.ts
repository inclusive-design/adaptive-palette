/*
 * Copyright 2025-2026 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { VNode } from "preact";
import { useRef } from "preact/hooks";
import { html } from "htm/preact";
import { BlissSymbolInfoType, LayoutInfoType } from "./index.d";
import { BlissSymbol } from "./BlissSymbol";
import { changeEncodingContents } from "./GlobalData";
import { generateGridStyle, speak, insertWordAtCaret } from "./GlobalUtils";
import { compositionToBstr } from "./SvgUtils";
import "./ActionGlossSearchCell.scss";

type ActionGlossSearchCellPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType & { id: number, bciAvId: number }
};

export function ActionGlossSearchCell (props: ActionGlossSearchCellPropsType): VNode {
  const {
    columnStart, columnSpan, rowStart, rowSpan, composition, label, id, bciAvId
  } = props.options;

  // Create a ref for the input instead of relying on document.getElementById
  const inputRef = useRef<HTMLInputElement>(null);

  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  // The label has the form "searchTerm: gloss".  Check if the searchTerm part
  // is a number.  If so, replace it with the `composition`, which is the id of the
  // symbol found when searching for all of the symbols that contain the
  // searched-for symbol.
  const [ searchTerm, glossPart ] = label.split(":");
  let proposedGloss = searchTerm;
  if (proposedGloss.length === 0) {
    proposedGloss = label;
  }
  // Check if searchTerm is a valid number, and make sure glossPart exists
  else if (/^\d+$/.test(searchTerm)) {
    proposedGloss = glossPart || "";
  }

  const compositionString = compositionToBstr(composition);

  const cellClicked = () => {
    // Get value from the ref, fallback to proposedGloss if unavailable
    const theLabel = inputRef.current ? inputRef.current.value : proposedGloss;
    const payload = {
      "id": props.id,
      "label": theLabel,
      "composition": composition,
      "modifierInfo": []
    };
    changeEncodingContents.value = insertWordAtCaret(
      payload,
      changeEncodingContents.value.payloads,
      changeEncodingContents.value.caretPosition
    );
    speak(theLabel);
  };

  return html`
    <div style="${gridStyles}" class="actionGlossSearchCell">
      <button id="${props.id}" onClick=${cellClicked}>
        <${BlissSymbol}
          composition=${composition}
          label=${label}
          isPresentation=true
        />
      </button>
      <div>
        <label for="input-${props.id}">Label: </label>
        <input
          ref=${inputRef}
          id="input-${props.id}"
          defaultValue=${proposedGloss}
        />
        <span>${bciAvId} . ${compositionToBstr(id)} . ${compositionString}</span>
      </div>
    </div>
  `;
}
