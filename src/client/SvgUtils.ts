/*
 * Copyright 2023-2025 Inclusive Design Research Centre, OCAD University
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

// Regular expressions for patterns within Blissary SVG builder strings and
// their BCI-AV-ID equivalents.  Note that only the semicolon and identifier
// patterns are different. Blissary identifiers always begin with a "B" followed
// by numerals, whereas BCI-AV-ID are numerals only.
export const KERN_PATTERN           = /K:-?\d+/;
export const BLISS_LETTER_PATTERN   = /X[a-zA-Z]/;  // may not work e.g., Greek
export const SLASH_SEPARATOR        = /(\/)/;
export const DOUBLE_SLASH_SEPARATOR = /(\/\/)/;
export const SEMICOLON_SEPARATOR    = /(;)/;
export const SEMICOLON_PATTERNS     = {
  blissary: /B\d+;/,
  bciAv: /\d+;/
};
export const BLISSARY_PATTERN_KEY   = "blissary";
export const BCIAV_PATTERN_KEY      = "bciAv";

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
  const words = blissSvgBuilderCode.split(DOUBLE_SLASH_SEPARATOR);
  words.forEach( (word) => {
    // Keep any double-slashes intact
    if (word.match(DOUBLE_SLASH_SEPARATOR)) {
      bciAvIdType.push(word);
    }
    else {
      const splits = word.split(SLASH_SEPARATOR);
      splits.forEach((aSplit) => {
        // These patterns remain intact -- no conversion
        if (KERN_PATTERN.test(aSplit) || BLISS_LETTER_PATTERN.test(aSplit) || SLASH_SEPARATOR.test(aSplit)) {
          bciAvIdType.push(aSplit);
        }
        else if (SEMICOLON_PATTERNS[patternKey].test(aSplit)) {
          // The structure of a semicolon svg string when split gives a three-member
          // array: [ID, ";", ID]
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
        // "B<digits>" or a BCI-AV-ID in the form of "<digits>". Slice off the
        // "B" prefix, convert the rest to an integer and then convert that to a
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
 * the array into a string of builder code strings and punctuation marks.  If
 * the argument is a single numeric BCI-AV-ID, retrieve its composition if any
 * and use that.  If not composition, use the single id value.
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
 * Utility function to find the given single BCI-AV-ID within the
 * `adaptivePaletteGlobals.bciAvSymbols` data structure (part of global data).
 *
 * @param {BciAvIdType} bciAvId - The number form of a BciAvIdType
 * @return {Object} - The full information about the given BCI-AV-ID, or
 *                    `undefined` if there is no such ID or the input is not
 *                    a single ID.
 */
export function findBciAvSymbol (bciAvId: BciAvIdType) {
  return adaptivePaletteGlobals.bciAvSymbols.find( (symbol) => {
    return parseInt(symbol.id) === bciAvId;
  });
}

/**
 * Given a `BciAvIdType`, find the composition of each single ID in the passed
 * in parameter.  Note that this is recursive.  The decomposition stops when a
 * single ID is either a Bliss-character or has no composition.
 *
 * @param (BciAvIdType) bciAvId - The `BciAvIdType` to process.
 * @return {BciAvIdType} - The fully dcomposed `BciAvIdType` or  `undefined` if
 *                         there is no match to any BCI-AV-ID
 */
export function decomposeBciAvId (bciAvId: BciAvIdType): BciAvIdType {
  if (typeof bciAvId === "number") {
    // `bciAvId` is a single number.
    const bciAvSymbol = findBciAvSymbol(bciAvId);
    if (bciAvSymbol) {
      if (bciAvSymbol.isCharacter) {
        return [bciAvId];
      }
      else if (!bciAvSymbol.composition) {
        return [bciAvId];
      }
      else {
        return loopDecompose(bciAvSymbol.composition);
      }
    }
    else {
      // No corressponding symbol found in `adaptivePaletteGlobals.bciAvSymbols`
      return undefined;
    }
  }
  else {
    // `bciAvId` is an array
    return loopDecompose(bciAvId);
  }
}

/**
 * Local helper for `decomposeBciAvId()` to loop through a BciAvIdType array
 * and calls `decomposeBciAvId()` for each single number BciAvIdType.  Note that
 * this is recursive in the sense that it calls `decomposeBciAvId()` which, in
 * turn, can call this function.
 *
 * @param {BciAvIdType} bciAvIdArray - The array form of an BCI-AV-ID
 * @return {BciAvIdType} - The full decomposition for the given `bciAvIdArray`
 */
function loopDecompose (bciAvIdArray: BciAvIdType): BciAvIdType {
  let resultArray = [];
  if (bciAvIdArray.constructor === Array) {
    bciAvIdArray.forEach( (part) => {
      // This tests that `part` is not a separator, not e.g., "/", or ";"
      if (typeof part === "number") {
        resultArray = resultArray.concat(decomposeBciAvId(part));
      }
      // Keep `part` separators as they are.
      else {
        resultArray.push(part);
      }
    });
  }
  return resultArray;
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
