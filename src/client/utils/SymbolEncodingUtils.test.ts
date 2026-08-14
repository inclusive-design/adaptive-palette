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

import { applyModifiersToLabel, normalizeComposition } from "./SymbolEncodingUtils";

describe("applyModifiersToLabel()", (): void => {

  test("No modifierInfo returns the base label unchanged", (): void => {
    expect(applyModifiersToLabel("walk")).toBe("walk");
    expect(applyModifiersToLabel("walk", [])).toBe("walk");
  });

  test("A single prepended modifier goes before the word", (): void => {
    expect(applyModifiersToLabel("walk", [
      { modifierId: 400, modifierGloss: "big", isPrepended: true }
    ])).toBe("big walk");
  });

  test("A single appended modifier goes after the word", (): void => {
    expect(applyModifiersToLabel("walk", [
      { modifierId: 401, modifierGloss: "quickly", isPrepended: false }
    ])).toBe("walk quickly");
  });

  test("Multiple modifiers fold in application order", (): void => {
    expect(applyModifiersToLabel("walk", [
      { modifierId: 400, modifierGloss: "big", isPrepended: true },
      { modifierId: 401, modifierGloss: "quickly", isPrepended: false }
    ])).toBe("big walk quickly");
  });

});

describe("normalizeComposition()", (): void => {

  test("Single-number array collapses to bare number", (): void => {
    expect(normalizeComposition([1433])).toBe(1433);
  });

  test("Bare number passes through unchanged", (): void => {
    expect(normalizeComposition(1433)).toBe(1433);
  });

  test("Multi-element array passes through unchanged", (): void => {
    expect(normalizeComposition([1433, 1434])).toEqual([1433, 1434]);
  });

  test("Single-element array containing a string passes through unchanged", (): void => {
    expect(normalizeComposition(["foo"])).toEqual(["foo"]);
  });

});
