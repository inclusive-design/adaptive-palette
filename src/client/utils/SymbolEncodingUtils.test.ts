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

import {
  applyModifiersToLabel, insertWordAtCaret, removeModifierFromLabel, normalizeComposition, replaceAtCaret,
  caretComposition, deleteAtCaret, COMMA_ID, SPACE_PART
} from "./SymbolEncodingUtils";

// A minimal symbol payload; only the label distinguishes one from another in these tests.
const symbol = (label: string) => ({ label, composition: [1], modifierInfo: [] });

describe("removeModifierFromLabel()", (): void => {

  test("removes a prefix from the start and a suffix from the end", (): void => {
    expect(removeModifierFromLabel("one phone", "one", true)).toBe("phone");
    expect(removeModifierFromLabel("phone one", "one", false)).toBe("phone");
  });

  test("a reworded label loses only a whole-word match", (): void => {
    expect(removeModifierFromLabel("phones one more", "one", false)).toBe("phones more");
    expect(removeModifierFromLabel("phones", "one", false)).toBe("phones");
  });

});

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

describe("insertWordAtCaret()", (): void => {

  test("Appends when the caret is on the last symbol", (): void => {
    const symbolSet = [symbol("me"), symbol("hungry")];
    expect(insertWordAtCaret(symbol("now"), symbolSet, 1)).toEqual({
      payloads: [symbol("me"), symbol("hungry"), symbol("now")],
      caretPosition: 2
    });
  });

  test("Inserts right after the caret when it is inside the message", (): void => {
    const symbolSet = [symbol("me"), symbol("hungry")];
    expect(insertWordAtCaret(symbol("very"), symbolSet, 0)).toEqual({
      payloads: [symbol("me"), symbol("very"), symbol("hungry")],
      caretPosition: 1
    });
  });

  test("A caret before the first symbol inserts at the front", (): void => {
    const symbolSet = [symbol("hungry")];
    expect(insertWordAtCaret(symbol("me"), symbolSet, -1)).toEqual({
      payloads: [symbol("me"), symbol("hungry")],
      caretPosition: 0
    });
  });

  // The gate freezes what it publishes, so a writer that edits the array it was handed
  // throws. Mid-message insertion used to splice the caller's array.
  test("Leaves the array it is given alone", (): void => {
    const symbolSet = Object.freeze([symbol("me"), symbol("hungry")]) as ReturnType<typeof symbol>[];
    expect(() => insertWordAtCaret(symbol("very"), symbolSet, 0)).not.toThrow();
    expect(symbolSet).toHaveLength(2);
  });
});

describe("replaceAtCaret()", (): void => {

  test("Swaps the symbol at the caret and leaves the rest", (): void => {
    const payloads = [symbol("me"), symbol("hungry")];
    expect(replaceAtCaret(payloads, 1, symbol("thirsty")))
      .toEqual([symbol("me"), symbol("thirsty")]);
  });

  test("Leaves the array it is given alone", (): void => {
    const payloads = Object.freeze([symbol("me")]) as ReturnType<typeof symbol>[];
    expect(replaceAtCaret(payloads, 0, symbol("you"))).toEqual([symbol("you")]);
    expect(payloads[0].label).toBe("me");
  });

  test("A caret pointing at no symbol changes nothing", (): void => {
    const payloads = [symbol("me")];
    expect(replaceAtCaret(payloads, -1, symbol("you"))).toEqual([symbol("me")]);
  });
});

describe("caretComposition()", (): void => {

  test("is the composition of the symbol at the caret", (): void => {
    const contents = { payloads: [symbol("a"), { label: "b", composition: 392 }], caretPosition: 1 };
    expect(caretComposition(contents)).toBe(392);
  });

  test("is undefined before the first symbol, and on a picture", (): void => {
    expect(caretComposition({ payloads: [symbol("a")], caretPosition: -1 })).toBeUndefined();
    expect(caretComposition({ payloads: [{ label: "bread", picture: "/bread.jpg" }], caretPosition: 0 })).toBeUndefined();
  });
});

const comma = { label: ",", composition: COMMA_ID, modifierInfo: [] };

describe("insertWordAtCaret() with spaced words", (): void => {

  test("A word gets a space between it and the word before it", (): void => {
    expect(insertWordAtCaret(symbol("colour"), [symbol("cat")], 0, true)).toEqual({
      payloads: [symbol("cat"), SPACE_PART, symbol("colour")],
      caretPosition: 2
    });
  });

  test("A word gets no space at the front, after a space or after a comma", (): void => {
    expect(insertWordAtCaret(symbol("cat"), [], -1, true).payloads).toEqual([symbol("cat")]);
    expect(insertWordAtCaret(symbol("night"), [symbol("cat"), SPACE_PART], 1, true).payloads)
      .toEqual([symbol("cat"), SPACE_PART, symbol("night")]);
    expect(insertWordAtCaret(symbol("drink"), [symbol("food"), comma], 1, true).payloads)
      .toEqual([symbol("food"), comma, symbol("drink")]);
  });

  test("A comma or a space gets no space before it", (): void => {
    expect(insertWordAtCaret(comma, [symbol("food")], 0, true).payloads).toEqual([symbol("food"), comma]);
    expect(insertWordAtCaret(SPACE_PART, [symbol("food")], 0, true).payloads)
      .toEqual([symbol("food"), SPACE_PART]);
  });
});

describe("deleteAtCaret()", (): void => {

  test("Deletes the symbol at the caret and moves the caret back", (): void => {
    expect(deleteAtCaret([symbol("me"), symbol("hungry")], 1))
      .toEqual({ payloads: [symbol("me")], caretPosition: 0 });
  });

  test("A word takes the space before it with it", (): void => {
    expect(deleteAtCaret([symbol("cat"), SPACE_PART, symbol("tail")], 2))
      .toEqual({ payloads: [symbol("cat")], caretPosition: 0 });
  });

  test("A space goes alone", (): void => {
    expect(deleteAtCaret([symbol("cat"), SPACE_PART, symbol("tail")], 1))
      .toEqual({ payloads: [symbol("cat"), symbol("tail")], caretPosition: 0 });
  });

  test("Nothing changes with the caret before the first symbol", (): void => {
    const symbolSet = [symbol("me")];
    expect(deleteAtCaret(symbolSet, -1)).toEqual({ payloads: symbolSet, caretPosition: -1 });
  });
});
