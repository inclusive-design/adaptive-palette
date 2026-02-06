/*
 * Copyright 2025 Inclusive Design Research Centre, OCAD University
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

import { BciAvIdType } from "./index.d";
import { changeEncodingContents } from "./GlobalData";
import { makeBciAvIdType, decomposeBciAvId, BLISSARY_PATTERN_KEY, BCIAV_PATTERN_KEY } from "./SvgUtils";
import { speak, insertWordAtCaret } from "./GlobalUtils";
import "./ActionSvgEntryField.scss";

export const SVG_ENTRY_FIELD_ID    = "svgEntryField";
export const SYMBOL_LABEL_FIELD_ID = "symbolLabel";
export const SUBMIT_VALUE          = "Add Symbol";
const MALFORMED                    = "Invalid svg string";

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
function convertSvgBuilderString (theString): BciAvIdType {
  return makeBciAvIdType(theString, ( theString.indexOf("B") === 0 ? BLISSARY_PATTERN_KEY : BCIAV_PATTERN_KEY ));
}

export function ActionSvgEntryField (): VNode {

  const svgToSymbol = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const svgInputString = formData.get(SVG_ENTRY_FIELD_ID);
    const bciAvId = convertSvgBuilderString(svgInputString);
    if (Array.isArray(bciAvId) && bciAvId.length !== 0) {
      const bciAvIdString = bciAvId.join("");
      const composition = decomposeBciAvId(bciAvId);
      if (Array.isArray(composition) && composition.length > 0 && composition[0]) {
        const payload = {
          "id": bciAvIdString,
          "label": formData.get(SYMBOL_LABEL_FIELD_ID) as string,
          "bciAvId": composition,
          "modifierInfo": []
        };
        changeEncodingContents.value = insertWordAtCaret(
          payload, changeEncodingContents.value.payloads, changeEncodingContents.value.caretPosition
        );
        speak(payload.label);
      }
      else {
        speak(MALFORMED);
      }
    }
  };

  return html`
    <form onSubmit=${svgToSymbol} class="actionSvgEntryField">
      <fieldset>
        <legend>Enter symbol using SVG builder string</legend>
        <p>
        <label for=${SVG_ENTRY_FIELD_ID}>Builder string:</label><br />
        <input id=${SVG_ENTRY_FIELD_ID} name=${SVG_ENTRY_FIELD_ID} type="text" size="40" required="true"/><br />
        </p>
        <p>
        <label for=${SYMBOL_LABEL_FIELD_ID}>Label:</label><br />
        <input id=${SYMBOL_LABEL_FIELD_ID} name=${SYMBOL_LABEL_FIELD_ID} type="text" size="40" />
        </p>
        <input type="submit" value=${SUBMIT_VALUE} />
      </fieldset>
   </form>
  `;
}
