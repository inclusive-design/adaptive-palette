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
import { adaptivePaletteGlobals } from "./GlobalData";

export const DEFAULT_SVG_MARKUP_STRING = "B3";   // Question mark

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
      } else {
        finalCode = `${finalCode}${item}`;
      }
    });
  }
  return finalCode;
}

/**
 * Get the SVG markup as a string based on the given single BCI-AV-ID.
 * or an array of BCI-AV-IDs and other characters
 *
 * @param {BciAvId} bciAvId - A single BCI-AV-ID (a number) or an array of such
 *                            ids and characters, e.g. `[ 12335, "/", 8499 ]`
 * @return {String} - The corresponding SVG markup, or the empty string.
 */
export function getSvgMarkupString (bciAvId: BciAvId) {
  let builder;
  try {
    const svgBuilderArgument = bciAvIdToString(bciAvId);
    builder = new BlissSVGBuilder(svgBuilderArgument);
  }
  catch (err) {
    console.error(err);
    console.error(`GETSVGMARKUPSTRING(): using question mark for SVG builder argument from bci-av-id = ${bciAvId}`);
    builder = new BlissSVGBuilder(DEFAULT_SVG_MARKUP_STRING); // question mark
  }
  return builder.svgCode;
}

/**
 * Get the SVG markup as a DOM element based on the given single BCI-AV-ID.
 * or an array of BCI-AV-IDs and other characters
 *
 * @param {BciAvId} bciAvId - A single BCI-AV-ID (a number) or an array of such
 *                            ids and characters, e.g. `[ 12335, "/", 8499 ]`
 * @return {Object} - The corresponding SVG element, or en elment for the
 *                    question mark symbol.
 */
export function getSvgElement (bciAvId: BciAvId) {
  let builder;
  try {
    const svgBuilderArgument = bciAvIdToString(bciAvId);
    builder = new BlissSVGBuilder(svgBuilderArgument);
  }
  catch (err) {
    console.error(err);
    console.error(`GETSVGMARKUPSTRING(): using question mark for SVG builder argument from bci-av-id = ${bciAvId}`);
    builder = new BlissSVGBuilder(DEFAULT_SVG_MARKUP_STRING); // question mark
  }
  return builder.svgElement;
}

export function bciToBlissaryId (bciAvId: number) {
  const { blissaryIdMap } = adaptivePaletteGlobals;
  return blissaryIdMap.find((entry) => entry.bciAvId === bciAvId);
}
