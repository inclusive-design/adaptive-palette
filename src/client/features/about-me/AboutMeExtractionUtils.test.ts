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
import { queryChat, NO_MODELS_MESSAGE } from "../../core/OllamaApi";
import { setTestConfig } from "../../testUtils/TestConfig";
import { seedMessageLog, resetMessageLog } from "../../testUtils/MessageLogTestUtils";
import { aboutMeSignal } from "./AboutMeState";
import {
  parseFactSuggestions, requestFactSuggestions, NOT_CONFIGURED_MESSAGE
} from "./AboutMeExtractionUtils";

vi.mock("../../core/OllamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../core/OllamaApi")>();
  return { ...actual, queryChat: vi.fn() };
});

const mockedQueryChat = vi.mocked(queryChat);

const CONFIG = {
  model: "phony-model:12b",
  systemPrompt: "Find facts.",
  userPrompt: "Messages:\n{{messages}}\nKnown: {{facts}}\nRejected: {{dismissed}}",
  messagesPerRun: 2
};

/**
 * A stored message: a single symbol, and the sentence the user chose when one is given.
 */
const record = (label: string, sentence?: string): unknown => ({
  timestamp: "2026-09-22T00:00:00.000Z",
  payloads: [{ label, composition: 1840, modifierInfo: [] }],
  ...(sentence ? { translation: { model: "m", candidates: [sentence], sentence, source: "chosen" } } : {})
});

const replyWith = (content: string): void => {
  mockedQueryChat.mockResolvedValue({ message: { content } } as never);
};

describe("parseFactSuggestions", (): void => {

  test("reads one fact per line", (): void => {
    expect(parseFactSuggestions("Family: has a dog named Rex\nPreferences: likes tea")).toEqual([
      { category: "Family", text: "has a dog named Rex" },
      { category: "Preferences", text: "likes tea" }
    ]);
  });

  test("strips list numbering and matches categories whatever their case", (): void => {
    expect(parseFactSuggestions("1. family: sister Ana\n- COMMUNICATION STYLE: short replies")).toEqual([
      { category: "Family", text: "sister Ana" },
      { category: "Communication style", text: "short replies" }
    ]);
  });

  test("files an unknown category under Other, keeping the whole line", (): void => {
    expect(parseFactSuggestions("Hobbies: plays chess")).toEqual([
      { category: "Other", text: "Hobbies: plays chess" }
    ]);
  });

  test("skips blank lines, preamble, and lines with no category", (): void => {
    expect(parseFactSuggestions("Here is what I found:\n\nlikes tea\nFamily:  ")).toEqual([]);
  });
});

describe("requestFactSuggestions", (): void => {

  const FACT = {
    id: "fact-1", category: "Family" as const, text: "has a dog named Rex",
    source: "manual" as const, addedAt: "2026-09-22T00:00:00.000Z"
  };

  beforeEach(async (): Promise<void> => {
    mockedQueryChat.mockReset();
    adaptivePaletteGlobals.models = ["phony-model:12b"];
    setTestConfig({ aboutMe: { ...CONFIG } });
    await seedMessageLog([record("old"), record("dog", "I walk my dog Rex."), record("tea")]);
    aboutMeSignal.value = { facts: [], dismissed: [], pending: [] };
  });

  test("sends the oldest batch, using the chosen sentence when there is one", async (): Promise<void> => {
    replyWith("");
    await requestFactSuggestions();
    expect(mockedQueryChat).toHaveBeenCalledWith(
      "Messages:\nold\nI walk my dog Rex.", "phony-model:12b", false, "Find facts."
    );
  });

  test("sends the known facts and the dismissed suggestions", async (): Promise<void> => {
    aboutMeSignal.value = {
      facts: [FACT], dismissed: [{ category: "Preferences", text: "likes cats" }], pending: []
    };
    replyWith("");
    await requestFactSuggestions();
    expect(mockedQueryChat.mock.calls[0][0]).toBe(
      "Messages:\nold\nI walk my dog Rex.\nKnown: Family: has a dog named Rex\nRejected: likes cats"
    );
  });

  test("keeps new suggestions as pending, dropping ones already known, dismissed, pending or repeated", async (): Promise<void> => {
    aboutMeSignal.value = {
      facts: [FACT],
      dismissed: [{ category: "Preferences", text: "likes cats" }],
      pending: [{ category: "Family", text: "sister Ana" }]
    };
    replyWith([
      "Family: has a dog named Rex", "Preferences: Likes cats", "Family: Sister Ana",
      "Preferences: likes tea", "Preferences: likes tea"
    ].join("\n"));
    expect(await requestFactSuggestions()).toEqual({ status: "learnt", found: 1, hasMore: true });
    expect(aboutMeSignal.value.pending).toEqual([
      { category: "Family", text: "sister Ana" }, { category: "Preferences", text: "likes tea" }
    ]);
  });

  test("moves the watermark to the last message read, even with nothing suggested", async (): Promise<void> => {
    replyWith("");
    expect(await requestFactSuggestions()).toEqual({ status: "learnt", found: 0, hasMore: true });
    expect(aboutMeSignal.value.learntUpTo).toEqual({ id: 2, timestamp: "2026-09-22T00:00:00.000Z" });
  });

  test("the next run reads only the messages after the last one read", async (): Promise<void> => {
    replyWith("");
    await requestFactSuggestions();
    expect(await requestFactSuggestions()).toEqual({ status: "learnt", found: 0, hasMore: false });
    expect(mockedQueryChat.mock.calls[1][0]).toBe("Messages:\ntea");
    expect(aboutMeSignal.value.learntUpTo?.id).toBe(3);
  });

  test("says it is up to date, without asking the model, when there is nothing new", async (): Promise<void> => {
    aboutMeSignal.value = {
      facts: [], dismissed: [], pending: [], learntUpTo: { id: 3, timestamp: "2026-09-22T00:00:00.000Z" }
    };
    expect(await requestFactSuggestions()).toEqual({ status: "upToDate" });
    expect(mockedQueryChat).not.toHaveBeenCalled();
  });

  test("says it is up to date when no message has been saved", async (): Promise<void> => {
    await resetMessageLog();
    expect(await requestFactSuggestions()).toEqual({ status: "upToDate" });
    expect(mockedQueryChat).not.toHaveBeenCalled();
  });

  test("moves past messages with no text without asking the model", async (): Promise<void> => {
    await seedMessageLog([record(" "), record("")]);
    expect(await requestFactSuggestions()).toEqual({ status: "learnt", found: 0, hasMore: true });
    expect(mockedQueryChat).not.toHaveBeenCalled();
    expect(aboutMeSignal.value.learntUpTo?.id).toBe(2);
  });

  test("leaves the watermark where it was when the model fails", async (): Promise<void> => {
    mockedQueryChat.mockRejectedValue(new Error("Ollama is not running."));
    await expect(requestFactSuggestions()).rejects.toThrow("Ollama is not running.");
    expect(aboutMeSignal.value.learntUpTo).toBeUndefined();
  });

  test("a call made while a run is in progress shares that run", async (): Promise<void> => {
    replyWith("Preferences: likes tea");
    const [first, second] = await Promise.all([requestFactSuggestions(), requestFactSuggestions()]);
    expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(aboutMeSignal.value.pending).toEqual([{ category: "Preferences", text: "likes tea" }]);
  });

  test("rejects when the section is not configured", async (): Promise<void> => {
    setTestConfig({});
    await expect(requestFactSuggestions()).rejects.toThrow(NOT_CONFIGURED_MESSAGE);
    expect(mockedQueryChat).not.toHaveBeenCalled();
  });

  test("rejects when there is no model to ask", async (): Promise<void> => {
    adaptivePaletteGlobals.models = [];
    await expect(requestFactSuggestions()).rejects.toThrow(NO_MODELS_MESSAGE);
    expect(aboutMeSignal.value.learntUpTo).toBeUndefined();
  });
});
