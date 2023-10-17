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
import { BciAvId } from "./PaletteCell";

import blissIdMap from "../Bliss-Blissary-BCI-ID-Map/blissary_to_bci_mapping.json";

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
    finalCode = bciToBlissaryId(bciAvId).blissSvgBuilderCode;
  }
  // `bicAvId` is an array
  else {
    bciAvId.forEach((item) => {
      if (typeof item === "number") {
        const svgBuilderCode = bciToBlissaryId(item).blissSvgBuilderCode;
        finalCode = `${finalCode}${svgBuilderCode}`;
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
  console.debug(`GETSVGMARKUPSTRING(): ${svgBuilderArgument}`);
  try {
    builder = new BlissSVGBuilder(svgBuilderArgument);
  }
  catch (err) {
    console.error(err);
    console.debug("GETSVGMARKUPSTRING(): USING HEART");
    builder = new BlissSVGBuilder("H:0,8"); // heart shape
  }
  return builder.svgCode;
}

export function bciToBlissaryId (bciAvId: number) {
  return blissIdMap.find((entry) => entry.bciAvId === bciAvId);
}

