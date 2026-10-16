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
 * Make the named palette the current one, and remember the one the user is looking at so Back
 * returns to it. Does nothing when it is current already. Logs an error when the palette set
 * has no palette by that name.
 * @param {string} paletteName - The palette's name in the palette set.
 * @returns {Promise<void>}
 */
export async function goToPalette (paletteName: string): Promise<void> {
  const { paletteStore, navigationStack } = adaptivePaletteGlobals;
  const paletteDefinition = await paletteStore.getNamedPalette(paletteName, true);
  if (!paletteDefinition) {
    console.error(`goToPalette(): Unable to locate palette definition for ${paletteName}`);
    return;
  }

  // Already looking at it. A persistent cell such as the command bar's "Msg Style" stays
  // tappable once its palette is current, and pushing that palette onto itself would leave
  // the first `Back` press doing nothing.  The palettes are compared by reference because a
  // palette may be stored under a key that differs from its `name`.
  if (navigationStack.currentPalette === paletteDefinition) {
    return;
  }

  // Push the palette the user is looking at, not the one the calling cell sits in:
  // a cell in an included palette, such as the Command Bar, sits in a different one.
  navigationStack.push(navigationStack.currentPalette);
  navigationStack.currentPalette = paletteDefinition;
}
