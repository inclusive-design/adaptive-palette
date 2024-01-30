/*
 * Copyright 2024 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { JsonPaletteType } from "./index.d";

export class NavigationStack {

  // The actual stack keeping track of where the user was.  The top-most palette
  // is the most recent one the user was at before navigating to a new
  // layer/palette.
  navigateBackStack: Array<JsonPaletteType>;

  // The current palette in the palette display area
  currPalette: JsonPaletteType;

  /**
   * Initialize the navigation stack to have zero entries.
   */
  constructor() {
    this.navigateBackStack = [];
  }

  /**
   * Report if the navigation stack is empty.
   * @return: `true` if the stack is empty; `false` otherwise.
   */
  isEmpty () {
    return this.navigateBackStack.length === 0;
  }

  /**
   * Puah a palette onto the top of the navigation stack.
   * @param: {Palette} palette - The palette to push.  If `null` or `undefined`,
   *                             the navigation stack is left untouched.
   */
  push (palette: JsonPaletteType) {
    if (!palette) {
      return;
    }
    this.navigateBackStack.push(palette);
  }

  /**
   * Pop and return the most recently pushed palette from the top of the
   * navigation stack.
   * @return {Palette} - reference to the popped palette; null if the stack is
   *                     empty.
   */
  pop () {
    if (this.isEmpty()) {
      return null;
    } else {
      return this.navigateBackStack.pop();
    }
  }

  /**
   * Return the palette at the top of the stack without changing the stack it.
   * If an index is given, the palette at that index is returned.  Note that an
   * index of zero denotes the top of the stack.
   * @param {integer} stackIndex - Optional: How far down the stack to peek,
   *                               where zero is the top of the stack (default).
   *                               If out of range, `null` is returned.
   * @return {Palette} - Reference to the palette at the top of the stack or at
   *                     the given index; null if no palette is available at the
   *                     the given index.
   */
  peek (stackIndex:number = 0) {
    // Flip the index value since Array.push() puts the item at the end
    // of the array.
    const index = (this.navigateBackStack.length - stackIndex) - 1;
    let palette = null;
    if (index >= 0) {
      palette = this.navigateBackStack[index];
    }
    return palette;
  }

  /**
   * Accessor for setting the currently displayed palette.
   * @return: {JsonPaletteType} - the current palette.
   */
  set currentPalette (palette: JsonPaletteType) {
    this.currPalette = palette;
  }

  /**
   * Accessor for getting the currently displayed palette.
   * @return: {JsonPaletteType} - The current palette.
   */
  get currentPalette(): JsonPaletteType {
    return this.currPalette;
  }
}
