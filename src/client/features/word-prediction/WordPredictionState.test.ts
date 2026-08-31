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
import { adaptivePaletteGlobals, changeEncodingContents, finishedMessageSignal } from "../../state/GlobalData";
import { DISABLED_MODEL_QUERY } from "../../core/Config";
import { saveMessageRecord } from "../../core/MessageLog";
import { editMessage, setEditGuard } from "../../core/MessageEdit";
import { queryChat } from "../../core/OllamaApi";
import { DEBOUNCE_MS, messageUpToCaret, queryContextKeyOf, modelWordsSignal } from "./WordPredictionState";
import {
  cancelDiscardEdit, confirmDiscardEdit, discardEditPromptSignal, guardEdit,
  IDLE_SENTENCE_STATE, READY_DISCARD_PROMPT, sentenceCompletionsSignal
} from "../telegraphic-translation/TelegraphicTranslationState";
import {
  selectedAttributesSignal, clearAttributes
} from "../message-attributes/MessageAttributesState";
import { SymbolEncodingType } from "../../index.d";
import { resetMessageLog } from "../../testUtils/MessageLogTestUtils";

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
    editMessage({ payloads, caretPosition: payloads.length - 1 });
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

  beforeEach(async (): Promise<void> => {
    vi.useFakeTimers();
    mockedQueryChat.mockReset();
    replyWith("food\ntea\ncoffee");
    await resetMessageLog();
    adaptivePaletteGlobals.config.maxRecalledRecords = 100;
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
    finishedMessageSignal.value = "";
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  afterEach(async (): Promise<void> => {
    setEditGuard(null);
    finishedMessageSignal.value = "";
    // Cleared before the input area below, so emptying that is not read as an edit that
    // would discard sentences and raise a question in the next test.
    sentenceCompletionsSignal.value = IDLE_SENTENCE_STATE;
    discardEditPromptSignal.value = null;
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
    vi.useRealTimers();
    await resetMessageLog();
    adaptivePaletteGlobals.config.wordPrediction = {
      show: false, maxSuggestions: 10, ...DISABLED_MODEL_QUERY
    };
    adaptivePaletteGlobals.models = [];
    clearAttributes();
  });

  test("the context is the labels up to the caret", (): void => {
    expect(messageUpToCaret(message("I", "want", "music"), 1)).toBe("I want");
    expect(messageUpToCaret(message("I", "  ", "music"), 2)).toBe("I music");
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

    // The caret sits before any symbol, so there is nothing before it to predict from, even
    // though the message on screen (and so the combined key, with an attribute set) is not
    // empty. The guard has to test the text up to the caret, not the combined key.
    test("when there is nothing before the caret even with an attribute set", async (): Promise<void> => {
      changeEncodingContents.value = { payloads: message("juice"), caretPosition: -1 };
      selectedAttributesSignal.value = [
        { category: "Feeling", label: "angry", composition: 1198 }
      ];
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

    test("stops reporting and keeps the words already suggested", async (): Promise<void> => {
      compose("I");
      await waitForQuery();
      expect(modelWordsSignal.value.status).toBe("ready");

      finishedMessageSignal.value = "I";
      expect(modelWordsSignal.value.status).toBe("ready");
    });

    test("stops a query that has not been sent yet", async (): Promise<void> => {
      compose("I");
      finishedMessageSignal.value = "I";
      await waitForQuery();
      expect(mockedQueryChat).not.toHaveBeenCalled();
    });

    // The caret is not part of the message, so moving it does not un-finish one.
    test("moving the caret in a finished message asks for nothing", async (): Promise<void> => {
      compose("I", "want");
      await waitForQuery();
      finishedMessageSignal.value = "I want";
      mockedQueryChat.mockClear();

      const { payloads } = changeEncodingContents.value;
      changeEncodingContents.value = { payloads, caretPosition: 0 };

      await waitForQuery();
      expect(mockedQueryChat).not.toHaveBeenCalled();
    });

    test("the next change to the message asks again", async (): Promise<void> => {
      compose("I");
      finishedMessageSignal.value = "I";
      compose("I", "want");
      expect(finishedMessageSignal.value).toBe("");
      await waitForQuery();
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });

    // A message said once is often said again. Building it back up must predict as normal
    // rather than stay silent because an identical message was finished earlier.
    test("a message said before predicts again when it is rebuilt", async (): Promise<void> => {
      compose("I", "want");
      finishedMessageSignal.value = "I want";
      mockedQueryChat.mockClear();

      changeEncodingContents.value = { payloads: [], caretPosition: -1 };
      compose("I");
      compose("I", "want");

      await waitForQuery();
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });
  });

  // Telegraphic translation holds an edit back while it asks whether the sentence work may be
  // thrown away. Word prediction knows nothing about that: a held edit is never published, so
  // this effect does not run until the user has answered. These tests register that feature's
  // real guard rather than a stand-in, because what is being checked is what word prediction
  // does against a real held edit -- the one place the two features meet.
  describe("while the discard dialog is asking", (): void => {

    // The sentences on screen were made from "I", so the edit to "I want" below is a different
    // message and the guard holds it. A `telegraphicMessage` matching the edit would let it
    // straight through and there would be no question to test against.
    const SENTENCE_STATE = {
      status: "ready" as const,
      sentences: ["I want food."],
      recalledSentence: null,
      model: "phony-model:12b",
      telegraphicMessage: "I"
    };

    beforeEach((): void => {
      setEditGuard(guardEdit);
    });

    afterEach((): void => {
      setEditGuard(null);
      cancelDiscardEdit();
    });

    /**
     * Put sentences for the message on screen, then edit it. The gate holds the edit and puts
     * the question up, exactly as a symbol cell would.
     */
    const raiseQuestion = (): void => {
      sentenceCompletionsSignal.value = SENTENCE_STATE;
      compose("I", "want");
    };

    test("nothing is asked for while the question is on screen", async (): Promise<void> => {
      compose("I");
      await waitForQuery();
      finishedMessageSignal.value = "I";
      mockedQueryChat.mockClear();

      raiseQuestion();
      expect(discardEditPromptSignal.value).toBe(READY_DISCARD_PROMPT);

      await waitForQuery();
      expect(mockedQueryChat).not.toHaveBeenCalled();
    });

    test("keeping the sentences asks for nothing and keeps the words", async (): Promise<void> => {
      compose("I");
      await waitForQuery();
      expect(modelWordsSignal.value.status).toBe("ready");
      finishedMessageSignal.value = "I";
      mockedQueryChat.mockClear();

      raiseQuestion();
      cancelDiscardEdit();

      await waitForQuery();
      expect(mockedQueryChat).not.toHaveBeenCalled();
      expect(modelWordsSignal.value.status).toBe("ready");
      expect(finishedMessageSignal.value).toBe("I");
    });

    test("changing anyway starts prediction for the edit that was applied", async (): Promise<void> => {
      compose("I");
      await waitForQuery();
      finishedMessageSignal.value = "I";
      mockedQueryChat.mockClear();

      raiseQuestion();
      confirmDiscardEdit();

      expect(changeEncodingContents.value.payloads.map((payload) => payload.label))
        .toEqual(["I", "want"]);
      expect(finishedMessageSignal.value).toBe("");
      await waitForQuery();
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });

    // Asked twice: a held edit that was refused leaves `pendingContents` and the prompt to be
    // cleared, and the message it was measured against still on screen. The second round is
    // what shows that cleanup was complete enough for the next edit to be caught the same way.
    test("a second question still leaves the words on the row", async (): Promise<void> => {
      compose("I");
      await waitForQuery();
      expect(modelWordsSignal.value.status).toBe("ready");

      for (let question = 0; question < 2; question++) {
        raiseQuestion();
        expect(discardEditPromptSignal.value).toBe(READY_DISCARD_PROMPT);
        cancelDiscardEdit();
      }

      expect(modelWordsSignal.value.status).toBe("ready");
    });
  });

  test("the number of words asked for covers the empty slots and the drops", async (): Promise<void> => {
    compose("I");
    await waitForQuery();
    // Three slots left after the history's one suggestion.
    expect(mockedQueryChat.mock.calls[0][3]).toBe("List 6 words.");
  });

  describe("queryContextKeyOf", (): void => {

    const payloads = [
      { label: "I", composition: 1840, modifierInfo: [] },
      { label: "want", composition: 2705, modifierInfo: [] }
    ];

    test("is the message text alone when no attribute is set", (): void => {
      expect(queryContextKeyOf("I want")).toBe("I want");
    });

    test("changes when an attribute is set", (): void => {
      const withoutAttributes = queryContextKeyOf("I want");
      selectedAttributesSignal.value = [
        { category: "Feeling", label: "angry", composition: 1198 }
      ];
      expect(queryContextKeyOf("I want")).not.toBe(withoutAttributes);
    });

    test("the message text itself is unchanged by the attributes", (): void => {
      selectedAttributesSignal.value = [
        { category: "Feeling", label: "angry", composition: 1198 }
      ];
      expect(messageUpToCaret(payloads, 1)).toBe("I want");
    });

    test("two different attribute sets give two different keys", (): void => {
      selectedAttributesSignal.value = [
        { category: "Feeling", label: "angry", composition: 1198 }
      ];
      const angry = queryContextKeyOf("I want");
      selectedAttributesSignal.value = [
        { category: "Feeling", label: "happy", composition: 1780 }
      ];
      expect(queryContextKeyOf("I want")).not.toBe(angry);
    });

    // The effect must read the attributes on this run -- the one that schedules a query -- so
    // it stays subscribed and a later attribute change is noticed. See "setting an attribute
    // after finishing keeps the words on the row" in `PredictedWords.test.ts` for the early
    // return path, where the read has to happen before the return rather than after it.
    test("setting an attribute after suggestions are shown asks again", async (): Promise<void> => {
      compose("I");
      await waitForQuery();
      expect(modelWordsSignal.value.status).toBe("ready");
      mockedQueryChat.mockClear();

      selectedAttributesSignal.value = [
        { category: "Feeling", label: "angry", composition: 1198 }
      ];

      await waitForQuery();
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
      // The model is asked about the message alone -- the attributes reach it as their own
      // prompt line, not folded into the text the model reads as the message.
      expect(mockedQueryChat.mock.calls[0][0]).toBe("Message so far: I");
    });
  });
});
