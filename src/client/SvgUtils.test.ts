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

import { initAdaptivePaletteGlobals, adaptivePaletteGlobals } from "./GlobalData";
import {
  bciToBlissaryId, bciAvIdToString, makeBciAvIdType, makeBlissComposition,
  BLISSARY_PATTERN_KEY, BCIAV_PATTERN_KEY
} from "./SvgUtils";

describe("SvgUtils module", (): void => {

  // The `singleBciAvId` is taken from the BMW json for "CONJ." The
  // `bciAvIdArray` is also from the BMW json file using the codes for
  // "VERB+EN".  The `expectedX` constants are based on a manual lookup of the
  // blissary ids.
  const singleBciAvId = 23409;                                    // CONJ.
  const expectedString = "B823";
  const bciAvIdArray = [ 12335, "/", 8499 ];                      // VERB+EN
  const expectedConcatenation = "B106/B12";
  const invalidBciAvId = 1;
  const reviveBciAvId = 12585;
  const reviveBlissarySvgBuilderStr = "B206;B81/K:-2/B473/B457";
  const expectedBciAvIdRevive = [
    13134, ";", 8993, "/", "K:-2", "/", 15732, "/", 15666
  ];
  const reviveBciSvgBuilderStr = "13134;8993/K:-2/15732/15666";
  const abcBciAvId = 12366;
  const abcBlissarySvgBuilderStr = "Xa/Xb/Xc";                    // "a b c"
  const abcBciAvSvgBuilderStr    = "Xa/Xb/Xc";                    // "a b c"
  const expectedBciAvIdAbc = [ "Xa", "/", "Xb", "/", "Xc" ];

  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  });

  test("Retrieve blissary id from BCI-AV-ID", (): void => {
    const { blissaryIdMap } = adaptivePaletteGlobals;

    // Use the 100th entry in the map for testing.  There is nothing special
    // about the 100th entry.  Just as good as any.
    const blissaryIdMapEntry = blissaryIdMap[100];

    const result = bciToBlissaryId(blissaryIdMapEntry.bciAvId);
    expect(result.blissaryId).toBe(blissaryIdMapEntry.blissaryId);
  });

  test("No blissary id for unknown BCI-AV-ID", (): void => {
    expect(bciToBlissaryId(invalidBciAvId)).toBe(undefined);
  });

  test("Create svg builder argument", (): void => {
    let result = bciAvIdToString(singleBciAvId);
    expect(result).toBe(expectedString);

    result = bciAvIdToString(bciAvIdArray);
    expect(result).toBe(expectedConcatenation);
  });

  test("Unknown BCI-AV-ID", (): void => {
    expect(() => { bciAvIdToString(invalidBciAvId); }).toThrow();
  });

  test("Create a BciAvIdType from a Blissry SVG builder string", (): void => {
    expect(makeBciAvIdType(reviveBlissarySvgBuilderStr)).toEqual(expectedBciAvIdRevive);
    expect(makeBciAvIdType(abcBlissarySvgBuilderStr)).toEqual(expectedBciAvIdAbc);
    // Using blissary pattern key, explicitly
    expect(makeBciAvIdType(reviveBlissarySvgBuilderStr, BLISSARY_PATTERN_KEY)).toEqual(expectedBciAvIdRevive);
    expect(makeBciAvIdType(abcBlissarySvgBuilderStr, BLISSARY_PATTERN_KEY)).toEqual(expectedBciAvIdAbc);
  });

  test("Create a BciAvIdType from a BCI-AV SVG builder string", (): void => {
    expect(makeBciAvIdType(reviveBciSvgBuilderStr, BCIAV_PATTERN_KEY)).toEqual(expectedBciAvIdRevive);
    expect(makeBciAvIdType(abcBciAvSvgBuilderStr, BCIAV_PATTERN_KEY)).toEqual(expectedBciAvIdAbc);
  });

  test("Make Bliss composition", (): void => {
    let composition = makeBlissComposition(reviveBciAvId);
    expect(composition.bciAvId).toBe(reviveBciAvId);
    expect(composition.bciComposition).toEqual(expectedBciAvIdRevive);

    composition = makeBlissComposition(abcBciAvId);
    expect(composition.bciAvId).toBe(abcBciAvId);
    expect(composition.bciComposition).toEqual(expectedBciAvIdAbc);
  });
});
