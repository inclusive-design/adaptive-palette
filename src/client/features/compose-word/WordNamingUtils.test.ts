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
import { queryChat } from "../../core/OllamaApi";
import { adaptivePaletteGlobals } from "../../state/GlobalData";
import { setTestConfig } from "../../testUtils/TestConfig";
import { canSuggestNames, parseNames, requestNameSuggestions } from "./WordNamingUtils";

vi.mock("../../core/OllamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../core/OllamaApi")>();
  return { ...actual, queryChat: vi.fn() };
});

const mockedQueryChat = vi.mocked(queryChat);
const WORD_NAMING = { model: "phony-model:12b", systemPrompt: "Name it.", userPrompt: "Parts: {{parts}}" };

describe("parseNames()", (): void => {

  test("takes one name per line, without numbering, quotes or the name already offered", (): void => {
    expect(parseNames("1. female teacher\n- woman giving knowledge\n\n\"lady teacher\"\n2) Female Teacher", "woman giving knowledge"))
      .toEqual(["female teacher", "lady teacher"]);
  });

  test("drops a preamble ending in a colon", (): void => {
    expect(parseNames("Here are 3 names:\nfemale teacher\nwoman educator\nlady teacher", "x"))
      .toEqual(["female teacher", "woman educator", "lady teacher"]);
  });

  test("takes three names at most", (): void => {
    expect(parseNames("a\nb\nc\nd", "x")).toEqual(["a", "b", "c"]);
  });
});

describe("requestNameSuggestions()", (): void => {

  afterEach((): void => {
    adaptivePaletteGlobals.models = [];
    setTestConfig();
  });

  test("asks the model with the parts' labels and returns its names", async (): Promise<void> => {
    setTestConfig({ wordNaming: WORD_NAMING });
    adaptivePaletteGlobals.models = ["phony-model:12b"];
    mockedQueryChat.mockResolvedValue({ message: { content: "female teacher" } } as never);

    expect(await requestNameSuggestions(["woman", "giving", "knowledge"], "woman giving knowledge"))
      .toEqual(["female teacher"]);
    expect(mockedQueryChat).toHaveBeenCalledWith("Parts: woman + giving + knowledge", "phony-model:12b", false, "Name it.", undefined);
  });

  test("names can be suggested only with a model and the section configured", (): void => {
    setTestConfig({ wordNaming: WORD_NAMING });
    expect(canSuggestNames()).toBe(false);
    adaptivePaletteGlobals.models = ["phony-model:12b"];
    expect(canSuggestNames()).toBe(true);
    setTestConfig();
    expect(canSuggestNames()).toBe(false);
  });
});
