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
import { bciToBlissaryId, bciAvIdToString } from "./SvgUtils";

describe("SvgUtils module", (): void => {

  // The `singleBciAvId` is taken from the BMW json for "CONJ." The
  // `bciAvIdArray` is also from the BMW json file using the codes for
  // "VERB+EN".  The `expectedX` constants are based on a manual lookup of the
  // blissary ids.
  const singleBciAvId = 23409;                // CONJ.
  const expectedString = "B823";
  const bciAvIdArray =[ 12335, "/", 8499 ];   // VERB+EN
  const expectedConcatenation = "B106/B12";
  const invalidBciAvId = 1;

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

});
