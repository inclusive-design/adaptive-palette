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
import { loadPaletteFromJsonFile } from "./GlobalUtils";
import "./index.scss";

// Initialize any globals used elsewhere in the code.
await initAdaptivePaletteGlobals("mainPaletteDisplayArea");

import { PaletteStore } from "./PaletteStore";
import { Palette } from "./Palette";

const paletteFileMap = await loadPaletteFromJsonFile("/palettes/palette_file_map.json");
const firstLayer = await loadPaletteFromJsonFile("/palettes/palettes.json");
const goBackCell = await loadPaletteFromJsonFile("/palettes/backup_palette.json");
const inputArea = await loadPaletteFromJsonFile("/palettes/input_area.json");
const strategies = await loadPaletteFromJsonFile("/palettes/strategies.json");


PaletteStore.paletteFileMap = paletteFileMap;
adaptivePaletteGlobals.paletteStore.addPalette(firstLayer);
adaptivePaletteGlobals.paletteStore.addPalette(goBackCell);
adaptivePaletteGlobals.paletteStore.addPalette(inputArea);
adaptivePaletteGlobals.paletteStore.addPalette(strategies);

adaptivePaletteGlobals.navigationStack.currentPalette = firstLayer;
render(html`<${Palette} json=${inputArea} />`, document.getElementById("input_palette"));
render(html`<${Palette} json=${goBackCell} />`, document.getElementById("backup_palette"));
render(html`<${Palette} json=${strategies} />`, document.getElementById("strategies_palette"));
render(html`<${Palette} json=${firstLayer}/>`, document.getElementById("mainPaletteDisplayArea"));
