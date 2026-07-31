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

import { VNode } from "preact";
import { html } from "htm/preact";
import { useState } from "preact/hooks";

import { adaptivePaletteGlobals } from "./GlobalData";
import { ModalDialog } from "./ModalDialog";
import { ActionSearchGloss } from "./ActionSearchGloss";
import { ActionSvgEntryField } from "./ActionSvgEntryField";
import "./SymbolEntryToolbar.scss";

export const SEARCH_TRIGGER_LABEL = "Add symbol to message";
export const SVG_TRIGGER_LABEL = "Add symbol by svg-builder string";
export const SEARCH_DIALOG_ID = "searchSymbolDialog";
export const SVG_DIALOG_ID = "svgBuilderStringDialog";

type OpenDialogType = "search" | "svg" | null;

/**
 * The row of symbol-entry triggers above the input area, and the dialogs they open.
 *
 * The triggers live outside the palette grid because no palette row has a spare column:
 * a trigger cell would have to shrink a neighbour.
 *
 * Each dialog body is mounted only while its dialog is open, so reopening starts from a
 * clean form without any explicit reset code.
 * @returns {VNode | null}
 */
export function SymbolEntryToolbar (): VNode | null {
  const [openDialog, setOpenDialog] = useState<OpenDialogType>(null);
  const { symbolSearch, svgBuilderString } = adaptivePaletteGlobals.config;

  // Render nothing at all rather than an empty row that would leave a gap.
  if (!symbolSearch.show && !svgBuilderString.show) {
    return null;
  }

  const close = () => setOpenDialog(null);

  // WebKit, unlike Chromium and Firefox, does not focus a <button> on mouse click, so
  // ModalDialog would capture the wrong opener to restore focus to on close. Focusing
  // explicitly here makes the trigger of the opener on every engine.
  const open = (which: Exclude<OpenDialogType, null>) => (event: Event) => {
    (event.currentTarget as HTMLElement).focus();
    setOpenDialog(which);
  };

  return html`
    <div class="symbolEntryToolbar">
      ${symbolSearch.show && html`
        <button
          type="button"
          class="btn-command"
          aria-haspopup="dialog"
          onClick=${open("search")}>${SEARCH_TRIGGER_LABEL}</button>
      `}
      ${svgBuilderString.show && html`
        <button
          type="button"
          class="symbolEntryToolbarDevTrigger"
          aria-haspopup="dialog"
          onClick=${open("svg")}>${SVG_TRIGGER_LABEL}</button>
      `}

      ${symbolSearch.show && html`
        <${ModalDialog}
          id=${SEARCH_DIALOG_ID}
          title=${SEARCH_TRIGGER_LABEL}
          isOpen=${openDialog === "search"}
          onClose=${close}>
          ${openDialog === "search" && html`<${ActionSearchGloss} onRequestClose=${close} />`}
        <//>
      `}
      ${svgBuilderString.show && html`
        <${ModalDialog}
          id=${SVG_DIALOG_ID}
          title=${SVG_TRIGGER_LABEL}
          isOpen=${openDialog === "svg"}
          onClose=${close}>
          ${openDialog === "svg" && html`<${ActionSvgEntryField} onRequestClose=${close} />`}
        <//>
      `}
    </div>
  `;
}
