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
 * Read what the switch scanner is highlighting, as the user sees it.
 */
import { CELL_CLASS, OVERLAY_ID } from "../features/switch-scanning/SwitchScanning";

/**
 * The controls whose centres lie inside the row outline, left to right; empty when no row is
 * outlined.
 * @returns {HTMLElement[]}
 */
export function outlinedRow (): HTMLElement[] {
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay || overlay.hidden) {
    return [];
  }
  const box = overlay.getBoundingClientRect();
  return Array.from(document.querySelectorAll<HTMLElement>("button, [tabindex='0'], input"))
    .filter((el) => {
      const rect = el.getBoundingClientRect();
      const x = (rect.left + rect.right) / 2;
      const y = (rect.top + rect.bottom) / 2;
      return rect.width > 0 && x > box.left && x < box.right && y > box.top && y < box.bottom;
    });
}

/**
 * Whether the row outline carries the "Exit row" tag.
 * @returns {boolean}
 */
export function onExitStop (): boolean {
  const overlay = document.getElementById(OVERLAY_ID);
  return !!overlay && !overlay.hidden && overlay.hasAttribute("data-exit");
}

/**
 * The one control highlighted on its own, or null.
 * @returns {HTMLElement | null}
 */
export function highlightedCell (): HTMLElement | null {
  return document.querySelector<HTMLElement>(`.${CELL_CLASS}`);
}
