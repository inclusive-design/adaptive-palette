/*
 * Copyright 2023 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { BlissSVGBuilder } from "bliss-svg-builder";
import { BciAvId } from "./BlissSymbol";
import { blissaryIdMap } from "./GlobalData";

/**
 * Convert the given `BciAvId` to a SVG builder code string.  If the `BciAvId`
 * argument is an array of BCI-AV-IDs and punctuation, concatenate the array
 * into a string of builder code strings and punctuation marks.
 * @param {BciAvId} - The BciAvId to convert.
 * @return {String} - The concatenation of the builder codes and punctuation,
 *                    e.g., "B106/B12".
 */
export function bciAvIdToString (bciAvId: BciAvId) {
  let finalCode = "";
  if (typeof bciAvId === "number") {
    const { blissSvgBuilderCode } = bciToBlissaryId(bciAvId);
    finalCode = blissSvgBuilderCode;
  }
  // `bicAvId` is an array
  else {
    bciAvId.forEach((item) => {
      if (typeof item === "number") {
        const { blissSvgBuilderCode } = bciToBlissaryId(item);
        finalCode = `${finalCode}${blissSvgBuilderCode}`;
      } else
        finalCode = `${finalCode}${item}`;
    });
  }
  return finalCode;
}

/**
 * Get the SVG markup as a string based on the given single BCI-AV-ID.
 * or an array of BCI-AV-IDs and other characters
 *
 * @param {BciAvId} bciAvId - A signal BCI-AV-ID (a number) or an array of such
 *                            ids and characters, e.g. `[ 12335, "/", 8499 ]`
 * @return {String} - The corresponding SVG markup, or the empty string.
 */
export function getSvgMarkupString (bciAvId: BciAvId) {
  let builder;
  const svgBuilderArgument = bciAvIdToString(bciAvId);
  try {
    // NOTE:  The replace() is TEMPORARY due to an issue in BlissSVGBuilder.
    // Remove the replace() when the builder is modified.
    // Also the linter does not like the escaped slashes, "\/"; disable that
    // check.
    // eslint-disable-next-line no-useless-escape
    builder = new BlissSVGBuilder(svgBuilderArgument.replace(/(.*?)\/K(:-\d+)(\/[^\/]*)/g, "$1$3$2"));
  }
  catch (err) {
    console.error(err);
    console.error(`GETSVGMARKUPSTRING(): USING HEART for ${svgBuilderArgument} from bci-av-id = ${bciAvId}`);
    builder = new BlissSVGBuilder("H:0,8"); // heart shape
  }
  return builder.svgCode;
}

export function bciToBlissaryId (bciAvId: number) {
  return blissaryIdMap.find((entry) => entry.bciAvId === bciAvId);
}
