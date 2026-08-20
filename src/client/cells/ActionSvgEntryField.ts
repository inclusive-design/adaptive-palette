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
import { useRef, useState } from "preact/hooks";

import { changeEncodingContents } from "../state/GlobalData";
import { editMessage } from "../core/MessageEdit";
import { bstrToComposition } from "../utils/SvgUtils";
import { insertWordAtCaret } from "../utils/SymbolEncodingUtils";
import { MessagePreview } from "../components/MessagePreview";
import "./ActionSvgEntryField.scss";

export const SVG_ENTRY_FIELD_ID    = "svgEntryField";
export const SYMBOL_LABEL_FIELD_ID = "symbolLabel";
export const SUBMIT_VALUE          = "Add to message";
export const CLOSE_LABEL           = "Close";
const MALFORMED                    = "Invalid builder string";

type ActionSvgEntryFieldProps = {
  onRequestClose: () => void
};

/**
 * The body of the "Add Symbol by SVG-Builder String" dialog. This is a developer tool,
 * hidden unless `svgBuilderString.show` is set in config.json.
 *
 * Like the search dialog, it stays open after an add so several builder strings can be
 * entered in a row, and it shows the message preview because the real input area is
 * inert behind the modal.
 * @param {ActionSvgEntryFieldProps} props - Callback asking the dialog to dismiss.
 * @returns {VNode}
 */
export function ActionSvgEntryField (props: ActionSvgEntryFieldProps): VNode {
  const { onRequestClose } = props;
  const [malformed, setMalformed] = useState(false);
  const [status, setStatus] = useState("");
  const builderInputRef = useRef<HTMLInputElement>(null);

  const svgToSymbol = (event: Event) => {
    event.preventDefault();

    // Cast target to HTMLFormElement so we can reset it later
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    // Extract form string values (File entries are excluded)
    const rawSvgInput = formData.get(SVG_ENTRY_FIELD_ID);
    const svgInputString = typeof rawSvgInput === "string" ? rawSvgInput : "";
    const rawLabelInput = formData.get(SYMBOL_LABEL_FIELD_ID);
    const labelString = typeof rawLabelInput === "string" ? rawLabelInput.trim() : "";

    const composition = bstrToComposition(svgInputString.trim());

    // Check invalid Builder String
    if (!Array.isArray(composition) || composition.length === 0) {
      // Clear any previous success message, or the error is shown beside a stale
      // "... added to message" from the last add.
      setStatus("");
      return setMalformed(true);
    }

    const payload = {
      label: labelString,
      composition: composition,
      modifierInfo: []
    };

    setMalformed(false);
    const added = editMessage(insertWordAtCaret(
      payload,
      changeEncodingContents.value.payloads,
      changeEncodingContents.value.caretPosition
    ));

    // If edit is rejected, the status is cleared.
    if (!added) {
      setStatus("");
      return;
    }

    // The status region is the only confirmation channel here, for the same reason as in
    // the search dialog: device speech and the screen reader would talk over each other.
    // The label is optional, so fall back to a generic noun for the announcement.
    setStatus(`${labelString || "Symbol"} added to message`);
    form.reset(); // Clear the form for the next entry
    // Several builder strings are typically entered in a row; without this, focus is
    // left on the Add button and every later entry needs manual navigation back.
    builderInputRef.current?.focus();
  };

  return html`
    <div class="actionSvgEntryField">
      <form onSubmit=${svgToSymbol}>
        <p>
          <label for=${SVG_ENTRY_FIELD_ID}>Builder string:</label><br />
          <input
            ref=${builderInputRef}
            id=${SVG_ENTRY_FIELD_ID}
            name=${SVG_ENTRY_FIELD_ID}
            type="text"
            size="40"
            required
            aria-invalid=${malformed}
            autofocus
          /><br />
          <!-- conditional rendering -->
          ${malformed && html`<span role="alert" class="error-text">${MALFORMED}</span>`}
        </p>
        <p>
          <label for=${SYMBOL_LABEL_FIELD_ID}>Label:</label><br />
          <input
            id=${SYMBOL_LABEL_FIELD_ID}
            name=${SYMBOL_LABEL_FIELD_ID}
            type="text"
            size="40"
          />
        </p>

        <p role="status" class="svgEntryStatus">${status}</p>

        <${MessagePreview} />

        <div class="dialogFooter">
          <input type="submit" class="btn-addToMessage" value=${SUBMIT_VALUE} />
          <button type="button" onClick=${onRequestClose}>${CLOSE_LABEL}</button>
        </div>
      </form>
    </div>
  `;
}
