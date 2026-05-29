/*
 * Copyright 2025-2026 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
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

import { SymbolCompositionType } from "./index.d";
import { changeEncodingContents } from "./GlobalData";
import { bstrToComposition } from "./SvgUtils";
import { speak, insertWordAtCaret } from "./GlobalUtils";
import "./ActionSvgEntryField.scss";

export const SVG_ENTRY_FIELD_ID    = "svgEntryField";
export const SYMBOL_LABEL_FIELD_ID = "symbolLabel";
export const SUBMIT_VALUE          = "Add Symbol";
const MALFORMED                    = "Invalid builder string";

/**
 * Converts a blissary SVG builder string to the proper SymbolCompositionType format.
 * Accepts blissary codes and separators, e.g., "B220;B99". Outputs an array of ids
 * and separators, e.g., [220, ";", 99]. If the input is malformed, returns an empty array.
 * @param {string} svgBuilderString - The string to convert.
 * @return {SymbolCompositionType} - An array of ids and separators, or an
 *                         empty array if the input is malformed.
 */
function convertSvgBuilderString(svgBuilderString: string): SymbolCompositionType {
  return bstrToComposition(svgBuilderString.trim());
}

export function ActionSvgEntryField(): VNode {
  const [malformed, setMalformed] = useState(false);

  const svgToSymbol = (event: Event) => {
    event.preventDefault();
    
    // Cast target to HTMLFormElement so we can reset it later
    const form = event.currentTarget as HTMLFormElement; 
    const formData = new FormData(form);
    
    // Extract form string values (File entries are excluded)
    const rawSvgInput = formData.get(SVG_ENTRY_FIELD_ID);
    const svgInputString = typeof rawSvgInput === "string" ? rawSvgInput : "";
    const rawLabelInput = formData.get(SYMBOL_LABEL_FIELD_ID);
    const labelString = typeof rawLabelInput === "string" ? rawLabelInput : "";

    const composition = convertSvgBuilderString(svgInputString);

    // Check invalid Builder String
    if (!Array.isArray(composition) || composition.length === 0) {
      return setMalformed(true);
    }

    const payload = {
      id: composition.join(""),
      label: labelString,
      composition: composition,
      modifierInfo: []
    };

    changeEncodingContents.value = insertWordAtCaret(
      payload, 
      changeEncodingContents.value.payloads, 
      changeEncodingContents.value.caretPosition
    );
    
    speak(payload.label);
    setMalformed(false);
    form.reset(); // Clear the form for the next entry
  };

  return html`
    <form onSubmit=${svgToSymbol} class="actionSvgEntryField">
      <fieldset>
        <legend>Enter symbol using SVG builder string</legend>
        <p>
          <label for=${SVG_ENTRY_FIELD_ID}>Builder string:</label><br />
          <input 
            id=${SVG_ENTRY_FIELD_ID} 
            name=${SVG_ENTRY_FIELD_ID} 
            type="text" 
            size="40" 
            required
            aria-invalid=${malformed}
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
        <input type="submit" value=${SUBMIT_VALUE} />
      </fieldset>
   </form>
  `;
}
