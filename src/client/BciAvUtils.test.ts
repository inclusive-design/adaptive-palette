/*
 * Copyright 2025 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { initAdaptivePaletteGlobals } from "./GlobalData";
import { findBciAvId } from "./BciAvUtils";

describe("BciUtils module", (): void => {

  // General search for "bark"
  const BARK = "bark";
  const expectedBarkResults = [
    {
      bciAvId: 22311,
      label: BARK,
      composition: [16420, "/", 17783 ],
      fullComposition: undefined
    }, {
      bciAvId: 24020,
      label: `${BARK}-(to)`,
      composition: [15666, ";", 8993, "/", 12380 ],
      fullComposition: undefined
    }
  ];
  // Search for the single symbol for male cousin.
  const MALE_COUSIN = "cousin_(male)";
  const expectedCousionResults = [
    {
      bciAvId: 25279,
      label: MALE_COUSIN,
      composition: [17209, "/", 15912, "/", 8498, "/", 15968],
      fullComposition: undefined
    }
  ];
  const NO_SUCH_GLOSS = "noSuchGloss";

  // Github test runs suggested that more that 5000 msec was needed for these
  // tests, so increased timeout to 7000.
  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  }, 7000);

  test("Find multiple 'bark'", (): void => {
    expect(findBciAvId(BARK)).toStrictEqual(expectedBarkResults);
  });

  test("Find single male cousin", (): void => {
    expect(findBciAvId(MALE_COUSIN)).toStrictEqual(expectedCousionResults);
  });

  test("Search when no matching gloss", (): void => {
    expect(findBciAvId(NO_SUCH_GLOSS)).toStrictEqual([]);
  });

});
