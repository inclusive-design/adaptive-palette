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
import { initAdaptivePaletteGlobals, adaptivePaletteGlobals } from "./GlobalData";
import {
  idToString, getCompositionFromBuilderCode, isIndicator,
  findIndicators, isModifier, findClassifierFromLeft, findSymbolByBciAvId,
  getSvgElement, getSvgMarkupString,
} from "./SvgUtils";

describe("SvgUtils module", (): void => {
  const singleId = 823;                             // CONJ.
  const expectedString = "B823";

  const idArray = [ 106, "/", 12 ];                 // VERB+EN
  const expectedConcatenation = "B106/B12";

  const invalidId = 0;

  const reviveBlissarySvgBuilderStr = "B206;B81/RK:-2/B473/B457";
  const expectedIdRevive = [
    206, ";", 81, "/", "RK:-2", "/", 473, "/", 457
  ];

  const abcBlissarySvgBuilderStr = "Xa/Xb/Xc";       // "a b c"
  const expectedIdAbc = [ "Xa", "/", "Xb", "/", "Xc" ];

  const multiWordBlissaryBuilderStr = "B2505//B348/B81/B86";
  const expectedMultiWordId = [ 2505, "//", 348, "/", 81, "/", 86 ];

  const indicatorId = 87;                            // "future action" indicator (bciAvId 8999)
  const nonIndicatorId = 105;                        // "action" word (bciAvId 12334)
  const modifierId = 24;                             // "5" (bciAvId 8515)
  const nonModifierId = 903;                         // "continuous" indicator (bciAvId 28043)

  const noHasNoModifiers = [ 449, "/", 401, "/", 401 ]; // IDs for bciAvId 15474, 14947

  // Gloss for symbol is "remove indicator".
  const twoWordIdString = "B634;B81//B348/B81/B86";
  const twoWordId = [ 634, ";", 81, "//", 348, "/", 81, "/", 86 ];

  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  }, 7000);

  test("Create svg builder argument", (): void => {
    let result = idToString(singleId);
    expect(result).toBe(expectedString);

    result = idToString(idArray);
    expect(result).toBe(expectedConcatenation);
  });

  test("Unknown id produces empty-ish SVG", (): void => {
    expect(() => { idToString(invalidId); }).not.toThrow();
    // invalidId=0 produces "B0" which BlissSVGBuilder may reject — test via getSvgMarkupString
    expect(getSvgMarkupString(invalidId)).not.toBeDefined();
  });

  test("Create a SymbolCompositionType from a Blissary SVG builder string", (): void => {
    expect(getCompositionFromBuilderCode(reviveBlissarySvgBuilderStr)).toEqual(expectedIdRevive);
    expect(getCompositionFromBuilderCode(abcBlissarySvgBuilderStr)).toEqual(expectedIdAbc);
    expect(getCompositionFromBuilderCode(multiWordBlissaryBuilderStr)).toEqual(expectedMultiWordId);
  });

  test("Check getCompositionFromBuilderCode() when passing an invalid input", (): void => {
    expect(getCompositionFromBuilderCode("asdffr;B1214343")).toEqual([]);
    expect(getCompositionFromBuilderCode("")).toEqual([]);
  });

  test("Check for indicator or modifier ID", (): void => {
    expect(isIndicator(indicatorId)).toEqual(true);
    expect(isIndicator(nonIndicatorId)).toEqual(false);
    expect(isModifier(modifierId)).toEqual(true);
    expect(isModifier(nonModifierId)).toEqual(false);
  });

  test("Find indicator positions", (): void => {
    // `expectedIdRevive` contains an action indicator (id=81) over the first symbol.
    let indicatorPositions = findIndicators(expectedIdRevive);
    expect(indicatorPositions.length).toEqual(1);
    expect(indicatorPositions).toEqual([2]);

    // `expectedIdAbc` has no indicators.  `singleId` is a single number and has no indicators.
    indicatorPositions = findIndicators(expectedIdAbc);
    expect(indicatorPositions.length).toEqual(0);
    indicatorPositions = findIndicators(singleId);
    expect(indicatorPositions.length).toEqual(0);
  });

  test("Find first symbol after a modifier", (): void => {
    // Prefix the `expectedIdRevive` with the `modifierId` modifier.
    let modifiedRevive = [modifierId, "/", ...expectedIdRevive];
    expect(findClassifierFromLeft(modifiedRevive)).toEqual(2);

    // Prefix again with two modifiers and a modifier suffix.
    modifiedRevive = [modifierId, "/", modifierId, "/", ...expectedIdRevive, "/", modifierId];
    expect(findClassifierFromLeft(modifiedRevive)).toEqual(4);

    // The original `expectedIdRevive` has no modifiers; also a single id has no modifiers.
    expect(findClassifierFromLeft(expectedIdRevive)).toEqual(0);
    expect(findClassifierFromLeft(singleId)).toEqual(0);

    // The symbol for "no" is made of all modifier symbols, but the negative sign
    // is the classifier, so `findClassifierFromLeft()` should return zero.
    expect(findClassifierFromLeft(noHasNoModifiers)).toEqual(0);
  });

  test("Check finding full symbol information", (): void => {
    let actual = findSymbolByBciAvId(23409);   // CONJ. bciAvId
    expect(actual?.bciAvId).toBe(23409);

    // Passing an invalid BCI AV ID or the array form should return `undefined`
    actual = findSymbolByBciAvId(1);
    expect(actual).toEqual(undefined);
    actual = findSymbolByBciAvId(idArray);
    expect(actual).toEqual(undefined);
  });

  test("Get SVG Element and markup for single ID", (): void => {
    expect(getSvgElement(singleId)).toBeDefined();
    expect(getSvgMarkupString(singleId)).toBeDefined();
  });

  test("Get SVG Element and markup for invalid id", (): void => {
    expect(getSvgElement(invalidId)).not.toBeDefined();
    expect(getSvgMarkupString(invalidId)).not.toBeDefined();
  });

  test("Get SVG Element and markup for id array using slash, semi-colon, and kern codes", (): void => {
    expect(getSvgElement(expectedIdRevive)).toBeDefined();
    expect(getSvgMarkupString(expectedIdRevive)).toBeDefined();
  });

  test("Get SVG Element and markup for id array using double-slash code", (): void => {
    expect(getSvgElement(expectedMultiWordId)).toBeDefined();
    expect(getSvgMarkupString(expectedMultiWordId)).toBeDefined();
  });

  test("Get SVG Element and markup for id array using X code", (): void => {
    expect(getSvgElement(expectedMultiWordId)).toBeDefined();
    expect(getSvgMarkupString(expectedMultiWordId)).toBeDefined();
  });

  test("Multiword using '//'", (): void => {
    expect(idToString(twoWordId)).toBe(twoWordIdString);
    expect(getCompositionFromBuilderCode(twoWordIdString)).toEqual(twoWordId);
  });

  test("Get SVG Element and markup for composite symbol (isCharacter: false)", (): void => {
    // ID 1758 = "group (people)", isCharacter: false, composition: [368, "/", 513].
    // BlissSVGBuilder does not have 1758 in its database; without resolving via
    // symbol.composition, it returns an empty SVG (no paths).
    const svgElement = getSvgElement(1758);
    expect(svgElement).toBeDefined();
    // Verify the SVG has actual content (not an empty <g>)
    expect(svgElement?.querySelector("path, use, rect, circle, line, polyline, polygon")).not.toBe(null);
    expect(getSvgMarkupString(1758)).toBeDefined();
  });
});
