/*
 * Copyright 2026 Inclusive Design Research Centre, OCAD University
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
import { composeWordContents, COMPOSE_AREA_ID } from "./GlobalData";
import { generateGridStyle, speak } from "./GlobalUtils";
import { isCombined, combineContent, uncombineContent, SymbolCompositionToSkip } from "./CursorActions";
import "./ActionModifierCell.scss";

const COMBINE_MARKER_PAYLOAD = {
  "id": "foo",
  "label": "",
  "composition": 233,
  "modifierInfo": []
};

type ToggleMakeCombinationPropsType = {
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType
};

export function ToggleMakeCombination (props: ToggleMakeCombinationPropsType): VNode {
  const {
    columnStart, columnSpan, rowStart, rowSpan, label, composition
  } = props.options;

  const { payloads } = composeWordContents.value;
  const gridStyles = generateGridStyle(columnStart, columnSpan, rowStart, rowSpan);
  const disabled = payloads.length === 0;

  const isCombinedNow = isCombined(payloads, SymbolCompositionToSkip);

  const cellClicked = () => {
    if (payloads.length === 0) {
      return;
    }

    if (isCombinedNow) {
      const updatedPayloads = uncombineContent(composeWordContents.value, SymbolCompositionToSkip);
      if (updatedPayloads !== composeWordContents.value) {
        composeWordContents.value = updatedPayloads;
        speak("remove combination");
      }
    } else {
      composeWordContents.value = combineContent(
        composeWordContents.value, COMBINE_MARKER_PAYLOAD
      );
      speak("add combination");
    }
  };

  return html`
    <button
      id="${props.id}"
      class="actionModifierCell"
      style="${gridStyles}"
      onClick=${cellClicked}
      disabled="${disabled}"
      aria-controls="${COMPOSE_AREA_ID}"
      aria-pressed="${isCombinedNow}">
      <${BlissSymbol}
        composition=${composition}
        label=${label}
        isPresentation=true
      />
    </button>
  `;
}
