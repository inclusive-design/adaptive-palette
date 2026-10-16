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
import { CurrentPalette } from "../components/CurrentPalette";
import { SymbolEntryToolbar } from "../components/SymbolEntryToolbar";
import { DiscardEditDialog } from "../features/telegraphic-translation/DiscardEditDialog";
import { MessageAttributesBar } from "../features/message-attributes/MessageAttributesBar";
import "../index.scss";

// The page as `index.html` lays it out.
const PAGE_HTML = `
  <div id="topBar">
    <div id="messageAttributes"></div>
    <div id="aiStatus" role="status"></div>
    <div id="symbolEntryToolbar"></div>
  </div>
  <div id="firstRunSetup"></div>
  <div id="mainPaletteDisplayArea"></div>
  <div id="pageDialogs"></div>
`;

const PAGE_IDS = ["topBar", "firstRunSetup", "mainPaletteDisplayArea", "pageDialogs"];

/**
 * Build the page with the ids `index.html` has, and render into it what `index.js` renders, for
 * a test that measures the whole screen. `index.js` cannot be imported: it renders as it loads.
 * First-run setup is left out; it draws nothing once Ollama is set up.
 * @param {string} notice - The top bar's notice, or none when empty.
 * @returns {() => void} - Removes the page. Safe to call twice.
 */
export function mountPage (notice = ""): () => void {
  document.body.insertAdjacentHTML("beforeend", PAGE_HTML);
  const byId = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
  if (notice) {
    byId("aiStatus").textContent = notice;
  } else {
    byId("aiStatus").remove();
  }
  const roots = [
    [html`<${CurrentPalette} />`, byId("mainPaletteDisplayArea")],
    [html`<${DiscardEditDialog} />`, byId("pageDialogs")],
    [html`<${MessageAttributesBar} />`, byId("messageAttributes")],
    [html`<${SymbolEntryToolbar} />`, byId("symbolEntryToolbar")]
  ] as const;
  roots.forEach(([vnode, root]) => render(vnode, root));
  return (): void => {
    roots.forEach(([, root]) => render(null, root));
    PAGE_IDS.forEach((id) => document.getElementById(id)?.remove());
  };
}
