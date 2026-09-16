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
import { paletteSetPath } from "./core/PaletteStore";
import { HOSTED_MESSAGE, NO_MODELS_MESSAGE, isLocalHost } from "./core/OllamaApi";
import { announceIfEnabled, speakUnavailable } from "./utils/SpeechUtils";
import { goBackImpl } from "./cells/CommandGoBackCell";
import { INPUT_AREA_ID } from "./cells/ContentEncoding";
import { NOT_CONFIGURED_MESSAGE } from "./features/telegraphic-translation/TelegraphicTranslationUtils";
import "./index.scss";

// Initialize any globals used elsewhere in the code.
await initAdaptivePaletteGlobals("mainPaletteDisplayArea");

import { CurrentPalette } from "./components/CurrentPalette";
import { DiscardEditDialog } from "./features/telegraphic-translation/DiscardEditDialog";
import { SymbolEntryToolbar } from "./components/SymbolEntryToolbar";
import { MessageAttributesBar } from "./features/message-attributes/MessageAttributesBar";
import { FirstRunSetup } from "./features/setup/FirstRunSetup";

// Each palette draws the whole screen below the top bar, so the start palette and the palettes
// it includes are all that must load before the first render. `?set=<folder>` in the page URL
// picks the palette set. `paletteSetPath` throws for an invalid set name; `loadPaletteSet` throws
// when the file is missing or has a format this code does not read.
const { paletteStore, navigationStack } = adaptivePaletteGlobals;
const startPaletteName = await paletteStore.loadPaletteSet(paletteSetPath(window.location.search));
const startPalette = await paletteStore.getNamedPalette(startPaletteName, true);
if (!startPalette) { throw new Error(`Failed to load the start palette "${startPaletteName}"`); }

navigationStack.currentPalette = startPalette;
render(html`<${CurrentPalette} />`, getRequiredElement("mainPaletteDisplayArea"));

// Asks before an edit throws sentence work away. Mounted outside the palettes, so it is there on
// every screen.
render(html`<${DiscardEditDialog} />`, getRequiredElement("pageDialogs"));

// First-run setup. It draws nothing when Ollama is running with the configured models. It is
// not mounted away from this computer, where Ollama cannot be installed.
if (isLocalHost()) {
  render(html`<${FirstRunSetup} />`, getRequiredElement("firstRunSetup"));
}

const aiStatus = getRequiredElement("aiStatus");
if (!isLocalHost()) {
  aiStatus.textContent = HOSTED_MESSAGE;
} else if (adaptivePaletteGlobals.models.length === 0) {
  aiStatus.textContent = NO_MODELS_MESSAGE;
} else if (!adaptivePaletteGlobals.config.telegraphicTranslation) {
  aiStatus.textContent = NOT_CONFIGURED_MESSAGE;
} else {
  // Nothing to report. The element is removed rather than hidden with CSS: an empty grid
  // item still consumes a row-gap, and a live region that is `display: none` when its
  // text arrives may not announce it.
  aiStatus.remove();
}

// The top bar. The chips for the attributes set on the message sit at its left, the triggers
// for adding symbols at its right; each dialog lives inside the toolbar component.
render(html`<${MessageAttributesBar} />`, getRequiredElement("messageAttributes"));
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
