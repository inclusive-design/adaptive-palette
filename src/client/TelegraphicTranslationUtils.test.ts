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
import { adaptivePaletteGlobals } from "./GlobalData";
import { queryChat } from "./OllamaApi";
import { NO_MODELS_MESSAGE } from "./GlobalData";
import {
  pickModel, renderTemplate, parseSentences, requestSentences
} from "./TelegraphicTranslationUtils";

vi.mock("./OllamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./OllamaApi")>();
  return { ...actual, queryChat: vi.fn() };
});

const mockedQueryChat = vi.mocked(queryChat);

const CONFIG = {
  model: "phony-model:12b",
  numSentences: 3,
  maxStoredRecords: 500,
  systemPrompt: "Give {{numSentences}} sentences.",
  userPrompt: "Telegraphic message: {{telegraphicMessage}}"
};

describe("telegraphicTranslation", (): void => {

  beforeEach((): void => {
    mockedQueryChat.mockReset();
    adaptivePaletteGlobals.LLMs = ["phony-model:12b", "other-model:7b"];
    adaptivePaletteGlobals.config = {
      indicatorLabelLookup: { useModelQueryFallback: false, model: "" },
      telegraphicTranslation: { ...CONFIG }
    };
  });

  describe("pickModel", (): void => {

    test("uses the configured model when it is available", (): void => {
      expect(pickModel("other-model:7b")).toBe("other-model:7b");
    });

    test("falls back to the first available model when the configured one is missing", (): void => {
      expect(pickModel("not-installed:70b")).toBe("phony-model:12b");
    });

    test("falls back to the first available model when none is configured", (): void => {
      expect(pickModel("")).toBe("phony-model:12b");
    });
  });

  describe("renderTemplate", (): void => {

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

  describe("parseSentences", (): void => {

    test("strips list numbering and drops blank lines", (): void => {
      const reply = "1. I am hungry.\n\n2. I would like to eat.\n3) Can I eat now?\n";
      expect(parseSentences(reply)).toEqual([
        "I am hungry.", "I would like to eat.", "Can I eat now?"
      ]);
    });

    test("keeps unnumbered lines", (): void => {
      expect(parseSentences("I am hungry.")).toEqual(["I am hungry."]);
    });

    test("drops a preamble line, which would otherwise be spoken as the sentence", (): void => {
      const reply = "Sure, here is the sentence:\n1. I am hungry.";
      expect(parseSentences(reply)).toEqual(["I am hungry."]);
    });

    test("returns an empty array for an empty reply", (): void => {
      expect(parseSentences("\n  \n")).toEqual([]);
    });
  });

  describe("requestSentences", (): void => {

    test("renders both prompts and returns the parsed sentences", async (): Promise<void> => {
      mockedQueryChat.mockResolvedValue({
        message: { content: "1. I am hungry.\n2. I want food." }
      } as never);

      const result = await requestSentences("me hungry");

      expect(result).toEqual({
        sentences: ["I am hungry.", "I want food."],
        model: "phony-model:12b"
      });
      expect(mockedQueryChat).toHaveBeenCalledWith(
        "Telegraphic message: me hungry",
        "phony-model:12b",
        false,
        "Give 3 sentences.",
        undefined
      );
    });

    test("forwards an abort signal to the query", async (): Promise<void> => {
      mockedQueryChat.mockResolvedValue({
        message: { content: "1. I am hungry." }
      } as never);
      const controller = new AbortController();

      await requestSentences("me hungry", controller.signal);

      expect(mockedQueryChat).toHaveBeenCalledWith(
        "Telegraphic message: me hungry",
        "phony-model:12b",
        false,
        "Give 3 sentences.",
        controller.signal
      );
      // An `AbortSignal`'s state lives in prototype getters, so deep equality treats any two
      // signals as alike. Only identity proves the caller's own signal was forwarded rather
      // than a freshly made one.
      expect(mockedQueryChat.mock.calls[0][4]).toBe(controller.signal);
    });

    test("rejects when the model returns nothing usable", async (): Promise<void> => {
      mockedQueryChat.mockResolvedValue({ message: { content: "  \n \n" } } as never);
      await expect(requestSentences("me hungry")).rejects.toThrow();
    });

    test("rejects when the query fails", async (): Promise<void> => {
      mockedQueryChat.mockRejectedValue(new Error("connection refused"));
      await expect(requestSentences("me hungry")).rejects.toThrow();
    });

    test("rejects when the feature is unavailable", async (): Promise<void> => {
      adaptivePaletteGlobals.LLMs = [];
      await expect(requestSentences("me hungry")).rejects.toThrow(NO_MODELS_MESSAGE);
    });
  });
});
