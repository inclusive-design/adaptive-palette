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
import { batch } from "@preact/signals";
import { adaptivePaletteGlobals, changeEncodingContents } from "../../state/GlobalData";
import { DISABLED_MODEL_QUERY } from "../../core/Config";
import { MESSAGE_LOG_KEY, saveMessageRecord } from "../../core/MessageLog";
import { queryChat } from "../../core/OllamaApi";
import {
  DEBOUNCE_MS, contextKeyOf, dismissModelStatus, modelWordsSignal, showModelStatusSignal
} from "./WordPredictionState";
import { discardEditPromptSignal } from "../telegraphic-translation/TelegraphicTranslationState";
import { SymbolEncodingType } from "../../index.d";

vi.mock("../../core/OllamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../core/OllamaApi")>();
  return { ...actual, queryChat: vi.fn() };
});

const mockedQueryChat = vi.mocked(queryChat);

describe("wordPrediction model query", (): void => {

  const message = (...labels: string[]): SymbolEncodingType[] =>
    labels.map((label) => ({ label, composition: 1840, modifierInfo: [] }));

  /**
   * Put a message in the input area, with the caret at its end, as composing one does.
   */
  const compose = (...labels: string[]): void => {
    const payloads = message(...labels);
    changeEncodingContents.value = { payloads, caretPosition: payloads.length - 1 };
  };

  const replyWith = (content: string): void => {
    mockedQueryChat.mockResolvedValue({ message: { content } } as unknown as Awaited<ReturnType<typeof queryChat>>);
  };

  /**
   * Let the debounce expire and the query settle.
   */
  const waitForQuery = async (): Promise<void> => {
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    await vi.advanceTimersByTimeAsync(0);
  };

  beforeEach((): void => {
    vi.useFakeTimers();
    mockedQueryChat.mockReset();
    replyWith("food\ntea\ncoffee");
    window.localStorage.removeItem(MESSAGE_LOG_KEY);
    adaptivePaletteGlobals.config.maxStoredRecords = 100;
    adaptivePaletteGlobals.config.wordPrediction = {
      show: true,
      maxSuggestions: 4,
      enableModelQuery: true,
      model: "phony-model:12b",
      systemPrompt: "List {{numWords}} words.",
      userPrompt: "Message so far: {{message}}"
    };
    adaptivePaletteGlobals.models = ["phony-model:12b"];
    // One saved message, so "I" has a follower and the row still has empty slots.
    saveMessageRecord(message("I", "want", "music"));
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  afterEach((): void => {
    discardEditPromptSignal.value = null;
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
    vi.useRealTimers();
    window.localStorage.removeItem(MESSAGE_LOG_KEY);
    adaptivePaletteGlobals.config.wordPrediction = {
      show: false, maxSuggestions: 10, ...DISABLED_MODEL_QUERY
    };
    adaptivePaletteGlobals.models = [];
  });

  test("the context is the labels up to the caret", (): void => {
    expect(contextKeyOf(message("I", "want", "music"), 1)).toBe("I want");
    expect(contextKeyOf(message("I", "  ", "music"), 2)).toBe("I music");
  });

  test("the model's words are published for the message they answer", async (): Promise<void> => {
    compose("I");
    await waitForQuery();
    const state = modelWordsSignal.peek();
    expect(state.status).toBe("ready");
    expect(state.status === "ready" && state.contextKey).toBe("I");
    expect(state.status === "ready" && state.payloads.map((payload) => payload.label))
      .toEqual(["food", "tea", "coffee"]);
  });

  // "want" is in the history, so it would otherwise resolve to a symbol and be offered again.
  test("the word at the caret is not suggested back", async (): Promise<void> => {
    replyWith("want\nfood\ntea");
    compose("I", "want");
    await waitForQuery();
    const state = modelWordsSignal.peek();
    expect(state.status === "ready" && state.payloads.map((payload) => payload.label))
      .toEqual(["food", "tea"]);
  });

  // A user placing symbols quickly must not be sending a query per symbol.
  test("a run of changes inside the wait costs one query", async (): Promise<void> => {
    compose("I");
    await vi.advanceTimersByTimeAsync(100);
    compose("I", "want");
    await vi.advanceTimersByTimeAsync(100);
    compose("I", "want", "music");
    await waitForQuery();
    expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    expect(mockedQueryChat.mock.calls[0][0]).toBe("Message so far: I want music");
  });

  test("changing the message throws away the words that answered the old one", async (): Promise<void> => {
    compose("I");
    await waitForQuery();
    expect(modelWordsSignal.peek().status).toBe("ready");

    compose("I", "want");
    expect(modelWordsSignal.peek().status).toBe("idle");
  });

  test("a reply for a message the user has moved past is not shown", async (): Promise<void> => {
    let settleFirstReply = (): void => undefined;
    mockedQueryChat.mockImplementationOnce(() => new Promise((resolve) => {
      settleFirstReply = () => resolve({ message: { content: "food\ntea" } } as unknown as Awaited<ReturnType<typeof queryChat>>);
    }));

    compose("I");
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    compose("I", "want");
    settleFirstReply();
    await vi.advanceTimersByTimeAsync(0);

    expect(modelWordsSignal.peek().status).toBe("idle");
  });

  test("a failed query leaves the row as the history left it", async (): Promise<void> => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockedQueryChat.mockRejectedValue(new Error("Ollama is not running"));
    compose("I");
    await waitForQuery();
    expect(modelWordsSignal.peek().status).toBe("idle");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  test("a reply with no usable word shows nothing", async (): Promise<void> => {
    replyWith("Here are some words:");
    compose("I");
    await waitForQuery();
    expect(modelWordsSignal.peek().status).toBe("idle");
  });

  describe("no query is sent", (): void => {
    test("when the model query is turned off", async (): Promise<void> => {
      adaptivePaletteGlobals.config.wordPrediction.enableModelQuery = false;
      compose("I");
      await waitForQuery();
      expect(mockedQueryChat).not.toHaveBeenCalled();
    });

    test("when Ollama has no model to ask", async (): Promise<void> => {
      adaptivePaletteGlobals.models = [];
      compose("I");
      await waitForQuery();
      expect(mockedQueryChat).not.toHaveBeenCalled();
    });

    test("when the suggestion row is hidden", async (): Promise<void> => {
      adaptivePaletteGlobals.config.wordPrediction.show = false;
      compose("I");
      await waitForQuery();
      expect(mockedQueryChat).not.toHaveBeenCalled();
    });

    test("when the message is empty", async (): Promise<void> => {
      changeEncodingContents.value = { payloads: [], caretPosition: -1 };
      await waitForQuery();
      expect(mockedQueryChat).not.toHaveBeenCalled();
    });

    test("when the history filled every slot", async (): Promise<void> => {
      adaptivePaletteGlobals.config.wordPrediction.maxSuggestions = 1;
      compose("I");
      await waitForQuery();
      expect(mockedQueryChat).not.toHaveBeenCalled();
    });
  });

  describe("finishing the message", (): void => {

    test("stops the status report and keeps the words already suggested", async (): Promise<void> => {
      compose("I");
      await waitForQuery();
      expect(modelWordsSignal.value.status).toBe("ready");

      dismissModelStatus();
      expect(showModelStatusSignal.value).toBe(false);
      expect(modelWordsSignal.value.status).toBe("ready");
    });

    test("stops a query that has not been sent yet", async (): Promise<void> => {
      compose("I");
      dismissModelStatus();
      await waitForQuery();
      expect(mockedQueryChat).not.toHaveBeenCalled();
    });

    test("the next change to the message reports again", async (): Promise<void> => {
      compose("I");
      dismissModelStatus();
      compose("I", "want");
      expect(showModelStatusSignal.value).toBe(true);
      await waitForQuery();
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });
  });

  // The telegraphic-translation discard dialog holds an edit back: the edit reaches
  // `changeEncodingContents` first, then the module's own effect reverts it, batched with
  // raising the question -- see `TelegraphicTranslationState.ts`. Word prediction must
  // treat neither write as a message the user has agreed to.
  describe("while the discard dialog is asking", (): void => {

    /**
     * Reproduce the two writes the real effect makes: the edit landing on the signal on its
     * own, then the module's batched revert alongside raising the question.
     */
    const editThenRevert = (): void => {
      compose("I", "want");
      batch((): void => {
        discardEditPromptSignal.value = "Change your message?";
        compose("I");
      });
    };

    test("no status and no query, for the edit or for the module's own revert of it", async (): Promise<void> => {
      compose("I");
      await waitForQuery();
      dismissModelStatus();
      mockedQueryChat.mockClear();

      editThenRevert();

      expect(showModelStatusSignal.value).toBe(false);
      expect(modelWordsSignal.value.status).toBe("idle");
      await waitForQuery();
      expect(mockedQueryChat).not.toHaveBeenCalled();
    });

    test("keeping the sentences leaves prediction settled on the unchanged message", async (): Promise<void> => {
      compose("I");
      await waitForQuery();
      dismissModelStatus();
      mockedQueryChat.mockClear();

      editThenRevert();
      discardEditPromptSignal.value = null;

      await waitForQuery();
      expect(mockedQueryChat).not.toHaveBeenCalled();
      expect(modelWordsSignal.value.status).toBe("idle");
    });

    test("changing anyway starts prediction for the edit that was applied", async (): Promise<void> => {
      compose("I");
      await waitForQuery();
      dismissModelStatus();
      mockedQueryChat.mockClear();

      editThenRevert();
      batch((): void => {
        discardEditPromptSignal.value = null;
        compose("I", "want");
      });

      expect(showModelStatusSignal.value).toBe(true);
      await waitForQuery();
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });
  });

  test("the number of words asked for covers the empty slots and the drops", async (): Promise<void> => {
    compose("I");
    await waitForQuery();
    // Three slots left after the history's one suggestion.
    expect(mockedQueryChat.mock.calls[0][3]).toBe("List 6 words.");
  });
});
