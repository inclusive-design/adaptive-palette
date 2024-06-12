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
await initAdaptivePaletteGlobals("mainPaletteDisplayArea");

import { PaletteStore } from "./PaletteStore";
import { Palette } from "./Palette";

const paletteFileMapResponse = await fetch("/palettes/palette_file_map.json");
console.log("paletteFileMapResponse: ", paletteFileMapResponse);
const paletteFileMap = await paletteFileMapResponse.json();
console.log("paletteFileMap: ", paletteFileMap);
const firstLayerResponse = await fetch("/palettes/palettes.json");
const firstLayer = await firstLayerResponse.json();
const goBackCellResponse = await fetch("/palettes/backup_palette.json");
const goBackCell = await goBackCellResponse.json();
const inputAreaResponse = await fetch("/palettes/input_area.json");
const inputArea = await inputAreaResponse.json();
// import paletteFileMap from "./palettes/palette_file_map.json";
// import firstLayer from "./palettes/palettes.json";
// import goBackCell from "./palettes/backup_palette.json";
// import inputArea from "./palettes/input_area.json";

PaletteStore.paletteFileMap = paletteFileMap;
adaptivePaletteGlobals.paletteStore.addPalette(firstLayer);
adaptivePaletteGlobals.paletteStore.addPalette(goBackCell);
adaptivePaletteGlobals.paletteStore.addPalette(inputArea);

adaptivePaletteGlobals.navigationStack.currentPalette = firstLayer;
render(html`<${Palette} json=${inputArea} />`, document.getElementById("input_palette"));
render(html`<${Palette} json=${goBackCell} />`, document.getElementById("backup_palette"));
render(html`<${Palette} json=${firstLayer}/>`, document.getElementById("mainPaletteDisplayArea"));
