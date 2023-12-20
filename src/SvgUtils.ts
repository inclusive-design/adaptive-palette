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
import { BciAvIdType } from "./index.d";
import { adaptivePaletteGlobals } from "./GlobalData";

/**
 * Convert the given `BciAvIdType` to a SVG builder code string.  If the
 * `BciAvIdType`argument is an array of BCI-AV-IDs and punctuation, concatenate
 * the array into a string of builder code strings and punctuation marks.
 * @param {BciAvIdType} bciAvId - The BciAvIdType to convert.
 * @return {String} - The concatenation of the builder codes and punctuation,
 *                    e.g., "B106/B12".
 */
export function bciAvIdToString (bciAvId: BciAvIdType) {
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
      } else {
        finalCode = `${finalCode}${item}`;
      }
    });
  }
  return finalCode;
}

/**
 * Create and return the builder from a string based on the given BciAvIdType.
 * If the BciAvIdType is invalid, `null` is returned.
 * @param {BciAvIdType} bciAvId - A single BCI-AV-ID (a number) or an array of
 *                                such ids and characters, e.g.
 *                                `[ 12335, "/", 8499 ]`
 * @return {BlissSVGBuilder} - The corresponding SVG markup, or `null`.
 */

function getSvgBuilder (bciAvId: BciAvIdType) {
  let builder;
  try {
    const svgBuilderArgument = bciAvIdToString(bciAvId);
    builder = new BlissSVGBuilder(svgBuilderArgument);
  }
  catch (err) {
    console.error(err);
    console.error(`Unknown bci-av-id = ${bciAvId}`);
    builder = null;
  }
  return builder;
}

/**
 * Get the SVG markup as a string based on the given single BCI-AV-ID.
 * or an array of BCI-AV-IDs and other characters
 *
 * @param {BciAvIdType} bciAvId - A single BCI-AV-ID (a number) or an array of
 *                                such ids and characters, e.g.
 *                                `[ 12335, "/", 8499 ]`
 * @return {String} - The corresponding SVG markup, or `undefined`.
 */
export function getSvgMarkupString (bciAvId: BciAvIdType) {
  const builder = getSvgBuilder(bciAvId);
  return ( builder ? builder.svgCode : undefined );
}

/**
 * Get the SVG markup as a DOM element based on the given single BCI-AV-ID.
 * or an array of BCI-AV-IDs and other characters
 *
 * @param {BciAvIdType} bciAvId - A single BCI-AV-ID (a number) or an array of
 *                                such ids and characters, e.g.
 *                                `[ 12335, "/", 8499 ]`
 * @return {Element} - The corresponding SVG markup, or `undefined`.
 */
export function getSvgElement (bciAvId: BciAvIdType) {
  const builder = getSvgBuilder(bciAvId);
  return ( builder ? builder.svgElement : undefined );
}

export function bciToBlissaryId (bciAvId: number) {
  const { blissaryIdMap } = adaptivePaletteGlobals;
  return blissaryIdMap.find((entry) => entry.bciAvId === bciAvId);
}
