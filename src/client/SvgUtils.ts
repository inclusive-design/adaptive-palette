/*
 * Copyright The Adaptive Palette copyright holders
 * See the AUTHORS.md file at the top-level directory of this distribution and at
 * https://github.com/inclusive-design/adaptive-palette/raw/main/AUTHORS.md.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { BlissSVGBuilder, BlissOptions } from "bliss-svg-builder";
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

/**
 * Parses a Blissary SVG builder string into a composition array.
 * 
 * Handled Tokens:
 * - Symbol IDs: "B" followed by digits (e.g., "B123"). These are parsed into numbers.
 * - Kerning Codes: "AK:" or "RK:" followed by digits/negatives (e.g., "AK:-10"). Kept as strings.
 * - Letter Codes: "X" followed by any Unicode letter (e.g., "XA", "Xα"). Kept as strings.
 * - Separators: "/", "//", ";", and ";;". Kept as strings.
 * 
 * Validation:
 * The string must be entirely composed of valid tokens. If the string is empty, 
 * or if it contains any unrecognized garbage characters (e.g., "asdffr;B12"), 
 * the function returns an empty array.
 * 
 * @param {string} bstr - The raw SVG builder sequence (e.g., "B12//B34;;AK:-10/Xα").
 * @returns {SymbolCompositionType} An array of parsed tokens (numbers for IDs, strings for the rest).
 *                                  Returns [] if the input is empty or invalid.
 */
export function bstrToComposition(bstr: string): SymbolCompositionType {
  // Return empty array for empty strings or falsy inputs
  if (!bstr) {
    return [];
  }

  // VALIDATOR: Asserts the ENTIRE string (^ to $) is composed of 1 or more valid tokens.
  const VALIDATOR = /^(?:\/\/|\/|;;|;|[AR]K:-?\d+|X\p{L}|B\d+)+$/u;
  
  // If there are any unrecognized characters (like "asdffr"), it fails validation.
  if (!VALIDATOR.test(bstr)) {
    return [];
  }

  // TOKENIZER: Extracts the valid tokens sequentially.
  const TOKENIZER = /\/\/|\/|;;|;|[AR]K:-?\d+|X\p{L}|B\d+/gu;
  const tokens = bstr.match(TOKENIZER) || [];

  return tokens.map((token) => {
    // If the token matches the strict "B<digits>" pattern, strip "B" and parse as integer
    if (/^B\d+$/.test(token)) {
      return parseInt(token.slice(1), 10);
    }
    
    // Otherwise, keep the token as a string (Kern codes, Letter codes, and Separators)
    return token;
  });
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
  const toToken = (item: number | string): string => {
    if (typeof item !== "number") {
      return item;
    }
    const symbol = adaptivePaletteGlobals.symbols.find(s => s.id === item);
    if (symbol && !symbol.isCharacter) {
      // Composite (word-level) symbols are registered as bare-id aliases via
      // initSvgCompositeDefinitions()/BlissSVGBuilder.define(), so the id itself
      // is a valid code. For composites whose alias registration failed, fall
      // back to inlining this composite's own flattened composition directly --
      // safe since compositions never nest another composite.
      return BlissSVGBuilder.isDefined(String(item))
        ? String(item)
        : compositionToBstr(symbol.composition as SymbolCompositionType);
    }
    // Character symbols always use BlissSVGBuilder's native "B<id>" code, never a
    // bare-id alias. Unknown ids also fall here.
    return "B" + item;
  };

  if (typeof id === "number") {
    return toToken(id);
  }
  return id.map(toToken).join("");
}

/**
 * Register every composite symbol (`isCharacter: false`) in
 * `adaptivePaletteGlobals.symbols` as a `BlissSVGBuilder` alias, keyed by its
 * own numeric ID, aliasing to its flattened base-character bstr. Character
 * symbols are deliberately NOT registered: they must always be referenced by
 * their native `"B<id>"` code (see the comment in `compositionToBstr()`), so
 * a bare-id alias for them would be both unnecessary and misleading.
 * Called once from `initAdaptivePaletteGlobals()`.
 * Note: BlissSVGBuilder.define() can still reject a composite's codeString
 * (e.g. composition with "XOH"). compositionToBstr() falls back to inline
 * expansion for any composite whose alias fails to register.
 */
export function initSvgCompositeDefinitions (): void {
  const definitions: Record<string, { codeString: string }> = {};
  for (const symbol of adaptivePaletteGlobals.symbols) {
    if (!symbol.isCharacter) {
      definitions[String(symbol.id)] = {
        codeString: compositionToBstr(symbol.composition as SymbolCompositionType)
      };
    }
  }
  const result = BlissSVGBuilder.define(definitions);
  if (result.errors.length) {
    console.error(`BlissSVGBuilder.define(): ${result.errors.length} symbol(s) failed to register due to internal coordinates`);
  }
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
 *                    `undefined` if there is no such ID.
 */
export function findSymbolByBciAvId (bciAvId: number) {
  return adaptivePaletteGlobals.symbols.find(
    symbol => symbol.bciAvId === bciAvId
  );
}

/**
 * The builder options for the given composition:
 * 1. A lone indicator has no symbol beneath, crop its bottom.
 * @param {SymbolCompositionType} composition - A ID (a number) or an array of IDs and
 *                           separators.
 * @return {BlissOptions} - The options, or `undefined` for the builder's defaults.
 */
function getSvgBuilderOptions (composition: SymbolCompositionType): BlissOptions | undefined {
  if (typeof composition === "number" && isIndicator(composition)) {
    return { "crop-bottom": 8 };
  }
  return undefined;
}

/**
 * Create and return the builder from a string based on the given
 * SymbolCompositionType. `BlissSVGBuilder` never throws for an unknown or
 * malformed code — it reports the problem via `builder.warnings` instead and
 * still returns a usable (empty-content) builder, so this always returns a
 * builder. Warnings are logged via `console.error` for diagnosis. Falls
 * back to an empty builder if the constructor itself throws (rare — e.g.
 * extremely long input).
 * @param {SymbolCompositionType} id - A ID (a number) or an array of
 *                           IDs and separators, e.g.
 *                           `[ 106, "/", 12 ]`
 * @return {BlissSVGBuilder} - The corresponding builder.
 */
function getSvgBuilder (composition: SymbolCompositionType): BlissSVGBuilder {
  let builder: BlissSVGBuilder;
  try {
    builder = new BlissSVGBuilder(compositionToBstr(composition), getSvgBuilderOptions(composition));
  } catch (err) {
    console.error(err);
    console.error(`Unknown composition = ${String(composition)}`);
    builder = new BlissSVGBuilder();
  }
  if (builder.warnings.length) {
    console.error(`Unknown composition = ${String(composition)}`);
    builder.warnings.forEach(warning => {
      console.error(`  - [${warning.code}] ${warning.message} (source: "${warning.source}")`);
    });
  }
  return builder;
}

/**
 * Get the SVG markup as a string based on the given ID or array.
 *
 * @param {SymbolCompositionType} composition - A ID (a number) or an array of
 *                           IDs and separators, e.g.
 *                           `[ 106, "/", 12 ]`
 * @return {String} - The corresponding SVG markup.
 */
export function getSvgMarkupString (composition: SymbolCompositionType): string {
  return getSvgBuilder(composition).svgCode;
}

/**
 * Get the SVG markup as a DOM element based on the given ID or array.
 *
 * @param {SymbolCompositionType} composition - A ID (a number) or an array of
 *                           IDs and separators, e.g.
 *                           `[ 106, "/", 12 ]`
 * @return {Element} - The corresponding SVG markup.
 */
export function getSvgElement (composition: SymbolCompositionType): SVGElement {
  return getSvgBuilder(composition).svgElement;
}
