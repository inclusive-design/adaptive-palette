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
import { changeEncodingContents } from "./GlobalData";
import { makeBciAvIdType, decomposeBciAvId, BLISSARY_PATTERN_KEY, BCIAV_PATTERN_KEY } from "./SvgUtils";
import { speak } from "./GlobalUtils";
import "./ActionSvgEntryField.scss";

/**
 * Converts a string that encodes the information required by the SvgUtils
 * (svg builder) to the proper format -- an array of bliss-svg specifications.
 * Note: adapted from the `paletteGeneratorJSON.ts`
 * Two forms are accepted:
 * - BCI-AV-ID codes and separators, e.g. "13166;9011"
 * - Blissary codes and separators, e.g., "B220;B99"
 * If there is a space after the SVG builder string followed by text, that text
 * is used as a label for the generater symbol
 * @param {string} svgBuilderString - The string to convert.
 * @return {BciAvIdType} - An array of the specifiers required by the SvgUtils
 *                         or `null` if input is not in the proper form.
 */
function convertSvgBuilderString (theString): BciAvIdType {
  let result = null;
  // Two forms, one with commas and one without:
  // - BCI AV IDs with separators:
  //   Treat as an SVG composition string and use makeBciAvIdType() to convert
  //   it to the array form.
  //   e.g., "13166;9011" -> [13166,";",9011]
  // - Blissary IDs with separators:
  //   Treat as an SVG composition string and use makeBciAvIdType() to convert
  //   it to the array form.
  //   e.g., "B220;B99" -> [13166,";",9011]
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
    const svgInputString = formData.get("SvgEntryField");
    const bciAvId = convertSvgBuilderString(svgInputString);
    if (bciAvId.length !== 0) {
      const composition = decomposeBciAvId(bciAvId);
      if (composition) {
        const payload = {
          "id": bciAvId,
          "label": formData.get("symbolLabel"),
          "bciAvId": composition
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
        <legend >Enter symbol using SVG builder string</legend>
        <p>
        <label for="SvgEntryField">SVG:</label>
        <input id="SvgEntryField" name="SvgEntryField" type="text" size="40"/>
        </p>
        <p>
        <label for="symbolLabel">Label:</label>
        <input id="symbolLabel" name="symbolLabel" type="text" size="40" />
        </p>
        <input type="submit" value="Add Symbol" />
      </fieldset>
   </form>
  `;
}
