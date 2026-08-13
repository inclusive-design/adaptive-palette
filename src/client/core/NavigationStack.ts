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

import { signal } from "@preact/signals";
import { JsonPaletteType } from "../index.d";

export class NavigationStack {

  // The actual stack keeping track of where the user was.  The top-most palette
  // is the most recent one the user was at before navigating to a new
  // layer/palette.
  navigateBackStack: Array<JsonPaletteType>;

  // The current palette in the palette display area.  A signal so the component that
  // draws it re-renders when navigation happens.
  currPalette = signal<JsonPaletteType | null>(null);

  // How many palettes are on the stack.  Zero means the root palette is displayed, which
  // is when `Back` and `Home` are unavailable.  A signal so those cells re-render.
  depthSignal = signal<number>(0);

  /**
   * Initialize the navigation stack to have zero entries.
   */
  constructor() {
    this.navigateBackStack = [];
  }

  /**
   * Publish the current stack size so cells rendered outside the palette grid, such as
   * the `Back` and `Home` buttons, re-render when navigation happens.
   */
  syncDepth (): void {
    this.depthSignal.value = this.navigateBackStack.length;
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
   * @param: {JsonPaletteType} palette - The palette to push.  If `null` or
   *                                     `undefined`, the navigation stack is
   *                                      left untouched.
   */
  push (palette: JsonPaletteType | null | undefined): void {
    if (!palette) {
      return;
    }
    this.navigateBackStack.push(palette);
    this.syncDepth();
  }

  /**
   * Pop and return the most recently pushed palette from the top of the
   * navigation stack.
   * @return {JsonPaletteType} - reference to the popped palette; undefined if the
   *                              stack is empty.
   */
  pop (): JsonPaletteType | undefined {
    const palette = this.navigateBackStack.pop();
    this.syncDepth();
    return palette;
  }

  /**
   * Return the stack item at the top of the stack without changing the stack
   * itself.  If an index is given, the palette at that index is returned.  Note
   * that an index of zero denotes the top of the stack.
   * @param {integer} stackIndex - Optional: How far down the stack to peek,
   *                               where zero is the top of the stack (default).
   *                               If out of range, `undefined` is returned.
   * @return {JsonPaletteType} - Reference to the palette at the top of the
   *                              stack or at the given index; `undefined` if
   *                              the given stack index is invalid -- negative
   *                              or greater than the size of the stack.
   */
  peek (stackIndex:number = 0): JsonPaletteType | undefined {
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
   * @return {JsonPaletteType} - Reference to the palette at the bottom of the
   *                              stack, or `undefined` if the stack is empty.
   */
  peekLast (): JsonPaletteType | undefined {
    return this.navigateBackStack[0];
  }

  /**
   * Pop/return the most recently pushed palette and set the currently displayed
   * palette to the given one.
   * @param {JsonPaletteType} - The palette that is currently displayed, or
   *                             is about to be displayed.
   * @return {JsonPaletteType} - The most recently visited palette.
   */
  popAndSetCurrent (currentPalette: JsonPaletteType): JsonPaletteType | undefined {
    this.currentPalette = currentPalette;
    return this.pop();
  }

  /**
   * Empty the navigation stack and reset the current palette displayed.
   * @param {JsonPaletteType | null} - The palette that is currently displayed.
   */
  flushReset (currentPalette: JsonPaletteType | null): void {
    this.currentPalette = currentPalette;
    this.navigateBackStack.length = 0;
    this.syncDepth();
  }

  /**
   * Accessor for setting the currently displayed palette.
   * @param: {JsonPaletteType | null} - the intended current palette.
   */
  set currentPalette (palette: JsonPaletteType | null) {
    this.currPalette.value = palette;
  }

  /**
   * Accessor for getting the currently displayed palette.
   * @return: {JsonPaletteType} - The current palette.
   */
  get currentPalette(): JsonPaletteType | null {
    return this.currPalette.value;
  }

  /**
   * Accessor for the number of palettes on the stack.
   * @return: {number} - The stack depth; zero when the root palette is displayed.
   */
  get depth (): number {
    return this.depthSignal.value;
  }
}
