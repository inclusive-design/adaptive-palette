/*
 * Copyright 2023-2024 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { BlissSVGBuilder } from "bliss-svg-builder";
import { BciAvIdType, BlissSymbolComposition } from "./index.d";
import { adaptivePaletteGlobals } from "./GlobalData";

// The struture of an entry in the Blissary Id map.
type BlissaryMapEntryType = {
  blissaryId: number,
  bciAvId: number,
  blissSvgBuilderCode: string
};

// Regular expressions for patterns within Blissary SVG builder strings and
// their BCI-AV-ID equivalents.  Note that only the semicolon and identifier
// patterns are different. Blissary identifiers always begin with a "B" followed
// by numerals, whereas BCI-AV-ID are numerals only.
export const KERN_PATTERN           = /K:-?\d+/;
export const BLISS_LETTER_PATTERN   = /X[a-zA-Z]/;  // may not work e.g., Greek
export const SLASH_SEPARATOR        = /(\/)/;
export const SEMICOLON_SEPARATOR    = /(;)/;
//export const BLISSARY_SEMICOLON_PATTERN     = /B\d+;/;
//export const BLISSARY_ID_PATTERN            = /B\d+/;
export const SEMICOLON_PATTERNS     = {
  blissary: /B\d+;/,
  bciAv: /\d+;/
};
export const BLISSARY_PATTERN_KEY   = "blissary";
export const BCIAV_PATTERN_KEY      = "bciAv";

/**
 * Retrieve an SVG builder string information associated with a single numerical
 * BCI-AV-ID.  Specifically find its Blissary ID, its Blissary SVG builder
 * string, and create an equivalent BlissSymbolComposition where the Blissary
 * IDs are replaced with the BCI-AV-IDs.  Return a `BlissSymbolComposition`
 * or `undefined`.
 * @param {BciAvIdType} bciAvId - The BciAvIdType to convert, must be a
 *                                single number ID, not an array.
 * @return {BlissComposition}
 */
export function makeBlissComposition (bciAvId: number): BlissSymbolComposition {
  let result = undefined;
  const blissaryMapEntry = bciToBlissaryId(bciAvId);
  if (blissaryMapEntry) {
    result = {
      bciAvId: blissaryMapEntry.bciAvId,
      bciComposition: makeBciAvIdType(blissaryMapEntry.blissSvgBuilderCode)
    };
  }
  return result;
}

/**
 * Given a Blissary map entry, create a `BciAvIdType` from its SVG builder
 * string, usually the Blissary builder string.  The optional second parameter
 * allows the caller to specify that the identifiers in the builder string
 * are BCI-AV-IDs.
 * @param {String} blissSvgBuilderCode - SVG builder string as defined
 * @param {String} patternKey - Optional, either BLISSARY_PATTERN_KEY or
 *                              BCIAV_PATTERN_KEY.  The default is
 *                              BLISSARY_PATTERN_KEY
 * @return {BciAvIdType}
 */
export function makeBciAvIdType (blissSvgBuilderCode: string, patternKey: string = BLISSARY_PATTERN_KEY): BciAvIdType {
  const bciAvIdType = [];
  const splits = blissSvgBuilderCode.split(SLASH_SEPARATOR);
  splits.forEach((aSplit) => {
    // These patterns remain intact -- no conversion
    if (KERN_PATTERN.test(aSplit) || BLISS_LETTER_PATTERN.test(aSplit) || SLASH_SEPARATOR.test(aSplit)) {
      bciAvIdType.push(aSplit);
    }
    else if (SEMICOLON_PATTERNS[patternKey].test(aSplit)) {
      // The structure of a semicolon svg string when split gives a three-member
      // array: [Blissary ID, ";", Blissary ID]
      const semiColonSplits = aSplit.split(SEMICOLON_SEPARATOR);
      if (patternKey === BLISSARY_PATTERN_KEY) {
        let entry = blissaryToBciAvId(parseInt(semiColonSplits[0].slice(1)));
        bciAvIdType.push(entry.bciAvId);
        bciAvIdType.push(";");
        entry = blissaryToBciAvId(parseInt(semiColonSplits[2].slice(1)));
        bciAvIdType.push(entry.bciAvId);
      }
      else {
        bciAvIdType.push(parseInt(semiColonSplits[0]));
        bciAvIdType.push(";");
        bciAvIdType.push(parseInt(semiColonSplits[2]));
      }
    }
    // Everything else is either a Blissary ID in the form of a string
    // "B<digits>" or a BCI-AV-ID in the form of "<digits". Slice off the "B"
    // prefix, convert the rest to an integer and then convert that to a
    // BCI-AV-ID as needed
    else {
      if (patternKey === "blissary") {
        const numericalId = parseInt(aSplit.slice(1));
        const blissaryMapEntry = blissaryToBciAvId(numericalId);
        bciAvIdType.push(blissaryMapEntry.bciAvId);
      }
      else {
        bciAvIdType.push(parseInt(aSplit));
      }
    }
  });
  return bciAvIdType;
}

// export function handleSemicolonPatterns (semiColonString: string, patternKey?: string): number {
//   // The structure of a semicolon svg string when split gives a three-member
//   // array: [Blissary ID, ";", Blissary ID]
//   const semiColonSplits = aSplit.split(SEMICOLON_SEPARATOR);
//   let entry;
//   let bciAvId;
//   // Get the ID before the semi-colon ...
//   if (patternKey === "blissary") {
//     entry = blissaryToBciAvId(parseInt(semiColonSplits[0].slice(1)));
//     bciAvId = entry.bciAvId;
//   }
//   else {
//     bciAvId = parseInt(semiColonSplits[0]));
//   }
//   bciAvIdType.push(bciAvId);
//   bciAvIdType.push(";");
//   // ... and the ID after the semi-colon
//   if (patternKey === "blissary") {
//
//   entry = blissaryToBciAvId(parseInt(semiColonSplits[2].slice(1)));
//   bciAvIdType.push(entry.bciAvId);
//
// }

/**
 * Convert the given `BciAvIdType` to a SVG builder code string.  If the
 * `BciAvIdType`argument is an array of BCI-AV-IDs and punctuation, concatenate
 * the array into a string of builder code strings and punctuation marks.
 * @param {BciAvIdType} bciAvId - The BciAvIdType to convert.
 * @return {String} - The concatenation of the builder codes and punctuation,
 *                    e.g., "B106/B12".
 */
export function bciAvIdToString (bciAvId: BciAvIdType): string {
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

function getSvgBuilder (bciAvId: BciAvIdType): BlissSVGBuilder {
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
export function getSvgMarkupString (bciAvId: BciAvIdType): string {
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
export function getSvgElement (bciAvId: BciAvIdType): SVGElement {
  const builder = getSvgBuilder(bciAvId);
  return ( builder ? builder.svgElement : undefined );
}

/**
 * Retrieve the entry in the `blissaryIdMap` that matches the given BCI-AV-ID
 * An entry has this structure: { blissaryId, bciavId, blissSvgBuilderCode }
 *
 * @param {Number} bciAvId - A single BCI-AV-ID (a single number)
 * @return {BlissaryMapEntryType} - The matching map entry or `undefined`.
 */
export function bciToBlissaryId (bciAvId: number): BlissaryMapEntryType {
  const { blissaryIdMap } = adaptivePaletteGlobals;
  return blissaryIdMap.find((entry) => entry.bciAvId === bciAvId);
}

/**
 * Retrieve the entry in the `blissaryIdMap` that matches the given Blissary ID
 * An entry has this structure: { blissaryId, bciavId, blissSvgBuilderCode }
 *
 * @param {Number} blissaryId - The Blissary ID to search for.
 * @return {BlissaryMapEntryType} - The matching map entry or `undefined`.
 */
export function blissaryToBciAvId (blissaryId: number): BlissaryMapEntryType {
  const { blissaryIdMap } = adaptivePaletteGlobals;
  return blissaryIdMap.find((entry) => entry.blissaryId === blissaryId);
}
