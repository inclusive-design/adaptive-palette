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

// Set up palette for navigating to other palettes
import firstLayer from "./keyboards/palettes.json";
adaptivePaletteGlobals.paletteStore.addPalette(firstLayer);
import goBackCell from "./keyboards/backup_palette.json";
adaptivePaletteGlobals.paletteStore.addPalette(goBackCell);
//import outputPalette from "./keyboards/output_area.json";
//adaptivePaletteGlobals.paletteStore.addPalette(outputPalette);

adaptivePaletteGlobals.navigationStack.currentPalette = firstLayer;
render(html`<${Palette} json=${goBackCell} />`, document.getElementById("backup_palette"));
//render(html`<${Palette} json=${outputPalette} />`, document.getElementById("output_palette"));
render(html`<${Palette} json=${firstLayer}/>`, document.getElementById("mainPaletteDisplayArea"));
