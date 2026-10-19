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
import { adaptivePaletteGlobals } from "../state/GlobalData";

/**
 * A layer drawn over the palette that Home and Back leave before they navigate: the sentence
 * layer. The feature registers itself here, so that no cell imports a feature.
 */
export type NavigationOverlay = {
  // Reads signals, so the cells that call it re-render when it opens or closes.
  isOpen: () => boolean,
  hide: () => void
};

let overlay: NavigationOverlay | null = null;

/**
 * Register the overlay. Called from `core/InitGlobals.ts`.
 * @param {NavigationOverlay | null} next - The overlay, or `null` to remove it.
 * @returns {void}
 */
export function setNavigationOverlay (next: NavigationOverlay | null): void {
  overlay = next;
}

/**
 * @returns {boolean} - `true` when the overlay is on screen.
 */
export function navigationOverlayOpen (): boolean {
  return overlay?.isOpen() ?? false;
}

/**
 * Close the overlay, if one is registered.
 * @returns {void}
 */
export function hideNavigationOverlay (): void {
  overlay?.hide();
}

/**
 * Back and Home have nowhere to go: the root palette is showing and no layer covers it.
 * Reads signals, so the cells that call it re-render when either changes.
 * @returns {boolean}
 */
export function atRootWithNoOverlay (): boolean {
  return !navigationOverlayOpen() && adaptivePaletteGlobals.navigationStack.depth === 0;
}
