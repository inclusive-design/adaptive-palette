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
import { adaptivePaletteGlobals } from "./state/GlobalData";
import { initAdaptivePaletteGlobals } from "./core/InitGlobals";
import { NO_MODELS_MESSAGE } from "./core/OllamaApi";
import { loadPaletteFromJsonFile } from "./core/PaletteStore";
import { announceIfEnabled, speakUnavailable } from "./utils/SpeechUtils";
import { goBackImpl } from "./cells/CommandGoBackCell";
import { INPUT_AREA_ID } from "./cells/ContentEncoding";
import { NOT_CONFIGURED_MESSAGE } from "./features/telegraphic-translation/TelegraphicTranslationUtils";
import "./index.scss";

// Initialize any globals used elsewhere in the code.
await initAdaptivePaletteGlobals("mainPaletteDisplayArea");

import { PaletteStore } from "./core/PaletteStore";
import { Palette } from "./components/Palette";
import { CurrentPalette } from "./components/CurrentPalette";
import { SentenceChoices } from "./features/telegraphic-translation/SentenceChoices";
import { PredictedWords } from "./features/word-prediction/PredictedWords";
import { SymbolEntryToolbar } from "./components/SymbolEntryToolbar";

const paletteFileMap = await loadPaletteFromJsonFile("/palettes/palette_file_map.json");
const firstLayer = await loadPaletteFromJsonFile("/palettes/bliss_standard_chart.json");
const inputArea = await loadPaletteFromJsonFile("/palettes/input_area.json");
const commandBar = await loadPaletteFromJsonFile("/palettes/command_bar.json");

if (!paletteFileMap) { throw new Error("Failed to load /palettes/palette_file_map.json"); }
if (!firstLayer) { throw new Error("Failed to load /palettes/bliss_standard_chart.json"); }
if (!inputArea) { throw new Error("Failed to load /palettes/input_area.json"); }
if (!commandBar) { throw new Error("Failed to load /palettes/command_bar.json"); }

PaletteStore.paletteFileMap = /** @type {import("./index").PaletteFileMapType} */ (/** @type {unknown} */ (paletteFileMap));
adaptivePaletteGlobals.paletteStore.addPalette(firstLayer);
adaptivePaletteGlobals.paletteStore.addPalette(inputArea);
adaptivePaletteGlobals.paletteStore.addPalette(commandBar);

// The input area and command bar are fixed mounts.  The main display area is mounted
// once with the component that draws whatever palette navigation has made current.
adaptivePaletteGlobals.navigationStack.currentPalette = firstLayer;
render(html`<${Palette} json=${inputArea} />`, getRequiredElement("input_palette"));
render(html`<${Palette} json=${commandBar} />`, getRequiredElement("commandBar"));
render(html`<${CurrentPalette} />`, getRequiredElement("mainPaletteDisplayArea"));

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
    if (adaptivePaletteGlobals.navigationStack.depth === 0) {
      speakUnavailable("Back");
      return;
    }
    // If focus was not on a textual input element, go back up one layer in the
    // palette navigation
    if (!elementAllowsTextEntry(event.target)) {
      announceIfEnabled("Back");
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
