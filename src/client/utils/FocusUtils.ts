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

/**
 * The first control a palette draws itself, skipping the palettes it includes, such as the
 * shared header, and the cells under the open sentence layer: the cells the user came to this
 * palette to reach.
 * @param {string} paletteName - The palette's `name`.
 * @returns {HTMLElement | null}
 */
export function firstOwnControl (paletteName: string): HTMLElement | null {
  const paletteElement = document.querySelector(`[data-palettename="${CSS.escape(paletteName)}"]`);
  const controls = paletteElement?.querySelectorAll<HTMLElement>("button, [tabindex='0']") ?? [];
  return Array.from(controls).find((control) => !control.closest(".paletteInclude, [inert]")) ?? null;
}
