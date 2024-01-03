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
import { BlissCellType } from "./index.d";

type CommandClearEncodingProps = {
  id: string,
  options: BlissCellType
}

export function CommandClearEncoding (props: CommandClearEncodingProps) {
  const { id, options } = props;
  const { label, bciAvId, columnStart, columnSpan, rowStart, rowSpan } = options;
  const { setFullEncoding} = usePaletteState();

  const gridStyles = `
    grid-column: ${columnStart} / span ${columnSpan};
    grid-row: ${rowStart} / span ${rowSpan};
  `;

  const cellClicked = () => {
    setFullEncoding([]);
  };

  return html`
    <button id="${id}" class="commandClearEncoding" style="${gridStyles}" onClick=${cellClicked}>
      <${BlissSymbol} bciAvId=${bciAvId} label=${label}/>
    </button>
  `;
}
