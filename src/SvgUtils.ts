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
 * Convert the given `BciAvId` to a blissary ID as a string.  If the `BciAvId`
 * argument is an array of BCI-AV-IDs and punctuation, concatenate the array
 * into a string of blissary ids and punctuation marks.  Note that a "B" is
 * prepended to each blissary id.
 * @param {BciAvId} - The BciAvId to convert.
 * @return {String} - The concatenation of the blissary ids with the punction,
 *                    e.g., "B106/B12".
 */
export function bciAvIdToString (bciAvId: BciAvId) {
  let finalString = "";
  if (typeof bciAvId === "number") {
    const blissIds = bciToBlissaryId(bciAvId);
    finalString = `B${blissIds.blissaryId}`;
  }
  // `bicAvId` is an array
  else {
    bciAvId.forEach((item) => {
      if (typeof item === "number") {
        const blissIds = bciToBlissaryId(item);
        finalString = `${finalString}B${blissIds.blissaryId}`;
      } else
        finalString = `${finalString}${item}`;
    });
  }
  return finalString;
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
  return blissIdMap.find((pair) => pair.bciAvId === bciAvId);
}

