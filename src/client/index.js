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
import { initAdaptivePaletteGlobals, adaptivePaletteGlobals, navigationDepth, NO_MODELS_MESSAGE } from "./GlobalData";
import { loadPaletteFromJsonFile, speak, speakUnavailable } from "./GlobalUtils";
import { goBackImpl } from "./CommandGoBackCell";
import { INPUT_AREA_ID } from "./ContentEncoding";
import { NOT_CONFIGURED_MESSAGE } from "./TelegraphicTranslationUtils";
import "./index.scss";

// Initialize any globals used elsewhere in the code.
await initAdaptivePaletteGlobals("mainPaletteDisplayArea");

import { PaletteStore } from "./PaletteStore";
import { Palette } from "./Palette";
import { SentenceChoices } from "./SentenceChoices";
import { PredictedWords } from "./PredictedWords";
import { SymbolEntryToolbar } from "./SymbolEntryToolbar";

const paletteFileMap = await loadPaletteFromJsonFile("/palettes/palette_file_map.json");
const firstLayer = await loadPaletteFromJsonFile("/palettes/palettes.json");
const inputArea = await loadPaletteFromJsonFile("/palettes/input_area.json");
const commandBar = await loadPaletteFromJsonFile("/palettes/command_bar.json");

if (!paletteFileMap) { throw new Error("Failed to load /palettes/palette_file_map.json"); }
if (!firstLayer) { throw new Error("Failed to load /palettes/palettes.json"); }
if (!inputArea) { throw new Error("Failed to load /palettes/input_area.json"); }
if (!commandBar) { throw new Error("Failed to load /palettes/command_bar.json"); }

PaletteStore.paletteFileMap = /** @type {import("./index").PaletteFileMapType} */ (/** @type {unknown} */ (paletteFileMap));
adaptivePaletteGlobals.paletteStore.addPalette(firstLayer);
adaptivePaletteGlobals.paletteStore.addPalette(inputArea);
adaptivePaletteGlobals.paletteStore.addPalette(commandBar);

adaptivePaletteGlobals.navigationStack.currentPalette = { palette: firstLayer, htmlElement: getRequiredElement("mainPaletteDisplayArea") };
render(html`<${Palette} json=${inputArea} />`, getRequiredElement("input_palette"));
render(html`<${Palette} json=${commandBar} />`, getRequiredElement("commandBar"));
render(html`<${Palette} json=${firstLayer} />`, getRequiredElement("mainPaletteDisplayArea"));

// Sentence translation: the trigger button lives in the input area palette and hides
// itself when unavailable, so only the status line needs wiring here.
render(html`<${SentenceChoices} />`, getRequiredElement("sentenceChoices"));

// Suggested next words, drawn from the messages the user has said before.
render(html`<${PredictedWords} />`, getRequiredElement("predictedWords"));

const aiStatus = getRequiredElement("aiStatus");
if (adaptivePaletteGlobals.models.length === 0) {
  aiStatus.textContent = NO_MODELS_MESSAGE;
} else if (!adaptivePaletteGlobals.config.telegraphicTranslation) {
  aiStatus.textContent = NOT_CONFIGURED_MESSAGE;
} else {
  // Nothing to report. The element is removed rather than hidden with CSS: an empty grid
  // item still consumes a row-gap, and a live region that is `display: none` when its
  // text arrives may not announce it.
  aiStatus.remove();
}

// Triggers for adding symbols to the message; each dialog lives inside this component.
render(html`<${SymbolEntryToolbar} />`, getRequiredElement("symbolEntryToolbar"));

// Window keydown listener for a global "go back" keystroke
window.addEventListener("keydown", (event) => {
  if (event.code === "Backquote") {
    // A modal dialog is on top. Backquote must not navigate the palette behind it,
    // which it otherwise would whenever focus sits on a non-text control such as a
    // search result button.
    if (document.querySelector("dialog[open]")) {
      return;
    }
    // Depth zero means there is nowhere to go back to.
    if (navigationDepth.value === 0) {
      speakUnavailable("Back");
      return;
    }
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
