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

import { BciAvIdType } from "./index.d";
import { changeEncodingContents } from "./GlobalData";
import { makeBciAvIdType, decomposeBciAvId, BLISSARY_PATTERN_KEY, BCIAV_PATTERN_KEY } from "./SvgUtils";
import { speak, insertWordAtCaret } from "./GlobalUtils";
import "./ActionSvgEntryField.scss";

export const SVG_ENTRY_FIELD_ID    = "svgEntryField";
export const SYMBOL_LABEL_FIELD_ID = "symbolLabel";
export const SUBMIT_VALUE          = "Add Symbol";
const MALFORMED                    = "Invalid builder string";

/**
 * Converts a string that encodes the information required by the SvgUtils
 * (svg builder) to the proper format -- an array of bliss-svg specifications.
 * Note: adapted from the `paletteGeneratorJSON.ts`
 * Two forms are accepted:
 * - BCI-AV-ID codes and separators, e.g. "13166;9011"
 * - Blissary codes and separators, e.g., "B220;B99"
 * @param {string} svgBuilderString - The string to convert.
 * @return {BciAvIdType} - An array of the specifiers required by the SvgUtils.
 *                         If the input is malformed, the result will be an
 *                         empty `BciAvIdType` -- an empty array.
 */
function convertSvgBuilderString(svgBuilderString: string): BciAvIdType {
  const sanitizedString = svgBuilderString.trim();
  const patternKey = sanitizedString.startsWith("B") ? BLISSARY_PATTERN_KEY : BCIAV_PATTERN_KEY;
  return makeBciAvIdType(sanitizedString, patternKey);
}

export function ActionSvgEntryField(): VNode {
  const [malformed, setMalformed] = useState(false);

  const svgToSymbol = (event: Event) => {
    event.preventDefault();
    
    // Cast target to HTMLFormElement so we can reset it later
    const form = event.currentTarget as HTMLFormElement; 
    const formData = new FormData(form);
    
    // Extract and typecast form data
    const svgInputString = formData.get(SVG_ENTRY_FIELD_ID)?.toString() || "";
    const labelString = formData.get(SYMBOL_LABEL_FIELD_ID)?.toString() || "";

    const bciAvId = convertSvgBuilderString(svgInputString);

    // Check invalid Builder String
    if (!Array.isArray(bciAvId) || bciAvId.length === 0) {
      return setMalformed(true);
    }

    const composition = decomposeBciAvId(bciAvId);

    // Check invalid Composition
    if (!Array.isArray(composition) || composition.length === 0 || !composition[0]) {
      return setMalformed(true);
    }

    const payload = {
      id: bciAvId.join(""),
      label: labelString,
      bciAvId: composition,
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
