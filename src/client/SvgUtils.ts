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
import { SymbolCompositionType } from "./index.d";
import { adaptivePaletteGlobals } from "./GlobalData";

// Ranges and list for all the indicator symbols.  The range values are the
// minimum and maximum ID.
const indicatorIds = {
  range1: [81, 99],       // bciAvId 8993-9011
  range2: [904, 916],     // bciAvId 24667-24679
  range3: [5996, 5998],   // bciAvId 28044-28046
  list: [902, 903, 928, 992]  // bciAvId 24665, 28043, 24807, 25458
};

// Lists of modifier symbols
// Note: These may be relevant to strategies since there is some overlap, e.g.,
// Semantic and Grammatical strategies.
const modifierIds = {
  // much, intensity, without, opposite, generalization, part of, ago, now, future
  semantic: [368, 401, 449, 486, 348, 502, 112, 474, 648],
  // more, most, belongs to
  grammatical: [937, 968, 160],
  // range of the index numerals from 0 through 9. NOTE THIS IS A RANGE.
  numericRange: [19, 28],
  // metaphor, Blissname, slang, coarse slang
  signalling: [444, 753, 970, 971]
};

// Regular expressions for patterns within Blissary SVG builder strings.
export const KERN_PATTERN           = /[AR]K:-?\d+/;
export const BLISS_LETTER_PATTERN   = /X[a-zA-Z]/;  // may not work e.g., Greek
export const SLASH_PATTERN          = new RegExp("/");
export const SLASH_SEPARATOR        = /(\/)/;
export const DOUBLE_SLASH_PATTERN   = new RegExp("//");
export const DOUBLE_SLASH_SEPARATOR = /(\/\/)/;
export const SEMICOLON_SEPARATOR    = /(;)/;
export const SEMICOLON_PATTERN      = /B\d+;/;

/**
 * Given a Blissary SVG builder code string, create a `SymbolCompositionType` array.
 * Each "B<id>" token is parsed to its ID integer. Other tokens
 * (KERN codes, letter codes, separators) are kept as strings.
 * @param {String} blissSvgBuilderCode - SVG builder string to convert.
 * @return {SymbolCompositionType}
 */
export function bstrToComposition (blissSvgBuilderCode: string): SymbolCompositionType {
  const idArray: (string|number)[] = [];
  const words = blissSvgBuilderCode.split(DOUBLE_SLASH_SEPARATOR);
  words.forEach( (word) => {
    // Keep any double-slashes intact
    if (word.match(DOUBLE_SLASH_SEPARATOR)) {
      idArray.push(word);
    }
    else {
      const splits = word.split(SLASH_SEPARATOR);
      splits.forEach((aSplit) => {
        // These patterns remain intact
        if (KERN_PATTERN.test(aSplit) || BLISS_LETTER_PATTERN.test(aSplit) || SLASH_SEPARATOR.test(aSplit)) {
          idArray.push(aSplit);
        }
        else if (SEMICOLON_PATTERN.test(aSplit)) {
          // The structure of a semicolon svg string when split gives a three-member
          // array: [ID, ";", ID]
          const semiColonSplits = aSplit.split(SEMICOLON_SEPARATOR);
          idArray.push(parseInt(semiColonSplits[0].slice(1)));
          idArray.push(";");
          idArray.push(parseInt(semiColonSplits[2].slice(1)));
        }
        // "B<digits>" token — strip "B" to get ID
        else {
          const numericalId = parseInt(aSplit.slice(1));
          if (!isNaN(numericalId)) {
            idArray.push(numericalId);
          }
        }
      });
    }
  });
  return idArray;
}

/**
 * Convert the given `SymbolCompositionType` to a SVG builder code string.  Each
 * ID integer is converted to `"B<id>"`. String separators are
 * kept as-is.
 * @param {SymbolCompositionType} id - The SymbolCompositionType to convert (IDs).
 * @return {String} - The concatenation of the builder codes and separators,
 *                    e.g., "B106/B12".
 */
export function compositionToBstr (id: SymbolCompositionType): string {
  if (typeof id === "number") {
    return "B" + id;
  }
  return id.map(
    item => typeof item === "number" ? "B" + item : item
  ).join("");
}

/*
 * Evaluate if the given integer matches the ID of one of the
 * indicator symbols.
 * @param {number} id - The ID of a symbol
 * @return {boolean}
 */
export function isIndicator (id: number): boolean {
  return (
    (id >= indicatorIds.range1[0] && id <= indicatorIds.range1[1]) ||
    (id >= indicatorIds.range2[0] && id <= indicatorIds.range2[1]) ||
    (id >= indicatorIds.range3[0] && id <= indicatorIds.range3[1]) ||
    indicatorIds.list.includes(id)
  );
}

/*
 * Function to check for one or more indicators in the array form of a
 * SymbolCompositionType.  If a single ID is passed in, the result is an empty
 * array.
 * @param {SymbolCompositionType} id - The array form of a SymbolCompositionType is a mixture
 *                           of integers and strings.
 * @return {Array} - the positions of the indicator(s).  An empty array is
 *                   returned if there are no indicators.
 */
export function findIndicators (id: SymbolCompositionType): number[] {
  const positions: number[] = [];
  if (id.constructor === Array) {
    id.forEach((item, index) => {
      if (typeof item === "number" && isIndicator(item)) {
        positions.push(index);
      }
    });
  }
  return positions;
}

/*
 * Evaluate if the given integer matches the ID of one of the
 * modifier symbols.
 * @param {number} id - The ID of a symbol
 * @return {boolean}
 */
export function isModifier (id: number): boolean {
  return (
    modifierIds.semantic.includes(id) ||
    modifierIds.grammatical.includes(id) ||
    (id >= modifierIds.numericRange[0] && id <= modifierIds.numericRange[1]) ||
    modifierIds.signalling.includes(id)
  );
}

/*
 * Find the position of the first non-modifier symbol starting from left.  This
 * should be a classifier symbol.  If the single number form of a SymbolCompositionType is
 * provided, then 0 (zero) is returned.  If the entire sequence of symbols has
 * been processed, and none are left, then 0 (zero) is returned.
 * @param {SymbolCompositionType} id - The array form of a SymbolCompositionType is a mixture
 *                           of integers and strings.
 * @return {number} - the index of the symbol just after the last modifier.
 */
export function findClassifierFromLeft (id: SymbolCompositionType): number {
  let rightMost = 0;
  if (id.constructor === Array) {
    // Prefix modifiers are a sequence of an ID followed by the "/" separator.
    // Examine symbols until a non-modifer symbol is found, advancing the index
    // by 2.
    for (let index = 0; index < id.length; index += 2) {
      const item = id[index];
      if (typeof item === "number") {
        if (isModifier(item)) {
          rightMost = index + 2;
        }
        else {
          break;
        }
      }
    }
    if (rightMost >= id.length) {
      rightMost = 0;
    }
  }
  return rightMost;
}

/**
 * Utility function to find symbol information by BCI-AV-ID (user-facing lookup).
 *
 * @param {SymbolCompositionType} bciAvId - The BCI-AV-ID to search for
 * @return {Object} - The full information about the given BCI-AV-ID, or
 *                    `undefined` if there is no such ID or the input is not
 *                    a single number.
 */
export function findSymbolByBciAvId (bciAvId: SymbolCompositionType) {
  return adaptivePaletteGlobals.symbols.find(
    symbol => symbol.bciAvId === bciAvId
  );
}

/**
 * Create and return the builder from a string based on the given SymbolCompositionType.
 * If the SymbolCompositionType is invalid, `null` is returned.
 * @param {SymbolCompositionType} id - A ID (a number) or an array of
 *                           IDs and separators, e.g.
 *                           `[ 106, "/", 12 ]`
 * @return {BlissSVGBuilder} - The corresponding SVG markup, or `null`.
 */
function getSvgBuilder (id: SymbolCompositionType): BlissSVGBuilder | null {
  if (typeof id === "number") {
    const symbol = adaptivePaletteGlobals.symbols.find(s => s.id === id);
    if (!symbol) return null;
    // If the symbol has a composition, use it: composite IDs (isCharacter: false)
    // are not in the builder's internal database and produce empty SVGs.
    if (symbol.composition) {
      id = symbol.composition;
    }
  }
  let builder;
  try {
    builder = new BlissSVGBuilder(compositionToBstr(id));
  }
  catch (err) {
    console.error(err);
    console.error(`Unknown id = ${String(id)}`);
    builder = null;
  }
  return builder;
}

/**
 * Get the SVG markup as a string based on the given ID or array.
 *
 * @param {SymbolCompositionType} id - A ID (a number) or an array of
 *                           IDs and separators, e.g.
 *                           `[ 106, "/", 12 ]`
 * @return {String} - The corresponding SVG markup, or `undefined`.
 */
export function getSvgMarkupString (id: SymbolCompositionType): string | undefined {
  const builder = getSvgBuilder(id);
  return ( builder ? builder.svgCode : undefined );
}

/**
 * Get the SVG markup as a DOM element based on the given ID or array.
 *
 * @param {SymbolCompositionType} id - A ID (a number) or an array of
 *                           IDs and separators, e.g.
 *                           `[ 106, "/", 12 ]`
 * @return {Element} - The corresponding SVG markup, or `undefined`.
 */
export function getSvgElement (id: SymbolCompositionType): SVGElement | undefined {
  const builder = getSvgBuilder(id);
  return ( builder ? builder.svgElement : undefined );
}
