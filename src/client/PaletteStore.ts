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

import { JsonPaletteType, PaletteFileMapType } from "./index.d";

/**
 * Load a palette from the given JSON file using `fetch()`. The location of the
 * JSON file is provided as a variable. If the loading fails, a console error with
 * detailed error message is reported.
 *
 * @param {String} jsonFilePath - Path of the JSON file to load, including the
 *                                ".json" extension.
 * @return {JsonPaletteType}    - The palette itself, or `null` if it could not be
 *                                loaded.
 */
export async function loadPaletteFromJsonFile (jsonFilePath: string): Promise<JsonPaletteType | undefined> {
  try {
    const response = await fetch(jsonFilePath);
    if (!response.ok) {
      console.error(`Error loading ${jsonFilePath}: ${response.status}`);
    }
    return await response.json() as JsonPaletteType;
  } catch (error) {
    console.error(`Error loading ${jsonFilePath}:, ${String(error)}`);
  }
}

export class PaletteStore {

  // Singleton storage for all palettes
  // The contents are named Palette instances; hence, each palette must have
  // a unique name.
  static paletteMap: Record<string, JsonPaletteType> = {};

  // Singleton map of palette names and their files.
  static paletteFileMap: PaletteFileMapType = {};

  /**
   * Report if the PaletteStore is empty.
   * @return: `true` if the store is empty; `false` otherwise.
   */
  isEmpty (): boolean {
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
  addPalette (palette: JsonPaletteType | undefined, paletteName?: string): void {
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
  removePalette (paletteName: string): JsonPaletteType | null {
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
  get paletteList(): string[] {
    return Object.keys(PaletteStore.paletteMap);
  }

  /**
   * Accessor for retrieving the named palette.
   * @param {String} paletteName    - The palette to retrieve.
   * @param {boolean} loadIfMissing - Optional. When `true` and the palette is not in the
   *                                  store, load it from the file the store's
   *                                  `paletteFileMap` names for it, and add it to the
   *                                  store.
   * @return {JsonPaletteType} reference to the named palette, or undefined if there is no
   *                           such palette.
   */
  async getNamedPalette (paletteName: string, loadIfMissing = false): Promise<JsonPaletteType | undefined> {
    const palette: JsonPaletteType | undefined = PaletteStore.paletteMap[paletteName];
    if (palette || !loadIfMissing) {
      return palette;
    }
    // A name the file map does not know is not loadable, so there is nothing to fetch.
    const filePath = PaletteStore.paletteFileMap[paletteName];
    if (!filePath) {
      return undefined;
    }
    const loadedPalette = await loadPaletteFromJsonFile(filePath);
    this.addPalette(loadedPalette);
    return loadedPalette;
  }
}
