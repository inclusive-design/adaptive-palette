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
    this.currPalette = null;
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
   * @param: {JsonPaletteType} palette - The palette to push.  If `null` or
   *                                     `undefined`, the navigation stack is
   *                                      left untouched.
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
   * @return {JsonPaletteType} - reference to the popped palette; null if the
   *                             stack is empty.
   */
  pop () {
    if (this.isEmpty()) {
      return null;
    } else {
      return this.navigateBackStack.pop();
    }
  }

  /**
   * Return the palette at the top of the stack without changing the stack
   * itself.  If an index is given, the palette at that index is returned.  Note
   * that an index of zero denotes the top of the stack.
   * @param {integer} stackIndex - Optional: How far down the stack to peek,
   *                               where zero is the top of the stack (default).
   *                               If out of range, `undefined` is returned.
   * @return {JsonPaletteType} - Reference to the palette at the top of the
   *                             stack or at the given index; `undefined` if
   *                             the given stack index is invalid -- negative or
   *                             greater than the size of the stack.
   */
  peek (stackIndex:number = 0) {
    // Flip the index value since Array.push() puts the item at the end
    // of the array.
    let palette = undefined;
    const index = (this.navigateBackStack.length - stackIndex) - 1;
    if (index >= 0) {
      palette = this.navigateBackStack[index];
    }
    return palette;
  }

  /**
   * Return the palette at the bottom of the stack without changing the stack.
   * @return {JsonPaletteType} - Reference to the palette at the bottom of the
   *                             stack, or `undefined` if the stack is empty.
   */
  peekLast () {
    if (this.isEmpty()) {
      return undefined;
    } else {
      return this.navigateBackStack[0];
    }
  }

  /**
   * Pop/return the most recently pushed palette and set the currently displayed
   * palette to the given one.
   * @param {JsonPaletteType} - The palette that is currently displayed, or
   *                            is about to be displayed.
   * @return {JsonPaletteType} - The most recently visited palette.
   */
  popAndSetCurrent (currentPalette: JsonPaletteType) {
    this.currentPalette = currentPalette;
    return this.pop();
  }

  /**
   * Empty the navigation stack and reset the current palette displayed.
   * @param {JsonPaletteType} - The palette that is currently displayed.
   */
  flushReset (currentPalette: JsonPaletteType) {
    this.currentPalette = currentPalette;
    this.navigateBackStack.length = 0;
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
