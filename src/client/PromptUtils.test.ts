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

import { renderTemplate, renderPromptLines } from "./PromptUtils";

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
