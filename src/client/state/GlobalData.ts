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
 * Populate and export global data
 */
import { signal } from "@preact/signals";
import { makeDefaultConfig } from "../core/Config";
import type { ContentSignalDataType, BlissSymbolEntry } from "../index.d";

// NOTE: this import causes a warning serving the application using the `vite`
// server.  The warning suggests to *not* use the `public` folder but to use
// the `src` folder instead.  However, this code is also served using node
// express and it is in the proper location for that envionment.  A copy of the
// warning follows:
// "Assets in public directory cannot be imported from JavaScript.
//  If you intend to import that asset, put the file in the src directory, and use /src/data/bliss_symbol_explanations.json instead of /public/data/bliss_symbol_explanations.json.
//  If you intend to use the URL of that asset, use /data/bliss_symbol_explanations.json?url.
//  Files in the public directory are served at the root path.
//  Instead of /public/data/bliss_symbol_explanations.json, use /data/bliss_symbol_explanations.json."
import bliss_symbols from "../../../public/data/bliss_symbol_explanations.json";

// NOTE: This file doesn't import cell components to prevent circular dependencies.
// Those are imported in `cellTypeRegistry.ts`
import { PaletteStore } from "../core/PaletteStore";
import { NavigationStack } from "../core/NavigationStack";

/**
 * Load the map between the BCI-AV IDs and the code consumed by the Bliss SVG
 * and create the PaletterStore and NavigationStack objects.
 */
export const adaptivePaletteGlobals = {
  symbols: bliss_symbols.data as BlissSymbolEntry[],
  paletteStore: new PaletteStore(),
  navigationStack: new NavigationStack(),
  models: [] as string[],
  config: makeDefaultConfig(),
  // `config.json` as it was read, before the user's saved settings were applied. The settings
  // dialog compares against it to work out which of its values are overrides.
  fileConfig: makeDefaultConfig(),
  indicatorLabels: {} as Record<string, string>,
  // `id` attribute of the HTML element area where the main palette is
  // displayed, set by initAdaptivePaletteGlobals().  It defaults to the empty
  // string and that identifies the `<body>` elements as a default.
  //
  mainPaletteContainerId: ""
};

/**
 * Signal for updating the contents of the ContentEncoding area.  The value
 * of the signal is an array of SymbolEncodingType objects to display symbols
 * in the ContentEncoding area. It also tracks the position of the caret.
 */
export const changeEncodingContents = signal<ContentSignalDataType>({
  payloads: [],
  caretPosition: -1,
});
