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

import { initAdaptivePaletteGlobals } from "./GlobalData";
import { findSymbolByGloss } from "./BciAvUtils";

describe("BciUtils module", (): void => {

  // General search for "bark"
  const BARK = "bark";
  const expectedBarkResults = [
    {
      id: 3274,
      bciAvId: 22311,
      label: BARK,
      composition: [548, "/", 669 ],
    }, {
      id: 4168,
      bciAvId: 24020,
      label: "to bark, to woof",
      composition: [457, ";", 81, "/", 124 ],
    }
  ];
  // Search for the single symbol for male cousin.
  const MALE_COUSIN = "cousin (male)";
  const expectedCousionResults = [
    {
      id: 5066,
      bciAvId: 25279,
      label: MALE_COUSIN,
      composition: [607, "/", 479, "/", 11, "/", 500],
    }
  ];
  const NO_SUCH_GLOSS = "noSuchGloss";

  // Github test runs suggested that more that 5000 msec was needed for these
  // tests, so increased timeout to 7000.
  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  }, 10000);

  test("Find multiple 'bark'", (): void => {
    expect(findSymbolByGloss(BARK)).toStrictEqual(expectedBarkResults);
  });

  test("Find single male cousin", (): void => {
    expect(findSymbolByGloss(MALE_COUSIN)).toStrictEqual(expectedCousionResults);
  });

  test("Search when no matching gloss", (): void => {
    expect(findSymbolByGloss(NO_SUCH_GLOSS)).toStrictEqual([]);
  });

});
