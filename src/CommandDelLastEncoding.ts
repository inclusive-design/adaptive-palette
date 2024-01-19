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

import { html } from "htm/preact";
import { BlissSymbol } from "./BlissSymbol";
import { usePaletteState } from "./GlobalData";
import { BlissCellType } from "./index.d";
import { getGridStyle, speak } from "./GlobalUtils";

type CommandDelLastEncodingProps = {
  id: string,
  options: BlissCellType
}

export function CommandDelLastEncoding (props: CommandDelLastEncodingProps) {
  const { id, options } = props;
  const { label, bciAvId, columnStart, columnSpan, rowStart, rowSpan } = options;

  // Using separate lines to get "fullEncoding" & "setFullEncoding" rather than using one single line:
  // { fullEncoding, setFullEncoding } = usePaletteState();
  // is to accommodate the component unit test in which the parent palette component is not tested. The
  // palette state is defined in the palette context.
  const paletteState = usePaletteState();
  const fullEncoding = paletteState?.fullEncoding;
  const setFullEncoding = paletteState?.setFullEncoding;

  const gridStyles = getGridStyle(columnStart, columnSpan, rowStart, rowSpan);

  const cellClicked = () => {
    const newEncoding = [...fullEncoding];
    newEncoding.pop();
    setFullEncoding(newEncoding);
    speak(props.options.label);
  };

  return html`
    <button id="${id}" class="btn-command" style="${gridStyles}" onClick=${cellClicked}>
      <${BlissSymbol} bciAvId=${bciAvId} label=${label}/>
    </button>
  `;
}
