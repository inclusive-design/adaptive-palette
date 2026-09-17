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

import { JsonPaletteType, PaletteFileMapType, PaletteIncludeType, PaletteSetType } from "../index.d";

// The cell type that draws another palette. `Palette.ts` handles it rather than the cell type
// registry, which cannot import `Palette` without making an import cycle.
export const PALETTE_INCLUDE_TYPE = "PaletteInclude";

// The only palette set format this code reads.
const PALETTE_SET_FORMAT_VERSION = 1;

// The palette set loaded when the page URL names none.
export const DEFAULT_PALETTE_SET = "standardBlissChart";

// A set name is a folder name under `/palette-sets/`. Allowing only these characters keeps the
// path from reaching outside that folder.
const PALETTE_SET_NAME = /^[A-Za-z0-9_-]+$/;

/**
 * The path of the palette set file the page URL asks for with `?set=<folder>`.
 * @param {String} search - The URL's query string, such as `window.location.search`.
 * @return {String} - `/palette-sets/<set>/palette_set.json`.
 * @throws when `set` holds anything but letters, digits, `_` and `-`.
 */
export function paletteSetPath (search: string): string {
  const setName = new URLSearchParams(search).get("set") ?? DEFAULT_PALETTE_SET;
  if (!PALETTE_SET_NAME.test(setName)) {
    throw new Error(`Invalid palette set name "${setName}"`);
  }
  return `/palette-sets/${setName}/palette_set.json`;
}

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
   * Load a palette set file and record where each of its palettes is, so `getNamedPalette()` can
   * load them by name.
   * @param {String} paletteSetPath - Path of the palette set file.
   * @return {String} - The name of the palette to show first.
   * @throws when the file cannot be loaded, or has a format version this code does not read.
   */
  async loadPaletteSet (paletteSetPath: string): Promise<string> {
    const response = await fetch(paletteSetPath);
    if (!response.ok) {
      throw new Error(`Failed to load ${paletteSetPath}: ${response.status}`);
    }
    const paletteSet = await response.json() as PaletteSetType;
    if (paletteSet.formatVersion !== PALETTE_SET_FORMAT_VERSION) {
      throw new Error(`${paletteSetPath}: unsupported formatVersion ${paletteSet.formatVersion}`);
    }
    // Paths in the file are relative to the file itself.
    const baseUrl = new URL(paletteSetPath, window.location.href);
    const fileMap: PaletteFileMapType = {};
    Object.entries(paletteSet.palettes).forEach(([paletteName, relativePath]) => {
      fileMap[paletteName] = new URL(relativePath, baseUrl).pathname;
    });
    PaletteStore.paletteFileMap = fileMap;
    return paletteSet.startPalette;
  }

  /**
   * Accessor for retrieving the named palette.
   * @param {String} paletteName    - The palette to retrieve.
   * @param {boolean} loadIfMissing - Optional. When `true` and the palette is not in the
   *                                  store, load it from the file the store's
   *                                  `paletteFileMap` names for it, add it to the store,
   *                                  and load the palettes it includes the same way.
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
    if (!loadedPalette) {
      return undefined;
    }
    this.addPalette(loadedPalette, paletteName);

    // Included palettes are drawn with this one, so they are loaded now rather than on click.
    // This palette is already in the store, so an include cycle, or a palette included twice,
    // finds it there instead of fetching it again.
    for (const cell of Object.values(loadedPalette.cells)) {
      if (cell.type === PALETTE_INCLUDE_TYPE) {
        await this.getNamedPalette((cell.options as PaletteIncludeType).palette, true);
      }
    }
    return loadedPalette;
  }
}
