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
import { adaptivePaletteGlobals } from "../state/GlobalData";
import { Palette } from "./Palette";

/**
 * The palette the user has navigated to.  Mounted once, in the main palette display
 * area; the navigation cells set the current palette on the navigation stack rather
 * than rendering it themselves.
 */
export function CurrentPalette (): VNode | null {
  const palette = adaptivePaletteGlobals.navigationStack.currentPalette;
  return palette ? html`<${Palette} json=${palette}/>` : null;
}
