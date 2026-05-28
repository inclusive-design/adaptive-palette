/*
 * Copyright 2025-2026 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { initAdaptivePaletteGlobals } from "./GlobalData";
import { findSymbolByGloss, findSymbolByBciAvId } from "./BciAvUtils";

describe("BciUtils module", (): void => {

  // General search for "bark"
  const BARK = "bark";
  const expectedBarkResults = [
    {
      id: 3274,
      label: BARK,
      composition: [548, "/", 669 ],
    }, {
      id: 4168,
      label: "to bark, to woof",
      composition: [457, ";", 81, "/", 124 ],
    }
  ];
  const SPACE_ID = 17221;
  const expectedSpaceIdResults = [
    {
      id: 611,
      label: "space, dimension",
      composition: undefined,
    }, {
      id: 5402,
      label: "sculpture",
      composition: [ 840, ";", 97, "/", "RK:-2", "/", 313, "/", 12, "/", 611 ],
    }
  ];
  // Search for the single symbol for male cousin.
  const MALE_COUSIN = "cousin (male)";
  const expectedCousionResults = [
    {
      id: 5066,
      label: MALE_COUSIN,
      composition: [607, "/", 479, "/", 11, "/", 500],
    }
  ];
  const NO_SUCH_GLOSS = "noSuchGloss";
  const NO_SUCH_ID = -1;

  // Github test runs suggested that more that 5000 msec was needed for these
  // tests, so increased timeout to 7000.
  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  }, 7000);

  test("Find multiple 'bark'", (): void => {
    expect(findSymbolByGloss(BARK)).toStrictEqual(expectedBarkResults);
  });

  test("Find single male cousin", (): void => {
    expect(findSymbolByGloss(MALE_COUSIN)).toStrictEqual(expectedCousionResults);
  });

  test("Search when no matching gloss", (): void => {
    expect(findSymbolByGloss(NO_SUCH_GLOSS)).toStrictEqual([]);
  });

  test("Search based on a BCI AV ID", (): void => {
    expect(findSymbolByBciAvId(SPACE_ID)).toStrictEqual(expectedSpaceIdResults);
  });

  test("Search with invalid BCI AV ID", (): void => {
    expect(findSymbolByBciAvId(NO_SUCH_ID)).toStrictEqual([]);
  });

});
