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
import { adaptivePaletteGlobals, NO_MODELS_MESSAGE } from "./GlobalData";
import { MESSAGE_LOG_KEY, saveMessageRecord } from "./MessageLog";
import { queryChat } from "./OllamaApi";
import {
  isModelTierActive, NOT_CONFIGURED_MESSAGE, parseModelWords, predictNext, rankModelWords,
  requestModelWords, resolveWordPayload, SEED_STARTERS, wordPredictionStats
} from "./WordPredictionUtils";
import { SymbolEncodingType } from "./index.d";

vi.mock("./OllamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./OllamaApi")>();
  return { ...actual, queryChat: vi.fn() };
});

const mockedQueryChat = vi.mocked(queryChat);

describe("wordPrediction", (): void => {

  const message = (...labels: string[]): SymbolEncodingType[] =>
    labels.map((label) => ({ label, composition: 1840, modifierInfo: [] }));

  const predictedLabels = (currentLabels: string[], maxSuggestions = 4): string[] =>
    predictNext(currentLabels, maxSuggestions).map((payload) => payload.label);

  beforeEach((): void => {
    window.localStorage.removeItem(MESSAGE_LOG_KEY);
    adaptivePaletteGlobals.config.maxStoredRecords = 100;
  });

  afterEach((): void => {
    window.localStorage.removeItem(MESSAGE_LOG_KEY);
  });

  describe("with no saved messages", (): void => {
    test("the first word is offered from the seeded starters", (): void => {
      expect(predictedLabels([])).toEqual(SEED_STARTERS.slice(0, 4).map((seed) => seed.label));
    });

    test("the seeded starters carry a renderable composition", (): void => {
      predictNext([], 4).forEach((payload) => expect(payload.composition).toBeDefined());
    });

    test("a message in progress gets no suggestions", (): void => {
      expect(predictedLabels(["I"])).toEqual([]);
    });
  });

  describe("with saved messages", (): void => {
    beforeEach((): void => {
      saveMessageRecord(message("I", "want", "juice"));
      saveMessageRecord(message("I", "want", "music"));
      saveMessageRecord(message("I", "want", "juice"));
      saveMessageRecord(message("you", "help", "me"));
    });

    test("an unlabelled symbol is never suggested and never used as context", (): void => {
      saveMessageRecord([...message("I", "want"), { label: "  ", composition: 1840, modifierInfo: [] }]);
      expect(predictedLabels([]).includes("  ")).toBe(false);
      expect(predictedLabels(["I", "want"])).toEqual(predictedLabels(["I", "want", "  "]));
    });

    // A suggestion is handed to the caller, which edits it in place when the user applies a
    // modifier or an indicator: that must not reach back into the logged message.
    test("editing a suggestion leaves the logged message alone", (): void => {
      const suggestion = predictNext(["I", "want"], 4)[0];
      suggestion.modifierInfo?.push({ modifierId: 1291, modifierGloss: "big", isPrepended: true });
      suggestion.indicatorId = 99;

      const afterwards = predictNext(["I", "want"], 4)[0];
      expect(afterwards.modifierInfo).toEqual([]);
      expect(afterwards.indicatorId).toBeUndefined();
    });

    test("first words are ranked by how often they start a message", (): void => {
      expect(predictedLabels([])).toEqual(["I", "you"]);
    });

    test("the seeded starters are dropped once a message has been saved", (): void => {
      expect(predictedLabels([])).not.toContain("please");
    });

    test("what followed the last two words is offered first", (): void => {
      expect(predictedLabels(["I", "want"])[0]).toBe("juice");
    });

    test("a two-word match beats a one-word match", (): void => {
      saveMessageRecord(message("please", "want", "music"));
      saveMessageRecord(message("you", "want", "music"));
      saveMessageRecord(message("we", "want", "music"));
      // "music" now follows "want" more often overall, but "juice" follows "I want".
      expect(predictedLabels(["I", "want"])[0]).toBe("juice");
    });

    test("a one-word match is used when the two-word context is unknown", (): void => {
      expect(predictedLabels(["please", "want"])[0]).toBe("juice");
    });

    test("suggestions back off to the most used words when nothing follows the context", (): void => {
      expect(predictedLabels(["juice"]).length).toBeGreaterThan(0);
    });

    test("the word at the end of the message is not suggested back", (): void => {
      expect(predictedLabels(["juice"])).not.toContain("juice");
    });

    test("a label is never suggested twice", (): void => {
      const labels = predictedLabels(["I", "want"]);
      expect(new Set(labels).size).toBe(labels.length);
    });

    test("no more than maxSuggestions are returned", (): void => {
      expect(predictedLabels(["I", "want"], 2)).toHaveLength(2);
    });

    test("asking for no suggestions returns none", (): void => {
      expect(predictNext(["I", "want"], 0)).toEqual([]);
    });

    test("a word is predicted in the form it was last used", (): void => {
      const modified: SymbolEncodingType[] = [
        { label: "I", composition: 1840, modifierInfo: [] },
        { label: "want", composition: 1840, modifierInfo: [] },
        {
          label: "juices", composition: 1840, indicatorId: 99,
          baseLabel: "juice", modifierInfo: []
        }
      ];
      saveMessageRecord(modified);
      const suggestion = predictNext(["I", "want"], 4).find((payload) => payload.label === "juices");
      expect(suggestion?.indicatorId).toBe(99);
    });
  });
});

describe("wordPrediction with a model answering as well", (): void => {

  const message = (...labels: string[]): SymbolEncodingType[] =>
    labels.map((label) => ({ label, composition: 1840, modifierInfo: [] }));

  const MODEL_CONFIG = {
    show: true,
    maxSuggestions: 4,
    enableModelQuery: true,
    model: "phony-model:12b",
    systemPrompt: "List {{numWords}} words.",
    userPrompt: "Message so far: {{message}}"
  };

  // The reply the mocked Ollama gives back.
  const replyWith = (content: string): void => {
    mockedQueryChat.mockResolvedValue({ message: { content } } as unknown as Awaited<ReturnType<typeof queryChat>>);
  };

  beforeEach((): void => {
    mockedQueryChat.mockReset();
    window.localStorage.removeItem(MESSAGE_LOG_KEY);
    adaptivePaletteGlobals.config.maxStoredRecords = 100;
    adaptivePaletteGlobals.config.wordPrediction = { ...MODEL_CONFIG };
    adaptivePaletteGlobals.models = ["phony-model:12b"];
    wordPredictionStats.reset();
  });

  afterEach((): void => {
    window.localStorage.removeItem(MESSAGE_LOG_KEY);
    adaptivePaletteGlobals.config.wordPrediction = {
      show: false, maxSuggestions: 10, enableModelQuery: false, model: "", systemPrompt: "", userPrompt: ""
    };
    adaptivePaletteGlobals.models = [];
  });

  describe("isModelTierActive", (): void => {
    test("is active when the query is configured and Ollama has a model", (): void => {
      expect(isModelTierActive()).toBe(true);
    });

    test("is inactive when the query is turned off", (): void => {
      adaptivePaletteGlobals.config.wordPrediction.enableModelQuery = false;
      expect(isModelTierActive()).toBe(false);
    });

    // Ollama not running is the ordinary case, not a fault worth reporting.
    test("is inactive, silently, when Ollama has no models", (): void => {
      adaptivePaletteGlobals.models = [];
      expect(isModelTierActive()).toBe(false);
    });
  });

  describe("predictNext", (): void => {
    beforeEach((): void => {
      saveMessageRecord(message("I", "want", "juice"));
      saveMessageRecord(message("you", "help", "me"));
    });

    // The words used most often, whatever came before them, are the weakest evidence there
    // is. With a model answering, those slots go to it instead.
    test("only n-gram matches fill slots", (): void => {
      expect(predictNext(["you"], 4).map((payload) => payload.label)).toEqual(["help"]);
    });

    test("the widest tier comes back when the model is not answering", (): void => {
      adaptivePaletteGlobals.config.wordPrediction.enableModelQuery = false;
      expect(predictNext(["you"], 4)).toHaveLength(4);
    });
  });

  describe("parseModelWords", (): void => {
    test("takes one word per line", (): void => {
      expect(parseModelWords("food\ntea\nmusic")).toEqual(["food", "tea", "music"]);
    });

    test("strips list markers, quotes, trailing punctuation and case", (): void => {
      expect(parseModelWords("1. Food\n2) \"tea\"\n- Music,")).toEqual(["food", "tea", "music"]);
    });

    test("drops preamble, blank lines, phrases and repeats", (): void => {
      expect(parseModelWords("Here are the words:\n\nfood\nI think you want food\nfood\ntea"))
        .toEqual(["food", "tea"]);
    });

    test("an empty reply gives no words", (): void => {
      expect(parseModelWords("")).toEqual([]);
    });
  });

  describe("resolveWordPayload", (): void => {
    const historyPayload: SymbolEncodingType = {
      label: "juice", composition: 1840, indicatorId: 99, modifierInfo: []
    };
    const payloadByLabel = new Map<string, SymbolEncodingType>([["juice", historyPayload]]);

    test("a word the user has used keeps the form they used it in", (): void => {
      const { payload, rung } = resolveWordPayload("juice", payloadByLabel);
      expect(rung).toBe("history");
      expect(payload?.indicatorId).toBe(99);
    });

    test("a word matching a whole gloss takes that symbol", (): void => {
      const { payload, rung } = resolveWordPayload("food", payloadByLabel);
      expect(rung).toBe("exactGloss");
      expect(payload?.userSelectedSymbolId).toBe(329);
      expect(payload?.label).toBe("food");
    });

    // "drink" is one sense of "drink, beverage", not the verb "to drink".
    test("a word listed as one sense of a gloss takes that symbol", (): void => {
      const { payload, rung } = resolveWordPayload("drink", payloadByLabel);
      expect(rung).toBe("exactGloss");
      expect(payload?.userSelectedSymbolId).toBe(275);
      expect(payload?.label).toBe("drink");
    });

    // "water" is the first sense of "water, fluid, liquid" and the last of a coarser gloss.
    test("the gloss the word is the earliest sense of wins", (): void => {
      expect(resolveWordPayload("water", payloadByLabel).payload?.userSelectedSymbolId).toBe(695);
    });

    // "eat" is no gloss's own sense; "to eat" is the shortest gloss holding it.
    test("a word inside a longer gloss takes the shortest such gloss", (): void => {
      const { payload, rung } = resolveWordPayload("eat", payloadByLabel);
      expect(rung).toBe("wordInGloss");
      expect(payload?.userSelectedSymbolId).toBe(1588);
      expect(payload?.label).toBe("eat");
    });

    test("a word with no symbol at all is dropped", (): void => {
      const { payload, rung } = resolveWordPayload("zzzq", payloadByLabel);
      expect(rung).toBe("dropped");
      expect(payload).toBeUndefined();
    });
  });

  describe("rankModelWords", (): void => {
    beforeEach((): void => {
      saveMessageRecord(message("I", "want", "music"));
      saveMessageRecord(message("I", "want", "music"));
    });

    const rankedLabels = (words: string[], displayed: string[] = [], limit = 4): string[] =>
      rankModelWords(words, displayed, limit).map((payload) => payload.label);

    // "food" leads the reply, but the user actually uses "music".
    test("a word the user uses outranks one the model merely put first", (): void => {
      expect(rankedLabels(["food", "music"])).toEqual(["music", "food"]);
    });

    test("the model's own order stands when the user has used none of the words", (): void => {
      expect(rankedLabels(["food", "tea", "coffee"])).toEqual(["food", "tea", "coffee"]);
    });

    test("a word already in the row is not suggested twice", (): void => {
      expect(rankedLabels(["food", "tea"], ["Food"])).toEqual(["tea"]);
    });

    test("no more than the empty slots are filled", (): void => {
      expect(rankedLabels(["food", "tea", "coffee"], [], 2)).toHaveLength(2);
    });

    test("words with no symbol are left out", (): void => {
      expect(rankedLabels(["food", "zzzq"])).toEqual(["food"]);
    });

    // The drop rate is the evidence for whether a cleverer way of matching is worth building.
    test("the session totals count every word and how it was resolved", (): void => {
      rankModelWords(["music", "food", "eat", "zzzq"], [], 4);
      expect(wordPredictionStats.returned).toBe(4);
      expect(wordPredictionStats.resolved).toBe(3);
      expect(wordPredictionStats.byRung)
        .toEqual({ history: 1, exactGloss: 1, wordInGloss: 1, dropped: 1 });

      rankModelWords(["tea"], [], 4);
      expect(wordPredictionStats.returned).toBe(5);
      expect(wordPredictionStats.resolved).toBe(4);
    });
  });

  describe("requestModelWords", (): void => {
    test("renders both prompts and returns the words", async (): Promise<void> => {
      replyWith("food\ntea");
      const words = await requestModelWords("I want", 6);
      expect(words).toEqual(["food", "tea"]);
      const [userPrompt, model, streamed, systemPrompt] = mockedQueryChat.mock.calls[0];
      expect(userPrompt).toBe("Message so far: I want");
      expect(model).toBe("phony-model:12b");
      expect(streamed).toBe(false);
      expect(systemPrompt).toBe("List 6 words.");
    });

    test("refuses to query when the section is not configured for it", async (): Promise<void> => {
      adaptivePaletteGlobals.config.wordPrediction.enableModelQuery = false;
      await expect(requestModelWords("I want", 6)).rejects.toThrow(NOT_CONFIGURED_MESSAGE);
      expect(mockedQueryChat).not.toHaveBeenCalled();
    });

    test("reports that there is no model to ask", async (): Promise<void> => {
      adaptivePaletteGlobals.models = [];
      await expect(requestModelWords("I want", 6)).rejects.toThrow(NO_MODELS_MESSAGE);
    });
  });
});
