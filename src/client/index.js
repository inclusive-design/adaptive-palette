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
import { effect } from "@preact/signals";
import { html } from "htm/preact";
import { adaptivePaletteGlobals } from "./state/GlobalData";
import { initAdaptivePaletteGlobals } from "./core/InitGlobals";
import { paletteSetPath } from "./core/PaletteStore";
import { isLocalHost } from "./core/OllamaApi";
import { announceIfEnabled, speakUnavailable } from "./utils/SpeechUtils";
import { goBackImpl } from "./cells/CommandGoBackCell";
import { elementAllowsTextEntry } from "./utils/TextEntryUtils";
import "./index.scss";

// Initialize any globals used elsewhere in the code.
await initAdaptivePaletteGlobals("mainPaletteDisplayArea");

import { CurrentPalette } from "./components/CurrentPalette";
import { DiscardEditDialog } from "./features/telegraphic-translation/DiscardEditDialog";
import { SymbolEntryToolbar } from "./components/SymbolEntryToolbar";
import { MessageAttributesBar } from "./features/message-attributes/MessageAttributesBar";
import { FirstRunSetup } from "./features/setup/FirstRunSetup";
import { followSwitchScanningSetting } from "./features/switch-scanning/SwitchScanning";
import { languageSignal, t } from "./i18n/I18n";

// Each palette draws the whole screen below the top bar, so the start palette and the palettes
// it includes are all that must load before the first render. `?set=<folder>` in the page URL
// picks the palette set. `paletteSetPath` throws for an invalid set name; `loadPaletteSet` throws
// when the file is missing or has a format this code does not read.
const { paletteStore, navigationStack } = adaptivePaletteGlobals;
const startPaletteName = await paletteStore.loadPaletteSet(paletteSetPath(window.location.search));
const startPalette = await paletteStore.getNamedPalette(startPaletteName, true);
if (!startPalette) { throw new Error(`Failed to load the start palette "${startPaletteName}"`); }

// Screen readers pick their pronunciation from `lang`. The page is in the UI language; the
// palettes mark their own text with `CONTENT_LANGUAGE`.
effect(() => {
  document.documentElement.lang = languageSignal.value;
});

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

// Which status line applies is settled at start-up. Its text follows the language.
const aiStatus = getRequiredElement("aiStatus");
const aiStatusText = !isLocalHost()
  // Two sentences in the element that is already there: what the AI features do here, and
  // what happens to what the user writes.
  ? () => `${t("hosted")} ${t("notSaved")}`
  : adaptivePaletteGlobals.models.length === 0 ? () => t("noModels")
    : !adaptivePaletteGlobals.config.telegraphicTranslation ? () => t("sentenceNotConfigured")
      : undefined;
if (aiStatusText) {
  effect(() => {
    aiStatus.textContent = aiStatusText();
  });
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
  if (event.code === "Backquote" && adaptivePaletteGlobals.config.backquoteGoesBack) {
    // A modal dialog is on top. Backquote must not navigate the palette behind it.
    if (document.querySelector("dialog[open]")) {
      return;
    }
    // Depth zero means there is nowhere to go back to.
    if (adaptivePaletteGlobals.navigationStack.depth === 0) {
      speakUnavailable(t("back"));
      return;
    }
    // If focus was not on a textual input element, go back up one layer in the
    // palette navigation
    if (!elementAllowsTextEntry(event.target)) {
      announceIfEnabled(t("back"));
      void goBackImpl();
    }
  }
});

// Two-switch scanning, while the user has it turned on. Off, nothing listens, so keyboard
// access is unchanged.
followSwitchScanningSetting();

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function getRequiredElement(id) {
  const el = document.getElementById(id);
  if (!el) { throw new Error(`Required DOM element #${id} not found`); }
  return el;
}
