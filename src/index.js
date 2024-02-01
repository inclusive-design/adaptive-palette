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
import { render } from "preact";
import { html } from "htm/preact";
import { initAdaptivePaletteGlobals, adaptivePaletteGlobals} from "./GlobalData";
import "./index.scss";

// Initialize any globals used elsewhere in the code.
await initAdaptivePaletteGlobals();

import { Palette } from "./Palette";

// Set up palette for choosing palettes
import paletteChooser from "./keyboards/palettes.json";
render (html`<${Palette} json=${paletteChooser}/>`, document.getElementById("paletteChooserViaBliss"));

// Start with the BMW palette
import bmwJson from "./keyboards/bmw_palette.json";
adaptivePaletteGlobals.navigationStack.currentPalette = bmwJson;
render(html`<${Palette} json=${bmwJson}/>`, document.getElementById("mainPaletteDisplayArea"));
