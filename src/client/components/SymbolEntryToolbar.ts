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

import { adaptivePaletteGlobals } from "../state/GlobalData";
import { ModalDialog } from "./ModalDialog";
import { ActionSearchGloss } from "../cells/ActionSearchGloss";
import { ActionSvgEntryField } from "../cells/ActionSvgEntryField";
import { SettingsDialog } from "../features/settings/SettingsDialog";
import "./SymbolEntryToolbar.scss";

export const SEARCH_TRIGGER_LABEL = "Add Symbol to Message";
export const SVG_TRIGGER_LABEL = "Add Symbol by SVG-Builder String";
export const SEARCH_DIALOG_ID = "searchSymbolDialog";
export const SVG_DIALOG_ID = "svgBuilderStringDialog";
export const SETTINGS_TRIGGER_LABEL = "Adjust Settings";
export const SETTINGS_DIALOG_ID = "adjustSettingsDialog";

type OpenDialogType = "search" | "svg" | "settings" | null;

/**
 * The row of triggers above the input area, and the dialogs they open: adding a symbol to
 * the message, and adjusting the settings.
 *
 * The triggers live outside the palette grid because no palette row has a spare column:
 * a trigger cell would have to shrink a neighbour.
 *
 * Each dialog body is mounted only while its dialog is open, so reopening starts from a
 * clean form without any explicit reset code.
 * @returns {VNode}
 */
export function SymbolEntryToolbar (): VNode {
  const [openDialog, setOpenDialog] = useState<OpenDialogType>(null);
  const { symbolSearch, svgBuilderString } = adaptivePaletteGlobals.config;

  const close = () => setOpenDialog(null);

  // WebKit, unlike Chromium and Firefox, does not focus a <button> on mouse click, so
  // ModalDialog would capture the wrong opener to restore focus to on close. Focusing
  // explicitly here makes the trigger the opener on every engine.
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
      <button
        type="button"
        class="btn-command settingsTrigger"
        aria-haspopup="dialog"
        onClick=${open("settings")}>${SETTINGS_TRIGGER_LABEL}</button>

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
      <${ModalDialog}
        id=${SETTINGS_DIALOG_ID}
        title=${SETTINGS_TRIGGER_LABEL}
        isOpen=${openDialog === "settings"}
        onClose=${close}>
        ${openDialog === "settings" && html`<${SettingsDialog} onRequestClose=${close} />`}
      <//>
    </div>
  `;
}
