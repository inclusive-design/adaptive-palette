/*
 * Copyright 2023-2024 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { JsonPaletteType } from "./index.d";

export class PaletteStore {

  // Singleton storage for all palettes
  // The contents are named Palette instances; hence, each palette must have
  // a unique name.
  static paletteMap = {};

  // Singleton map of palette names and their files.
  static paletteFileMap; PaletteFileMapType = {};

  /**
   * Report if the PaletteStore is empty.
   * @return: `true` if the store is empty; `false` otherwise.
   */
  isEmpty () {
    return Object.keys(PaletteStore.paletteMap).length === 0;
  }

  /**
   * Add a palette to the store, or replace a palette with a new one.  If the
   * palette's name/identifier matches a palette already in the store, it
   * replaces it.
   * @param: {JsonPaletteType} palette - The palette to add to the store.
   * @param: {JsonPaletteType}.name    - The internal name of the palette.
   * @param: {String} name             - Optional, the preferred name of th
   *                                     palette.
   */
  addPalette (palette: JsonPaletteType, paletteName?: string) {
    if (!palette) {
      return;
    }
    let palName;
    if (paletteName) {
      palName = paletteName;
    } else if (palette.name) {
      palName = palette.name;
    } else {
      return;
    }
    PaletteStore.paletteMap[palName] = palette;
    console.log(`Palette ${palName} added to the store.`);
  }

  /**
   * Remove the palette with the given name.
   * @param: {String} paletteName - The palette to remove.
   * @return {JsonPaletteType} reference to the removed palette.
   */
  removePalette (paletteName: string) {
    if (this.isEmpty()) {
      return null;
    } else {
      const palette = PaletteStore.paletteMap[paletteName];
      if (palette) {
        delete PaletteStore.paletteMap[paletteName];
        console.log(`Palette ${paletteName} removed from the store.`);
      }
      return palette;
    }
  }

  /**
   * Accessor for the number of palettes in the store.
   * @return: {integer} the number of palettes in the store}.
   */
  get numPalettes() : number {
    return Object.keys(PaletteStore.paletteMap).length;
  }

  /**
   * Accessor for a list of names of palettes in the store.
   * @return: {Array} of palette names.
   */
  get paletteList() {
    return Object.keys(PaletteStore.paletteMap);
  }

  /**
   * Accessor for a retrieving the named palette.
   * @param: {String} paletteName     - The palette to retrieve.
   * @param; {Function} loadFunction  - Optional async function to call to load
   *                                    the palette using the store's
   *                                    PaletteFileMap if the palette is not in
   *                                    the store.
   * @return {JsonPaletteType} reference to the named palette, or undefined if
   *                           no such palette.
   */
  async getNamedPalette(paletteName: string, loadFunction?: (file:string, path:string) => Promise<JsonPaletteType>) {
    let palette = PaletteStore.paletteMap[paletteName];
    if (!palette && loadFunction) {
      palette = await loadFunction(
        PaletteStore.paletteFileMap[paletteName],
        PaletteStore.paletteFileMap["path"]
      );
      this.addPalette(palette);
    }
    return palette;
  }
}
