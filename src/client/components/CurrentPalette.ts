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
import { useLayoutEffect, useRef } from "preact/hooks";
import { adaptivePaletteGlobals } from "../state/GlobalData";
import { Palette } from "./Palette";

/**
 * The first control a palette draws itself, skipping the palettes it includes such as the
 * shared header: the cells the user navigated to this palette to reach.
 * @param {string} paletteName - The palette's `name`.
 * @returns {HTMLElement | null}
 */
function firstOwnControl (paletteName: string): HTMLElement | null {
  const paletteElement = document.querySelector(`[data-palettename="${CSS.escape(paletteName)}"]`);
  const controls = paletteElement?.querySelectorAll<HTMLElement>("button, [tabindex='0']") ?? [];
  return Array.from(controls).find((control) => !control.closest(".paletteInclude")) ?? null;
}

/**
 * The palette the user has navigated to.  Mounted once, in the main palette display
 * area; the navigation cells set the current palette on the navigation stack rather
 * than rendering it themselves.
 */
export function CurrentPalette (): VNode | null {
  const palette = adaptivePaletteGlobals.navigationStack.currentPalette;
  const shownRef = useRef(palette);

  // If the palette changes and focus is lost, restore it to the palette's first control.
  // Otherwise, keep the existing focus. Nothing moves on the first render.
  useLayoutEffect(() => {
    if (shownRef.current === palette) {
      return;
    }
    shownRef.current = palette;
    const focusLost = !document.activeElement || document.activeElement === document.body;
    if (palette && focusLost) {
      firstOwnControl(palette.name)?.focus();
    }
  }, [palette]);

  return palette ? html`<${Palette} json=${palette}/>` : null;
}
