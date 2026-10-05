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
import { adaptivePaletteGlobals } from "../../state/GlobalData";
import { queryChat } from "../../core/OllamaApi";
import { setTestConfig } from "../../testUtils/TestConfig";
import {
  pickModel, parseSentences, parseSentenceWords, parseWordsLine, requestSentences
} from "./TelegraphicTranslationUtils";
import { FUTURE_INDICATOR_ID, PAST_INDICATOR_ID, PLURAL_INDICATOR_ID } from "./BlissSentenceUtils";
import {
  selectedAttributesSignal, clearAttributes
} from "../message-attributes/MessageAttributesState";
import { aboutMeSignal } from "../about-me/AboutMeState";
import { en } from "../../i18n/en";
import { sv } from "../../i18n/sv";
import { languageSignal } from "../../i18n/I18n";

vi.mock("../../core/OllamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../core/OllamaApi")>();
  return { ...actual, queryChat: vi.fn() };
});

const mockedQueryChat = vi.mocked(queryChat);

const CONFIG = {
  model: "phony-model:12b",
  numSentences: 3,
  systemPrompt: "Give {{numSentences}} sentences.",
  userPrompt: "Telegraphic message: {{telegraphicMessage}}",
  showBlissSentence: true
};

describe("telegraphicTranslation", (): void => {

  beforeEach((): void => {
    mockedQueryChat.mockReset();
    adaptivePaletteGlobals.models = ["phony-model:12b", "other-model:7b"];
    setTestConfig({ telegraphicTranslation: { ...CONFIG } });
    clearAttributes();
    aboutMeSignal.value = { facts: [], dismissed: [], pending: [] };
  });

  afterEach((): void => {
    languageSignal.value = "en";
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

    test("throws when no model is available", (): void => {
      adaptivePaletteGlobals.models = [];
      expect((): string => pickModel("phony-model:12b")).toThrow(en.noModels);
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

    test("drops the words lines", (): void => {
      expect(parseSentences("1. Jag åt.\n> Jag=jag | åt=äta+past")).toEqual(["Jag åt."]);
    });
  });

  describe("parseWordsLine", (): void => {

    test("reads each word, its base form and its tag", (): void => {
      expect(parseWordsLine("> Jag=jag | åt=äta+past | äpplen=äpple+plural | .")).toEqual([
        { text: "Jag", key: "jag", indicatorId: undefined },
        { text: "åt", key: "äta", indicatorId: PAST_INDICATOR_ID },
        { text: "äpplen", key: "äpple", indicatorId: PLURAL_INDICATOR_ID },
        { text: ".", key: ".", isPunctuation: true }
      ]);
    });

    test("keeps a word of several written words", (): void => {
      expect(parseWordsLine("> ska äta=äta+future")).toEqual([
        { text: "ska äta", key: "äta", indicatorId: FUTURE_INDICATOR_ID }
      ]);
    });

    test("rejects the line when a part is malformed", (): void => {
      expect(parseWordsLine("> Jag=jag | åt")).toBeUndefined();
      expect(parseWordsLine("> åt=äta+yesterday")).toBeUndefined();
      expect(parseWordsLine("> Jag=jag || åt=äta")).toBeUndefined();
      expect(parseWordsLine(">")).toBeUndefined();
    });
  });

  describe("parseSentenceWords", (): void => {

    test("ties each words line to the sentence above it", (): void => {
      const words = parseSentenceWords("1. Jag åt.\n> Jag=jag | åt=äta+past | .\n2. Jag äter.\n> Jag=jag | äter=äta | .");
      expect(words.get("Jag åt.")?.[1].indicatorId).toBe(PAST_INDICATOR_ID);
      expect(words.get("Jag äter.")?.[1].indicatorId).toBeUndefined();
    });

    test("leaves a sentence with a malformed or missing words line out", (): void => {
      const words = parseSentenceWords("1. Jag åt.\n> trasig\n2. Jag äter.");
      expect(words.size).toBe(0);
    });
  });

  describe("requestSentences", (): void => {

    test("asks with the prompts for the UI language", async (): Promise<void> => {
      setTestConfig({ telegraphicTranslation: {
        model: "", numSentences: 1, showBlissSentence: true,
        systemPrompt: { en: "en system", sv: "sv system" }, userPrompt: "Message: {{telegraphicMessage}}"
      } });
      languageSignal.value = "sv";
      mockedQueryChat.mockResolvedValue({ message: { content: "1. Jag är hungrig." } } as never);

      const result = await requestSentences("jag hungrig");

      expect(mockedQueryChat).toHaveBeenCalledWith("Message: jag hungrig", expect.any(String), false, "sv system", undefined);
      expect(result.language).toBe("sv");
    });

    test("is not configured when there is no prompt for the UI language", async (): Promise<void> => {
      setTestConfig({ telegraphicTranslation: {
        model: "", numSentences: 1, showBlissSentence: true, systemPrompt: { en: "en system" }, userPrompt: "u"
      } });
      languageSignal.value = "sv";
      await expect(requestSentences("jag hungrig")).rejects.toThrow(sv.sentenceNotConfigured);
    });

    test("renders both prompts and returns the parsed sentences", async (): Promise<void> => {
      mockedQueryChat.mockResolvedValue({
        message: { content: "1. I am hungry.\n2. I want food." }
      } as never);

      const result = await requestSentences("me hungry");

      expect(result).toEqual({
        sentences: ["I am hungry.", "I want food."],
        model: "phony-model:12b",
        language: "en",
        words: new Map()
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
      adaptivePaletteGlobals.models = [];
      await expect(requestSentences("me hungry")).rejects.toThrow(en.noModels);
    });
  });

  describe("the attributes line in the user prompt", (): void => {

    const promptConfig = {
      ...CONFIG,
      userPrompt: "Telegraphic message: {{telegraphicMessage}}\nMessage attributes: {{attributes}}"
    };

    beforeEach((): void => {
      setTestConfig({ telegraphicTranslation: promptConfig });
      mockedQueryChat.mockResolvedValue({ message: { content: "1. Am I late?" } } as never);
    });

    test("carries the attributes when some are set", async (): Promise<void> => {
      selectedAttributesSignal.value = [
        { category: "Intent", label: "question", composition: 553 },
        { category: "Priority", label: "urgent", composition: 4310 }
      ];

      await requestSentences("late");

      expect(mockedQueryChat.mock.calls[0][0]).toBe(
        "Telegraphic message: late\nMessage attributes: Intent: question; Priority: urgent"
      );
    });

    test("drops the attributes line when none are set", async (): Promise<void> => {
      await requestSentences("late");

      expect(mockedQueryChat.mock.calls[0][0]).toBe("Telegraphic message: late");
    });
  });

  describe("the About Me line in the user prompt", (): void => {

    const promptConfig = {
      ...CONFIG,
      userPrompt: "Telegraphic message: {{telegraphicMessage}}\nWhat you know about the user: {{aboutMe}}"
    };

    beforeEach((): void => {
      setTestConfig({ telegraphicTranslation: promptConfig });
      mockedQueryChat.mockResolvedValue({ message: { content: "1. Rex needs a walk." } } as never);
    });

    test("carries About Me when it has facts", async (): Promise<void> => {
      aboutMeSignal.value = {
        facts: [{
          id: "fact-1", category: "Family", text: "has a dog named Rex",
          source: "manual", addedAt: "2026-09-22T00:00:00.000Z"
        }],
        dismissed: [], pending: [] };

      await requestSentences("dog walk");

      expect(mockedQueryChat.mock.calls[0][0]).toBe(
        "Telegraphic message: dog walk\nWhat you know about the user: Family: has a dog named Rex"
      );
    });

    test("drops the About Me line when there are no facts", async (): Promise<void> => {
      await requestSentences("dog walk");

      expect(mockedQueryChat.mock.calls[0][0]).toBe("Telegraphic message: dog walk");
    });
  });
});
