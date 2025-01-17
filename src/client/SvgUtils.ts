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

// Ranges and list for all the indicator symbols.  The range values are the
// minimum and maximum BCI AV ID.
const indicatorIds = {
  range1: [8993, 9011],
  range2: [24667, 24679],
  range3: [28043, 28046],
  list: [24665, 24807, 25458]
};

// Lists of modifier symbols
// Note: These may be relevant to strategies since there is some overlap, e.g.,
// Semantic and Grammatical strategies.
const modifierIds = {
  // much, intensity, without, opposite, generalization, part of, ago, now, future
  semantic: [14647, 14947, 15474, 15927, 14430, 15972, 12352, 15736, 17705],
  // more, most, belongs to
  grammatical: [15654, 15661, 12663],
  // range of the index numerals from 0 through 9. NOTE THIS IS A RANGE.
  numericRange: [8510, 8519],
  // metaphor, Blissname, slang, coarse slang
  signalling: [15460, 21624, 24961, 24962]
};

// Regular expressions for patterns within a Blissary SVG builder string.
export const KERN_PATTERN          = /K:-?\d+/;
export const BLISS_LETTER_PATTERN  = /X[a-zA-Z]/;  // may not work e.g., Greek
export const SEMICOLON_PATTERN     = /B\d+;/;
export const BLISSARY_ID_PATTERN   = /B\d+/;
export const SLASH_SEPARATOR       = /(\/)/;
export const SEMICOLON_SEPARATOR   = /(;)/;

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
 * Given a Blissary map entry, create a `BciAvIdType` from its Blissary SVG
 * builder string.
 * @param {String} blissSvgBuilderCode - Blissary SVG builder string as defined
 * @return {BciAvIdType}
 */
export function makeBciAvIdType (blissSvgBuilderCode: string): BciAvIdType {
  const bciAvIdType = [];
  const splits = blissSvgBuilderCode.split(SLASH_SEPARATOR);
  splits.forEach((aSplit) => {
    // These patterns remain intact -- no conversion
    if (KERN_PATTERN.test(aSplit) || BLISS_LETTER_PATTERN.test(aSplit) || SLASH_SEPARATOR.test(aSplit)) {
      bciAvIdType.push(aSplit);
    }
    else if (SEMICOLON_PATTERN.test(aSplit)) {
      // The structure of a semicolon svg string when split gives a three-member
      // array: [Blissary ID, ";", Blissary ID]
      const semiColonSplits = aSplit.split(SEMICOLON_SEPARATOR);
      let entry = blissaryToBciAvId(parseInt(semiColonSplits[0].slice(1)));
      bciAvIdType.push(entry.bciAvId);
      bciAvIdType.push(";");
      entry = blissaryToBciAvId(parseInt(semiColonSplits[2].slice(1)));
      bciAvIdType.push(entry.bciAvId);
    }
    // Everything else is a Blissary ID in the form of a string "B<digits>".
    // Slice of the "B" prefix, convert the rest to an integer and then convert
    // that to a BCI-AV-ID.
    else {
      const numericalId = parseInt(aSplit.slice(1));
      const blissaryMapEntry = blissaryToBciAvId(numericalId);
      bciAvIdType.push(blissaryMapEntry.bciAvId);
    }
  });
  return bciAvIdType;
}

/*
 * Evaluate if the given integer matches the BCI-AV-ID of one of the indicator
 * symbols.
 * @param {number} bciAvId - The number form of a BciAvIdType
 * @return {boolean}
 */
export function isIndicatorId (bciAvId: number): boolean {
  return (
    (bciAvId >= indicatorIds.range1[0] && bciAvId <= indicatorIds.range1[1]) ||
    (bciAvId >= indicatorIds.range2[0] && bciAvId <= indicatorIds.range2[1]) ||
    (bciAvId >= indicatorIds.range3[0] && bciAvId <= indicatorIds.range3[1]) ||
    indicatorIds.list.includes(bciAvId)
  );
}

/*
 * Function to check for one or more indicators in the array form of a
 * BciAvIdType.  If a single BCI-AV-ID is passed in, the result is an empty
 * array.
 * @param {BciAvIdType} bciAvId - The array form of a BciAvIdType is a mixture
 *                                of integers and strings.
 * @return {Array} - the positions of the indicator(s).  An empty array is
 *                   returned if there are no indicators.
 */
export function findIndicators (bciAvId: BciAvIdType): number[] {
  const positions = [];
  if (bciAvId.constructor === Array) {
    bciAvId.forEach((item, index) => {
      if (typeof item === "number") {
        if (isIndicatorId(item)) {
          positions.push(index);
        }
      }
    });
  }
  return positions;
}

/*
 * Evaluate if the given integer matches the BCI AV ID of one of the modifier
 * symbols.
 * @param {number} bciAvId - The number form of a BciAvIdType
 * @return {boolean}
 */
export function isModifierId (bciAvId: number): boolean {
  return (
    modifierIds.semantic.includes(bciAvId) ||
    modifierIds.grammatical.includes(bciAvId) ||
    (bciAvId >= modifierIds.numericRange[0] && bciAvId <= modifierIds.numericRange[1]) ||
    modifierIds.signalling.includes(bciAvId)
  );
}

/*
 * Find the position of the first non-modifier symbol starting from left.  This
 * should be a classifier symbol.  If the single number form of a BciAvIdType is
 * provided, then 0 (zero) is returned.
 * @param {BciAvIdType} bciAvId - The array form of a BciAvIdType is a mixture
 *                                of integers and strings.
 * @return {number} - the index of the symbol just after the last modifier.
 */
export function findClassifierFromLeft (bciAvId: BciAvIdType): number {
  let rightMost = 0;
  if (bciAvId.constructor === Array) {
    // Prefix modifiers are a sequence of an ID followed by the "/" separator.
    // Examine symbols until a non-modifer symbol is found, advancing the index
    // by 2.
    for (let index = 0; index < bciAvId.length; index += 2) {
      const item = bciAvId[index];
      if (typeof item === "number") {
        if (isModifierId(item)) {
          rightMost = index + 2;
        }
        else {
          break;
        }
      }
    }
  }
  return rightMost;
}

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
