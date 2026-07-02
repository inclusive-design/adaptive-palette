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
import { render } from "preact";
import { html } from "htm/preact";
import { loadPaletteFromJsonFile, speak } from "./GlobalUtils";
import { goBackImpl } from "./CommandGoBackCell";
import {
  initAdaptivePaletteGlobals, adaptivePaletteGlobals,
  INPUT_AREA_ID
} from "./GlobalData";

import "./index.scss";

// Initialize any globals used elsewhere in the code.
await initAdaptivePaletteGlobals("mainPaletteDisplayArea");

import { PaletteStore } from "./PaletteStore";
import { Palette } from "./Palette";
import { CommandTelegraphicCompletions } from "./CommandTelegraphicCompletions";
import { SentenceCompletionsPalette } from "./SentenceCompletionsPalette";
import { DialogPromptEntries } from "./DialogPromptEntries";
import { ActionSearchGloss } from "./ActionSearchGloss";
import { ActionSvgEntryField } from "./ActionSvgEntryField";

const paletteFileMap = await loadPaletteFromJsonFile("/palettes/palette_file_map.json");
const firstLayer = await loadPaletteFromJsonFile("/palettes/palettes.json");
const goBackCell = await loadPaletteFromJsonFile("/palettes/backup_palette.json");
const composeWordsArea = await loadPaletteFromJsonFile("/palettes/compose_words.json");
const inputArea = await loadPaletteFromJsonFile("/palettes/input_area.json");
const topPalette = await loadPaletteFromJsonFile("/palettes/top_palette.json");
const modifiersPalette = await loadPaletteFromJsonFile("/palettes/modifiers.json");

if (!paletteFileMap) { throw new Error("Failed to load /palettes/palette_file_map.json"); }
if (!firstLayer) { throw new Error("Failed to load /palettes/palettes.json"); }
if (!goBackCell) { throw new Error("Failed to load /palettes/backup_palette.json"); }
if (!inputArea) { throw new Error("Failed to load /palettes/input_area.json"); }
if (!topPalette) { throw new Error("Failed to load /palettes/top_palette.json"); }
if (!modifiersPalette) { throw new Error("Failed to load /palettes/modifiers.json"); }

PaletteStore.paletteFileMap = /** @type {import("./index").PaletteFileMapType} */ (/** @type {unknown} */ (paletteFileMap));
adaptivePaletteGlobals.paletteStore.addPalette(firstLayer);
adaptivePaletteGlobals.paletteStore.addPalette(goBackCell);
adaptivePaletteGlobals.paletteStore.addPalette(composeWordsArea);
adaptivePaletteGlobals.paletteStore.addPalette(inputArea);
adaptivePaletteGlobals.paletteStore.addPalette(topPalette);
adaptivePaletteGlobals.paletteStore.addPalette(modifiersPalette);

adaptivePaletteGlobals.navigationStack.currentPalette = { palette: firstLayer, htmlElement: getRequiredElement("mainPaletteDisplayArea") };
const composeWordsContainer = document.getElementById("compose_words_palette");
if(composeWordsContainer) {
  render(html`<${Palette} json=${composeWordsArea} />`, composeWordsContainer);
}
render(html`<${Palette} json=${inputArea} />`, getRequiredElement("input_palette"));
render(html`<${Palette} json=${goBackCell} />`, getRequiredElement("backup_palette"));
render(html`<${Palette} json=${topPalette} />`, getRequiredElement("indicators"));
render(html`<${Palette} json=${firstLayer} />`, getRequiredElement("mainPaletteDisplayArea"));
render(html`<${Palette} json=${modifiersPalette} />`, getRequiredElement("modifiers"));

// Forms for interacting with LLMs
render(html`<${DialogPromptEntries} />`, getRequiredElement("llmPrompt"));
render(
  html`<${CommandTelegraphicCompletions} model="llama3.1:latest" stream=${false} />`,
  getRequiredElement("askForLlmSuggestions")
);
render(html`<${SentenceCompletionsPalette} />`, getRequiredElement("llmSuggestions"));

// Forms for entering SVG strings and searching the AV
render(html`<${ActionSvgEntryField} />`, getRequiredElement("svgBuilderStringEntry"));
render(html`<${ActionSearchGloss} />`, getRequiredElement("searchGloss"));

// Window keydown listener for a global "go back" keystroke
window.addEventListener("keydown", (event) => {
  if (event.code === "Backquote") {
    // If focus was not on a textual input element, go back up one layer in the
    // palette navigation
    if (!elementAllowsTextEntry(event.target)) {
      speak("Back");
      void goBackImpl();
    }
  }
});

const textInputTypes = [
  "date", "datetime-local", "email", "month", "number", "password", "search",
  "tel", "text", "time", "url", "week"
];

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function getRequiredElement(id) {
  const el = document.getElementById(id);
  if (!el) { throw new Error(`Required DOM element #${id} not found`); }
  return el;
}

/**
 * @param {unknown} element
 * @returns {boolean}
 */
function elementAllowsTextEntry(element) {
  if (!(element instanceof HTMLElement)) { return false; }
  return element.id !== INPUT_AREA_ID && (
    (element instanceof HTMLInputElement && textInputTypes.includes(element.type)) ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element.getAttribute("role") === "textbox"
  );
}
