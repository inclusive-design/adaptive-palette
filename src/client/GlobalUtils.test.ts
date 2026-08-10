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
import { generateGridStyle, clamp, applyModifiersToLabel, normalizeComposition, renderTemplate, renderPromptLines, clearSavedData } from "./GlobalUtils";
import { MESSAGE_LOG_KEY } from "./MessageLog";

describe("Test global utility functions", (): void => {

  test("Test generateGridStyle()", (): void => {
    // All values provided
    expect(generateGridStyle(2, 1, 3, 2)).toBe("grid-column: 2 / span 1;grid-row: 3 / span 2;");
    
    // All values explicitly undefined. Expect an empty string
    expect(generateGridStyle(undefined, undefined, undefined, undefined)).toBe("");
    
    // No values provided because parameters are optional
    expect(generateGridStyle()).toBe("");

    // Only columnStart provided
    expect(generateGridStyle(2, undefined, undefined, undefined)).toBe("grid-column: 2;");

    // Only columnSpan provided
    expect(generateGridStyle(undefined, 3, undefined, undefined)).toBe("grid-column: span 3;");

    // Only rowStart provided
    expect(generateGridStyle(undefined, undefined, 4, undefined)).toBe("grid-row: 4;");

    // Only rowSpan provided
    expect(generateGridStyle(undefined, undefined, undefined, 5)).toBe("grid-row: span 5;");

    // Mixed variations (e.g., columnStart and rowSpan only)
    expect(generateGridStyle(2, undefined, undefined, 5)).toBe("grid-column: 2;grid-row: span 5;");

    // Mixed variations (e.g., columnSpan and rowStart only)
    expect(generateGridStyle(undefined, 3, 4, undefined)).toBe("grid-column: span 3;grid-row: 4;");
  });

  test("Test clamp function where value is below min", (): void => {
    expect(clamp(-1, 0, 1)).toBe(0);
  });

  test("Test clamp function where value is above max", (): void => {
    expect(clamp(2, 0, 1)).toBe(1);
  });

  test("Test clamp function where value is in range", (): void => {
    expect(clamp(1, 0, 2)).toBe(1);
  });
});

describe("Test applyModifiersToLabel()", (): void => {

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

describe("Test normalizeComposition()", (): void => {

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

describe("Test renderTemplate()", (): void => {

  test("substitutes every known placeholder", (): void => {
    expect(renderTemplate("{{a}} and {{b}} and {{a}}", { a: "one", b: "two" }))
      .toBe("one and two and one");
  });

  test("leaves unknown placeholders untouched", (): void => {
    expect(renderTemplate("{{a}} and {{zzz}}", { a: "one" })).toBe("one and {{zzz}}");
  });

  test("returns a template with no placeholders unchanged", (): void => {
    expect(renderTemplate("nothing to do", { a: "one" })).toBe("nothing to do");
  });

});

describe("Test renderPromptLines()", (): void => {

  const TEMPLATE = "Word: {{word}}\nPart of speech: {{pos}}\nMeaning: {{explanation}}\nEnd";

  test("Renders every line when all values are filled", (): void => {
    expect(renderPromptLines(TEMPLATE, { word: "hammer", pos: "noun", explanation: "a tool" }))
      .toBe("Word: hammer\nPart of speech: noun\nMeaning: a tool\nEnd");
  });

  test("Drops the lines whose value is empty or whitespace", (): void => {
    expect(renderPromptLines(TEMPLATE, { word: "hammer", pos: "", explanation: "  " }))
      .toBe("Word: hammer\nEnd");
  });

  test("Keeps a line whose placeholder has no matching value at all", (): void => {
    expect(renderPromptLines("Word: {{word}}\nUnknown: {{zzz}}", { word: "hammer" }))
      .toBe("Word: hammer\nUnknown: {{zzz}}");
  });

  test("Keeps a line holding one empty value among filled ones", (): void => {
    expect(renderPromptLines("{{a}} and {{b}}\nEnd", { a: "one", b: "" })).toBe("one and \nEnd");
  });

  test("Drops a line whose values are all empty", (): void => {
    expect(renderPromptLines("{{a}} and {{b}}\nEnd", { a: "", b: "  " })).toBe("End");
  });

});

describe("clearSavedData()", (): void => {

  afterEach((): void => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  test("Removes everything the app has saved", (): void => {
    window.localStorage.setItem(MESSAGE_LOG_KEY, JSON.stringify([{ timestamp: "now", payloads: [] }]));
    window.localStorage.setItem("some other key", "value");

    expect(clearSavedData()).toBe(true);
    expect(window.localStorage.length).toBe(0);
  });

  test("Reports failure when storage cannot be written", (): void => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, "clear").mockImplementation((): void => {
      throw new Error("storage is not available");
    });

    expect(clearSavedData()).toBe(false);
    expect(consoleError).toHaveBeenCalled();
  });

});
