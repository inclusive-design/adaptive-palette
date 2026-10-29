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
import { useEffect, useState } from "preact/hooks";
import { ModalDialog } from "../../components/ModalDialog";
import { BlissSymbol } from "../../components/BlissSymbol";
import { AiBadge, aiSuggestionLabel } from "../../components/AiBadge";
import { adaptivePaletteGlobals } from "../../state/GlobalData";
import { INPUT_AREA_ID } from "../../cells/ContentEncoding";
import { t } from "../../i18n/I18n";
import {
  type WordDialogType, chooseMatch, chooseName, closeWordDialog, wordDialogSignal
} from "./ComposeWordState";
import { canSuggestNames, requestNameSuggestions } from "./WordNamingUtils";
import "./NameWordDialog.scss";

export const NAME_WORD_DIALOG_ID = "nameWordDialog";
export const NAME_FIELD_ID = "nameWordField";

type SuggestStateType = { status: "idle" } | { status: "working" } | { status: "done", names: string[] };

/**
 * The dialog's body. Mounted only while the dialog is open, so the typed name starts empty each time.
 * @param {{ dialog: WordDialogType }} props - What the dialog shows.
 * @returns {VNode}
 */
function NameWordBody (props: { dialog: WordDialogType }): VNode {
  const { dialog } = props;
  const [typedName, setTypedName] = useState("");
  const [suggest, setSuggest] = useState<SuggestStateType>({ status: "idle" });

  // Ask the model for names once, as the dialog opens. Not for a word already in the vocabulary.
  useEffect((): void => {
    if (dialog.match || !canSuggestNames()) {
      return;
    }
    setSuggest({ status: "working" });
    requestNameSuggestions(dialog.partLabels, dialog.offeredName)
      .then((names) => setSuggest({ status: "done", names }))
      .catch((error) => {
        console.error(`Could not suggest names: ${String(error)}`);
        setSuggest({ status: "done", names: [] });
      });
  }, []);

  if (dialog.match) {
    const { label, composition } = dialog.match;
    return html`
      <div class="wordPreview"><${BlissSymbol} composition=${composition} label="" isPresentation="true" /></div>
      <div class="dialogFooter">
        <button type="button" autofocus onClick=${chooseMatch}>${t("wordMatchUse", { label })}</button>
        <button type="button" onClick=${closeWordDialog}>${t("wordBack")}</button>
      </div>
    `;
  }

  const useTypedName = (event: Event): void => {
    event.preventDefault();
    const name = typedName.trim();
    if (name) {
      chooseName(name);
    }
  };

  const markAi = adaptivePaletteGlobals.config.markAiSuggestions;
  const suggested = suggest.status === "done" ? suggest.names : [];
  const status = suggest.status === "working" ? t("wordSuggesting")
    : suggest.status === "done" && suggested.length === 0 ? t("wordSuggestFailed") : "";

  // The name offered comes first and takes the focus: one selection names the word without a keyboard.
  return html`
    <div class="wordPreview"><${BlissSymbol} composition=${dialog.composition} label="" isPresentation="true" /></div>
    <div class="wordNames">
      <button type="button" autofocus onClick=${() => chooseName(dialog.offeredName)}>${dialog.offeredName}</button>
      ${suggested.map((name) => html`
        <button type="button" aria-label=${markAi ? aiSuggestionLabel(name) : undefined}
          onClick=${() => chooseName(name, true)}>${markAi && html`<${AiBadge} />`}${name}</button>
      `)}
    </div>
    <p role="status" class="wordSuggestStatus">${status}</p>
    <form class="wordNameForm" onSubmit=${useTypedName}>
      <label for=${NAME_FIELD_ID}>${t("wordNameField")}</label>
      <input
        id=${NAME_FIELD_ID}
        type="text"
        value=${typedName}
        onInput=${(event: Event) => setTypedName((event.target as HTMLInputElement).value)}
      />
      <button type="submit" aria-disabled=${typedName.trim() === ""}>${t("wordNameUse")}</button>
    </form>
    <div class="dialogFooter">
      <button type="button" onClick=${closeWordDialog}>${t("wordBack")}</button>
    </div>
  `;
}

/**
 * The dialog after Done: name the new word, or use the vocabulary word it turned out to be.
 * Closing it goes back to the word. Mounted once for the page, outside the palettes.
 * @returns {VNode}
 */
export function NameWordDialog (): VNode {
  const dialog = wordDialogSignal.value;
  const title = dialog?.match ? t("wordMatchTitle", { label: dialog.match.label }) : t("wordNameTitle");
  return html`
    <${ModalDialog}
      id=${NAME_WORD_DIALOG_ID}
      title=${title}
      isOpen=${dialog !== null}
      onClose=${closeWordDialog}
      restoreFocusTo=${() => document.getElementById(INPUT_AREA_ID)}>
      ${dialog && html`<${NameWordBody} dialog=${dialog} />`}
    <//>
  `;
}
