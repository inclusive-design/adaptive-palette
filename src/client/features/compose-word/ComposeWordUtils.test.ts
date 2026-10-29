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
import type { SymbolCompositionType, SymbolEncodingType } from "../../index.d";
import { COMMA_ID, SPACE_PART } from "../../utils/SymbolEncodingUtils";
import { defaultName, findExistingWord, splitPart, wordComposition } from "./ComposeWordUtils";

const part = (label: string, composition: SymbolCompositionType): SymbolEncodingType =>
  ({ label, composition, modifierInfo: [] });
const cat = part("cat", 126);
const colour = part("colour", 1161);
const night = part("night", 470);
const woman = part("woman", 710);
const giving = part("giving", 949);
const knowledge = part("knowledge", 412);
const comma = part(",", COMMA_ID);

describe("wordComposition()", (): void => {

  test("joins the parts' characters a quarter space apart", (): void => {
    expect(wordComposition([woman, giving, knowledge], false)).toEqual([710, "/", 949, "/", 412]);
  });

  test("puts a full space where a space part is, and a combine marker at each end", (): void => {
    expect(wordComposition([cat, SPACE_PART, colour, SPACE_PART, night], true))
      .toEqual([233, "/", 126, "//", 1161, "//", 470, "/", 233]);
  });

  test("drops a part's grammatical indicator", (): void => {
    // "to teach" is giving + action indicator + knowledge.
    expect(wordComposition([woman, part("to teach", 2558)], false)).toEqual([710, "/", 949, "/", 412]);
  });

  test("keeps the thing indicator", (): void => {
    expect(wordComposition([part("gift", [949, ";", 97])], false)).toEqual([949, ";", 97]);
  });

  test("keeps the abstract indicator", (): void => {
    expect(wordComposition([part("knowledge", [412, ";", 6436])], false)).toEqual([412, ";", 6436]);
  });

  test("puts a comma a quarter space from its neighbours", (): void => {
    expect(wordComposition([cat, comma, colour], false)).toEqual([126, "/", 5, "/", 1161]);
  });

  test("a space at either end adds nothing", (): void => {
    expect(wordComposition([SPACE_PART, cat, SPACE_PART], true)).toEqual([233, "/", 126, "/", 233]);
  });

  test("a word with no symbol in it has no composition", (): void => {
    expect(wordComposition([SPACE_PART], true)).toEqual([]);
  });
});

describe("splitPart()", (): void => {

  test("breaks a word into its characters, each labelled with its first meaning", (): void => {
    expect(splitPart(part("teacher", 2559), "en")).toEqual([
      { label: "person", composition: 513, modifierInfo: [] },
      { label: "giving", composition: 949, modifierInfo: [] },
      { label: "knowledge", composition: 412, modifierInfo: [] }
    ]);
  });

  test("labels the characters in the language asked for", (): void => {
    expect(splitPart(part("teacher", 2559), "sv").map((piece) => piece.label))
      .toEqual(["person", "givande", "kunskap"]);
  });

  test("a character keeps the indicator on it", (): void => {
    expect(splitPart(part("to teach", 2558), "en")[0])
      .toEqual({ label: "giving", composition: [949, ";", 81], modifierInfo: [] });
  });

  test("a single character stays one part", (): void => {
    expect(splitPart(cat, "en")).toHaveLength(1);
  });
});

describe("defaultName()", (): void => {

  test("joins the words' labels, each cut to its first meaning", (): void => {
    expect(defaultName([part("woman, female", 710), giving, knowledge])).toBe("woman giving knowledge");
  });

  test("leaves out spaces, commas and pictures", (): void => {
    const bread = { label: "bread", picture: "bread.png", modifierInfo: [] };
    expect(defaultName([bread, cat, SPACE_PART, colour, comma, night])).toBe("cat colour night");
  });
});

describe("findExistingWord()", (): void => {

  test("finds the vocabulary word with the same composition", (): void => {
    expect(findExistingWord([513, "/", 949, "/", 412])?.id).toBe(2559);
  });

  test("finds nothing for a new word", (): void => {
    expect(findExistingWord([710, "/", 949, "/", 412])).toBeUndefined();
  });
});
