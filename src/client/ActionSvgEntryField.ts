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
import { speak } from "./GlobalUtils";
import "./ActionSvgEntryField.scss";

export const SVG_ENTRY_FIELD_ID    = "svgEntryField";
export const SYMBOL_LABEL_FIELD_ID = "symbolLabel";
export const SUBMIT_VALUE          = "Add Symbol";

/**
 * Converts a string that encodes the information required by the SvgUtils
 * (svg builder) to the proper format -- an array of bliss-svg specifications.
 * Note: adapted from the `paletteGeneratorJSON.ts`
 * Two forms are accepted:
 * - BCI-AV-ID codes and separators, e.g. "13166;9011"
 * - Blissary codes and separators, e.g., "B220;B99"
 * @param {string} svgBuilderString - The string to convert.
 * @return {BciAvIdType} - An array of the specifiers required by the SvgUtils
 *                         or `null` if input is not in the proper form.
 */
function convertSvgBuilderString (theString): BciAvIdType {
  let result = null;
  if (theString.indexOf("B") !== -1) {
    result = makeBciAvIdType(theString, BLISSARY_PATTERN_KEY);
  }
  else {
    result = makeBciAvIdType(theString, BCIAV_PATTERN_KEY);
  }
  return result;
}

export function ActionSvgEntryField (): VNode {

  const svgToSymbol = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const svgInputString = formData.get(SVG_ENTRY_FIELD_ID);
    const bciAvId = convertSvgBuilderString(svgInputString);
    if (bciAvId.constructor === Array && bciAvId.length !== 0) {
      const composition = decomposeBciAvId(bciAvId);
      if (composition) {
        const payload = {
          "id": bciAvId,
          "label": formData.get("symbolLabel"),
          "bciAvId": composition,
          "modifierInfo": []    // TODO: create an accurate modiferInfo from the `bciAvId`
        };
        changeEncodingContents.value = [...changeEncodingContents.value, payload];
        speak(payload.label);
      }
    }
    else {
      speak("malformed svg string");
    }
  };

  return html`
    <form onSubmit=${svgToSymbol} class="actionSvgEntryField">
      <fieldset>
        <legend>Enter symbol using SVG builder string</legend>
        <p>
        <label for=${SVG_ENTRY_FIELD_ID}>Builder string:</label><br />
        <input id=${SVG_ENTRY_FIELD_ID} name=${SVG_ENTRY_FIELD_ID} type="text" size="40"/>
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
