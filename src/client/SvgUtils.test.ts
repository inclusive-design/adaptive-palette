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
import { vi } from "vitest";
import { BlissSVGBuilder } from "bliss-svg-builder";
import { initAdaptivePaletteGlobals } from "./GlobalData";
import {
  compositionToBstr, bstrToComposition, isIndicator,
  findIndicators, isModifier, findClassifierFromLeft, findSymbolByBciAvId,
  getSvgElement, getSvgMarkupString,
} from "./SvgUtils";

describe("SvgUtils module", (): void => {
  const singleId = 823;                             // CONJ.
  const expectedString = "B823";

  const idArray = [ 106, "/", 12 ];                 // VERB+EN
  const expectedConcatenation = "B106/B12";

  const invalidId = 0;

  const mixedSeparatorsBstr = "B206;B81/RK:-2/B473/B457";
  const expectedMixedSeparatorsComposition = [
    206, ";", 81, "/", "RK:-2", "/", 473, "/", 457
  ];

  const abcBstr = "Xa/Xb/Xc";       // "a b c"
  const expectedAbcComposition = [ "Xa", "/", "Xb", "/", "Xc" ];

  const multiWordBstr = "B2505//B348/B81/B86";
  const expectedMultiWordComposition = [ 2505, "//", 348, "/", 81, "/", 86 ];

  const doubleSemicolonBStr = "B206;B81/RK:-2/B473/B457;;B5996;;B99";
  const expectedDoubleSemicolonComposition = [
    206, ";", 81, "/", "RK:-2", "/", 473, "/", 457, ";;", 5996, ";;", 99
  ];

  const hasAkKerningBStr = "B206;B81/AK:-2/B473/RK:-2/B457;;B5996";
  const hasAkKerningComposition = [
    206, ";", 81, "/", "AK:-2", "/", 473, "/", "RK:-2", "/", 457, ";;", 5996
  ];

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
  }, 10000);

  test("Create svg builder argument", (): void => {
    let result = compositionToBstr(singleId);
    expect(result).toBe(expectedString);

    result = compositionToBstr(idArray);
    expect(result).toBe(expectedConcatenation);
  });

  test("compositionToBstr treats composite ids as bare aliases", (): void => {
    // 1291 = "big, large", isCharacter: false, composition: [936, ";", 86]
    expect(compositionToBstr(1291)).toBe("1291");

    // 1903 = "to know", isCharacter: false, composition: [412, ";", 81] -- mixed into
    // an array alongside character ids 449 and 401, which keep their "B" prefix.
    expect(compositionToBstr([1903, "/", 449, "/", 401])).toBe("1903/B449/B401");
  });

  test("initSvgCompositeDefinitions registers every composite symbol as a BlissSVGBuilder alias", (): void => {
    // 1758 = "group (people)", isCharacter: false, composition: [368, "/", 513].
    // Its own dictionary id should now resolve as an alias, with no `getResolvedComposition`
    // step in the way.
    expect(BlissSVGBuilder.isDefined("1758")).toBe(true);
    expect(BlissSVGBuilder.getDefinition("1758")?.codeString).toBe("B368/B513");

    // A character symbol (823 = CONJ.) is deliberately NOT registered as an alias:
    // it must always be referenced by its native "B<id>" code (see compositionToBstr()).
    expect(BlissSVGBuilder.isDefined("823")).toBe(false);
  });

  test("compositionToBstr falls back to inline expansion when a composite's alias registration fails", (): void => {
    // 4749 = "to massage", composition: [106, ";", 81, "/", "RK:-2", "/", 374, "/", 718].
    // BlissSVGBuilder.define() rejects this codeString (word separator "/" combined
    // with an internal kerning coordinate "RK:-2"), so it's NOT registered as an alias.
    expect(BlissSVGBuilder.isDefined("4749")).toBe(false);
    // compositionToBstr must fall back to the full inline expansion rather than
    // emitting an unresolvable bare "4749" token.
    expect(compositionToBstr(4749)).toBe("B106;B81/RK:-2/B374/B718");
    // And it must still render real content, not an empty SVG.
    expect(getSvgMarkupString(4749)).toBe(getSvgMarkupString([106, ";", 81, "/", "RK:-2", "/", 374, "/", 718]));
  });

  test("Unknown id produces empty-ish SVG", (): void => {
    expect(() => { compositionToBstr(invalidId); }).not.toThrow();
    // invalidId=0 produces "B0" which BlissSVGBuilder doesn't recognize -- it now
    // always returns a builder (with a warning), rendering an empty <svg> rather
    // than nothing.
    expect(getSvgMarkupString(invalidId)).toBeDefined();
  });

  test("Create a SymbolCompositionType from a Blissary SVG builder string", (): void => {
    expect(bstrToComposition(mixedSeparatorsBstr)).toEqual(expectedMixedSeparatorsComposition);
    expect(bstrToComposition(abcBstr)).toEqual(expectedAbcComposition);
    expect(bstrToComposition(multiWordBstr)).toEqual(expectedMultiWordComposition);
    expect(bstrToComposition(doubleSemicolonBStr)).toEqual(expectedDoubleSemicolonComposition);
    expect(bstrToComposition(hasAkKerningBStr)).toEqual(hasAkKerningComposition);
  });

  test("Check bstrToComposition() when passing an invalid input", (): void => {
    expect(bstrToComposition("asdffr;B1214343")).toEqual([]);
    expect(bstrToComposition("")).toEqual([]);
  });

  test("Check for indicator or modifier ID", (): void => {
    expect(isIndicator(indicatorId)).toEqual(true);
    expect(isIndicator(nonIndicatorId)).toEqual(false);
    expect(isModifier(modifierId)).toEqual(true);
    expect(isModifier(nonModifierId)).toEqual(false);
  });

  test("Find indicator positions", (): void => {
    // `expectedMixedSeparatorsComposition` contains an action indicator (id=81) over the first symbol.
    let indicatorPositions = findIndicators(expectedMixedSeparatorsComposition);
    expect(indicatorPositions.length).toEqual(1);
    expect(indicatorPositions).toEqual([2]);

    // `expectedAbcComposition` has no indicators.  `singleId` is a single number and has no indicators.
    indicatorPositions = findIndicators(expectedAbcComposition);
    expect(indicatorPositions.length).toEqual(0);
    indicatorPositions = findIndicators(singleId);
    expect(indicatorPositions.length).toEqual(0);
  });

  test("Find first symbol after a modifier", (): void => {
    // Prefix the `expectedMixedSeparatorsComposition` with the `modifierId` modifier.
    let modifiedRevive = [modifierId, "/", ...expectedMixedSeparatorsComposition];
    expect(findClassifierFromLeft(modifiedRevive)).toEqual(2);

    // Prefix again with two modifiers and a modifier suffix.
    modifiedRevive = [modifierId, "/", modifierId, "/", ...expectedMixedSeparatorsComposition, "/", modifierId];
    expect(findClassifierFromLeft(modifiedRevive)).toEqual(4);

    // The original `expectedMixedSeparatorsComposition` has no modifiers; also a single id has no modifiers.
    expect(findClassifierFromLeft(expectedMixedSeparatorsComposition)).toEqual(0);
    expect(findClassifierFromLeft(singleId)).toEqual(0);

    // The symbol for "no" is made of all modifier symbols, but the negative sign
    // is the classifier, so `findClassifierFromLeft()` should return zero.
    expect(findClassifierFromLeft(noHasNoModifiers)).toEqual(0);
  });

  test("Check finding full symbol information", (): void => {
    let actual = findSymbolByBciAvId(23409);   // CONJ. bciAvId
    expect(actual?.bciAvId).toBe(23409);

    // Passing an invalid BCI AV ID should return `undefined`
    actual = findSymbolByBciAvId(1);
    expect(actual).toEqual(undefined);
  });

  test("Composite symbol renders identically via bare id and its expanded composition", (): void => {
    // 1903 = "to know", isCharacter: false, composition: [412, ";", 81]
    expect(getSvgMarkupString(1903)).toBe(getSvgMarkupString([412, ";", 81]));
  });

  test("getSvgBuilder logs console.error for an invalid id but still returns a builder", (): void => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const svgElement = getSvgElement(invalidId);
    const svgMarkupString = getSvgMarkupString(invalidId);

    expect(svgElement).toBeDefined();
    expect(svgElement).not.toBeNull();
    expect(svgMarkupString).toBeDefined();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  test("Get SVG Element and markup for single ID", (): void => {
    expect(getSvgElement(singleId)).toBeDefined();
    expect(getSvgMarkupString(singleId)).toBeDefined();
  });

  test("Get SVG Element and markup for invalid id", (): void => {
    // For invalid ids, getSvgBuilder always returns a builder with empty content.
    expect(getSvgElement(invalidId)).toBeDefined();
    expect(getSvgElement(invalidId)).not.toBeNull();
    expect(getSvgMarkupString(invalidId)).toBeDefined();
  });

  test("Get SVG Element and markup for id array using slash, semi-colon, and kern codes", (): void => {
    expect(getSvgElement(expectedMixedSeparatorsComposition)).toBeDefined();
    expect(getSvgMarkupString(expectedMixedSeparatorsComposition)).toBeDefined();
  });

  test("Get SVG Element and markup for id array using double-slash code", (): void => {
    expect(getSvgElement(expectedMultiWordComposition)).toBeDefined();
    expect(getSvgMarkupString(expectedMultiWordComposition)).toBeDefined();
  });

  test("Get SVG Element and markup for id array using X code", (): void => {
    expect(getSvgElement(expectedMultiWordComposition)).toBeDefined();
    expect(getSvgMarkupString(expectedMultiWordComposition)).toBeDefined();
  });

  test("Multiword using '//'", (): void => {
    expect(compositionToBstr(twoWordId)).toBe(twoWordIdString);
    expect(bstrToComposition(twoWordIdString)).toEqual(twoWordId);
  });

  test("Get SVG Element and markup for composite symbol (isCharacter: false)", (): void => {
    // ID 1758 = "group (people)", isCharacter: false, composition: [368, "/", 513].
    // Registered by initSvgCompositeDefinitions() as a bare-id alias to "B368/B513",
    // so BlissSVGBuilder resolves it to real content without any resolution step
    // in SvgUtils.ts itself.
    const svgElement = getSvgElement(1758);
    expect(svgElement).toBeDefined();
    // Verify the SVG has actual content (not an empty <g>)
    expect(svgElement?.querySelector("path, use, rect, circle, line, polyline, polygon")).not.toBe(null);
    expect(getSvgMarkupString(1758)).toBeDefined();
  });
});
