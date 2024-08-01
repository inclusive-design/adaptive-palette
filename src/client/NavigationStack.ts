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

import { NavStackItemType } from "./index.d";

export class NavigationStack {

  // The actual stack keeping track of where the user was.  The top-most palette
  // is the most recent one the user was at before navigating to a new
  // layer/palette.
  navigateBackStack: Array<NavStackItemType>;

  // The current palette in the palette display area
  currPalette: NavStackItemType;

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
  isEmpty (): boolean {
    return this.navigateBackStack.length === 0;
  }

  /**
   * Puah a palette onto the top of the navigation stack and also remember where
   * it was rendered.
   * @param: {NavStackItemType} palette - The palette to push.  If `null` or
   *                                     `undefined`, the navigation stack is
   *                                      left untouched.
   */
  push (palette: NavStackItemType): void {
    if (!palette) {
      return;
    }
    this.navigateBackStack.push(palette);
  }

  /**
   * Pop and return the most recently pushed palette from the top of the
   * navigation stack.
   * @return {NavStackItemType} - reference to the popped palette; null if the
   *                              stack is empty.
   */
  pop (): NavStackItemType | null {
    if (this.isEmpty()) {
      return null;
    } else {
      return this.navigateBackStack.pop();
    }
  }

  /**
   * Return the stack item at the top of the stack without changing the stack
   * itself.  If an index is given, the palette at that index is returned.  Note
   * that an index of zero denotes the top of the stack.
   * @param {integer} stackIndex - Optional: How far down the stack to peek,
   *                               where zero is the top of the stack (default).
   *                               If out of range, `undefined` is returned.
   * @return {NavStackItemType} - Reference to the palette at the top of the
   *                              stack or at the given index; `undefined` if
   *                              the given stack index is invalid -- negative
   *                              or greater than the size of the stack.
   */
  peek (stackIndex:number = 0): NavStackItemType | undefined {
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
   * Return the stack item at the bottom of the stack without changing the stack.
   * @return {NavStackItemType} - Reference to the palette at the bottom of the
   *                              stack, or `undefined` if the stack is empty.
   */
  peekLast (): NavStackItemType | undefined {
    if (this.isEmpty()) {
      return undefined;
    } else {
      return this.navigateBackStack[0];
    }
  }

  /**
   * Pop/return the most recently pushed palette and set the currently displayed
   * palette to the given one.
   * @param {NavStackItemType} - The palette that is currently displayed, or
   *                             is about to be displayed.
   * @return {NavStackItemType} - The most recently visited palette.
   */
  popAndSetCurrent (currentPalette: NavStackItemType): NavStackItemType | null {
    this.currentPalette = currentPalette;
    return this.pop();
  }

  /**
   * Empty the navigation stack and reset the current palette displayed.
   * @param {NavStackItemType} - The palette that is currently displayed.
   */
  flushReset (currentPalette: NavStackItemType): void {
    this.currentPalette = currentPalette;
    this.navigateBackStack.length = 0;
  }

  /**
   * Accessor for setting the currently displayed palette.
   * @param: {NavStackItemType} - the intended current palette.
   */
  set currentPalette (palette: NavStackItemType) {
    this.currPalette = palette;
  }

  /**
   * Accessor for getting the currently displayed palette.
   * @return: {NavStackItemType} - The current palette.
   */
  get currentPalette(): NavStackItemType {
    return this.currPalette;
  }
}
