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
import { findBciAvId, findCompositionsUsingId } from "./BciAvUtils";

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
  const SPACE_ID = 17221;
  const expectedSpaceIdResults = [
    {
      bciAvId: 17221,
      label: "space,dimension",
      composition: undefined,
      fullComposition: undefined
    }, {
      bciAvId: 25790,
      label: "sculpture",
      composition: [ 23583, ";", 9009, "/", "RK:-2", "/", 14164, "/", 8499, "/", 17221 ],
      fullComposition: [ 23583, ";", 9009, "/", "RK:-2", "/", 14164, "/", 8499, "/", 17221 ]
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
  const NO_SUCH_ID = -1;

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

  test("Search based on a BCI AV ID", (): void => {
    expect(findCompositionsUsingId(SPACE_ID)).toStrictEqual(expectedSpaceIdResults);
  });

  test("Search with invalid BCI AV ID", (): void => {
    expect(findCompositionsUsingId(NO_SUCH_ID)).toStrictEqual([]);
  });

});
