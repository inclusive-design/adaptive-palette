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

import { vi, type MockInstance } from "vitest";
import { waitFor } from "@testing-library/preact";

import { adaptivePaletteGlobals, changeEncodingContents } from "../../state/GlobalData";
import { setTestConfig } from "../../testUtils/TestConfig";
import {
  abortActiveSentenceRequest, clearMessageAndChoices, currentTelegraphicMessage, IDLE_SENTENCE_STATE, makeSentences,
  sentenceCompletionsSignal, READY_DISCARD_PROMPT, WORKING_DISCARD_PROMPT
} from "./TelegraphicTranslationState";
import { MESSAGE_LOG_KEY, readMessageLog, saveMessageRecord, saveTranslation } from "../../core/MessageLog";
import { queryChat } from "../../core/OllamaApi";
import { mockedSpeak } from "../../testUtils/SpeechUtilsMock";

vi.mock("../../core/OllamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../core/OllamaApi")>();
  return { ...actual, queryChat: vi.fn() };
});

vi.mock("../../utils/SpeechUtils");

const mockedQueryChat = vi.mocked(queryChat);

describe("telegraphicTranslationState", (): void => {

  const INPUT_CONTENTS = {
    payloads: [
      { label: "me", composition: [124], modifierInfo: [] },
      { label: "hungry", composition: [125], modifierInfo: [] }
    ],
    caretPosition: 2
  };

  const EDITED_CONTENTS = {
    payloads: [{ label: "later", composition: [126], modifierInfo: [] }],
    caretPosition: 1
  };

  const setConfig = (numSentences: number): void => {
    setTestConfig({
      telegraphicTranslation: {
        model: "phony-model:12b",
        numSentences,
        systemPrompt: "Give {{numSentences}} sentences.",
        userPrompt: "Telegraphic message: {{telegraphicMessage}}"
      }
    });
  };

  // Mirrors what the button does: translate whatever is in the input area right now.
  const requestForCurrentMessage = (): Promise<void> => makeSentences(currentTelegraphicMessage());

  // Every edit to the input message when a request is in flight asks the user to confirm the discard.
  // Mock the case when the discard is accepted so the tests can focus on the button behavior.
  let mockedConfirm: MockInstance<(message?: string) => boolean>;

  beforeEach((): void => {
    mockedConfirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    mockedQueryChat.mockReset();
    window.localStorage.removeItem(MESSAGE_LOG_KEY);
    adaptivePaletteGlobals.models = ["phony-model:12b"];
    setConfig(3);
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
    sentenceCompletionsSignal.value = IDLE_SENTENCE_STATE;
  });

  afterEach((): void => {
    sentenceCompletionsSignal.value = IDLE_SENTENCE_STATE;
    window.localStorage.removeItem(MESSAGE_LOG_KEY);
    mockedConfirm.mockRestore();
  });

  test("currentTelegraphicMessage joins the symbol labels with spaces", (): void => {
    changeEncodingContents.value = INPUT_CONTENTS;
    expect(currentTelegraphicMessage()).toBe("me hungry");
  });

  test("currentTelegraphicMessage skips symbols with a blank label", (): void => {
    changeEncodingContents.value = {
      payloads: [
        { label: "me", composition: [124], modifierInfo: [] },
        { label: "", composition: [125], modifierInfo: [] },
        { label: "  ", composition: [126], modifierInfo: [] },
        { label: "hungry", composition: [127], modifierInfo: [] }
      ],
      caretPosition: 4
    };
    expect(currentTelegraphicMessage()).toBe("me hungry");
  });

  test("clearMessageAndChoices empties the input area and the sentences", (): void => {
    changeEncodingContents.value = INPUT_CONTENTS;
    sentenceCompletionsSignal.value = {
      status: "ready", sentences: ["I am hungry."], model: "phony-model:12b",
      telegraphicMessage: "me hungry"
    };

    clearMessageAndChoices();

    expect(changeEncodingContents.value).toEqual({ payloads: [], caretPosition: -1 });
    expect(sentenceCompletionsSignal.value).toEqual(IDLE_SENTENCE_STATE);
    expect(mockedConfirm).not.toHaveBeenCalled();
  });

  test("an empty message does not query", async (): Promise<void> => {
    await requestForCurrentMessage();

    expect(mockedQueryChat).not.toHaveBeenCalled();
    expect(sentenceCompletionsSignal.value).toEqual(IDLE_SENTENCE_STATE);
  });

  test("a whitespace-only message does not query", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [{ label: " ", composition: [124], modifierInfo: [] }],
      caretPosition: 1
    };

    await requestForCurrentMessage();

    expect(mockedQueryChat).not.toHaveBeenCalled();
    expect(sentenceCompletionsSignal.value).toEqual(IDLE_SENTENCE_STATE);
  });

  test("a request queries with the joined labels and publishes the sentences", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockResolvedValue({
      message: { content: "1. I am hungry.\n2. I want food." }
    } as never);

    await requestForCurrentMessage();

    expect(sentenceCompletionsSignal.value).toEqual({
      status: "ready",
      sentences: ["I am hungry.", "I want food."],
      model: "phony-model:12b",
      telegraphicMessage: "me hungry"
    });
    expect(mockedQueryChat).toHaveBeenCalledWith(
      "Telegraphic message: me hungry", "phony-model:12b", false, "Give 3 sentences.",
      expect.any(AbortSignal)
    );
  });

  test("a failed query publishes the error state", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockRejectedValue(new Error("connection refused"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await requestForCurrentMessage();

    expect(sentenceCompletionsSignal.value.status).toBe("error");
    consoleErrorSpy.mockRestore();
  });

  test("editing the message clears the error state without asking", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockRejectedValue(new Error("connection refused"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await requestForCurrentMessage();
    expect(sentenceCompletionsSignal.value.status).toBe("error");

    changeEncodingContents.value = {
      payloads: [{ label: "me", composition: [124], modifierInfo: [] }],
      caretPosition: 1
    };

    expect(sentenceCompletionsSignal.value).toEqual(IDLE_SENTENCE_STATE);
    expect(mockedConfirm).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  test("with numSentences 1 the sentence is spoken and logged immediately as auto", async (): Promise<void> => {
    setConfig(1);
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockResolvedValue({ message: { content: "1. I am hungry." } } as never);

    await requestForCurrentMessage();

    expect(readMessageLog()).toHaveLength(1);
    expect(readMessageLog()[0].translation).toMatchObject({
      sentence: "I am hungry.",
      source: "auto"
    });
    expect(mockedSpeak).toHaveBeenCalledWith("I am hungry.");
  });

  test("with numSentences above 1 nothing is logged until the user picks", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockResolvedValue({
      message: { content: "1. I am hungry.\n2. I want food." }
    } as never);

    await requestForCurrentMessage();

    expect(sentenceCompletionsSignal.value.status).toBe("ready");
    expect(readMessageLog()).toEqual([]);
  });

  test("a second request while one is in flight does not start another", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    let resolveQuery: (value: unknown) => void = () => undefined;
    mockedQueryChat.mockReturnValue(new Promise((resolve) => {
      resolveQuery = resolve;
    }) as never);

    const firstRequest = requestForCurrentMessage();
    await waitFor(() => {
      expect(sentenceCompletionsSignal.value.status).toBe("working");
    });
    await requestForCurrentMessage();

    expect(mockedQueryChat).toHaveBeenCalledTimes(1);

    resolveQuery({ message: { content: "1. I am hungry." } });
    await firstRequest;
    expect(sentenceCompletionsSignal.value.status).toBe("ready");
  });

  test("editing the message while a request is in flight returns to idle", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    let resolveQuery: (value: unknown) => void = () => undefined;
    mockedQueryChat.mockReturnValue(new Promise((resolve) => {
      resolveQuery = resolve;
    }) as never);

    const request = requestForCurrentMessage();
    await waitFor(() => {
      expect(sentenceCompletionsSignal.value.status).toBe("working");
    });

    // The user swaps a symbol while the model is still thinking. The state must clear now,
    // not when the abandoned query eventually settles: the button reads this signal to decide
    // whether it is available, and a stale `working` leaves it unavailable with nothing on
    // screen explaining itself.
    changeEncodingContents.value = EDITED_CONTENTS;

    expect(sentenceCompletionsSignal.value.status).toBe("idle");

    resolveQuery({ message: { content: "1. I am hungry." } });
    await request;
  });

  test("a reply for a message the user has since changed is discarded", async (): Promise<void> => {
    setConfig(1);
    changeEncodingContents.value = INPUT_CONTENTS;
    let resolveQuery: (value: unknown) => void = () => undefined;
    mockedQueryChat.mockReturnValue(new Promise((resolve) => {
      resolveQuery = resolve;
    }) as never);

    const request = requestForCurrentMessage();
    await waitFor(() => {
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });

    // The user edits the message while the model is thinking. The sentences coming back
    // are for a message that is no longer on screen: they must not be shown, spoken, or
    // logged.
    changeEncodingContents.value = EDITED_CONTENTS;
    expect(sentenceCompletionsSignal.value.status).toBe("idle");

    resolveQuery({ message: { content: "1. I am hungry." } });
    await request;

    expect(sentenceCompletionsSignal.value.status).toBe("idle");
    expect(mockedSpeak).not.toHaveBeenCalled();
    expect(readMessageLog()).toEqual([]);
  });

  test("a reply arriving after a newer request started does not hijack it", async (): Promise<void> => {
    setConfig(1);
    changeEncodingContents.value = INPUT_CONTENTS;
    const resolvers: ((value: unknown) => void)[] = [];
    mockedQueryChat.mockImplementation(
      () => new Promise((resolve) => {
        resolvers.push(resolve);
      }) as never
    );

    const firstRequest = requestForCurrentMessage();
    await waitFor(() => {
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });

    // Editing abandons request 1 and returns to idle, which is what makes a second
    // overlapping request reachable at all.
    changeEncodingContents.value = EDITED_CONTENTS;
    expect(sentenceCompletionsSignal.value.status).toBe("idle");

    const secondRequest = requestForCurrentMessage();
    await waitFor(() => {
      expect(mockedQueryChat).toHaveBeenCalledTimes(2);
    });

    // Request 1 finally answers. Its message is long gone, and the status is `working` again
    // for request 2, so a status-only guard would let it through and speak it.
    resolvers[0]({ message: { content: "1. I am hungry." } });
    await firstRequest;

    expect(sentenceCompletionsSignal.value.status).toBe("working");
    expect(mockedSpeak).not.toHaveBeenCalled();
    expect(readMessageLog()).toEqual([]);

    resolvers[1]({ message: { content: "1. Later." } });
    await secondRequest;
  });

  test("choices for a message are discarded when that message is edited", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockResolvedValue({
      message: { content: "1. I am hungry.\n2. I want food." }
    } as never);

    await requestForCurrentMessage();
    expect(sentenceCompletionsSignal.value.status).toBe("ready");

    // Deleting a single symbol, as `CommandDelLastEncoding` does, leaves a different
    // message behind; sentences made from the old one are still tappable until dropped.
    changeEncodingContents.value = {
      payloads: [INPUT_CONTENTS.payloads[0]],
      caretPosition: 0
    };

    expect(sentenceCompletionsSignal.value.status).toBe("idle");
  });

  test("editing the message aborts the request it was made for", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    // A query that never settles: the abort has to be what ends it.
    mockedQueryChat.mockReturnValue(new Promise(() => undefined) as never);

    void requestForCurrentMessage();
    await waitFor(() => {
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });

    const signal = mockedQueryChat.mock.calls[0][4] as AbortSignal;
    expect(signal.aborted).toBe(false);

    changeEncodingContents.value = EDITED_CONTENTS;

    expect(signal.aborted).toBe(true);
  });

  test("an aborted request is not reported as an error", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    let rejectQuery: (reason: unknown) => void = () => undefined;
    mockedQueryChat.mockReturnValue(new Promise((resolve, reject) => {
      rejectQuery = reject;
    }) as never);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = requestForCurrentMessage();
    await waitFor(() => {
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });

    changeEncodingContents.value = EDITED_CONTENTS;
    // The aborted fetch rejects. Editing the message is normal use, not a failure, so it
    // must not reach the console or the error state.
    rejectQuery(new DOMException("The operation was aborted.", "AbortError"));
    await request;

    expect(sentenceCompletionsSignal.value.status).toBe("idle");
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Could not make sentences")
    );
    consoleErrorSpy.mockRestore();
  });

  test("a request settling after a newer one started leaves the newer one abortable", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    const resolvers: ((value: unknown) => void)[] = [];
    mockedQueryChat.mockImplementation(
      () => new Promise((resolve) => {
        resolvers.push(resolve);
      }) as never
    );

    const firstRequest = requestForCurrentMessage();
    await waitFor(() => {
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });

    changeEncodingContents.value = EDITED_CONTENTS;
    expect(sentenceCompletionsSignal.value.status).toBe("idle");

    void requestForCurrentMessage();
    await waitFor(() => {
      expect(mockedQueryChat).toHaveBeenCalledTimes(2);
    });

    // Request 1 settles late. Its cleanup must not unregister request 2's controller.
    resolvers[0]({ message: { content: "1. I am hungry." } });
    await firstRequest;

    const secondSignal = mockedQueryChat.mock.calls[1][4] as AbortSignal;
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
    expect(secondSignal.aborted).toBe(true);
  });

  test("editing during a request asks before discarding it", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockReturnValue(new Promise(() => undefined) as never);

    void requestForCurrentMessage();
    await waitFor(() => {
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });

    changeEncodingContents.value = EDITED_CONTENTS;

    expect(mockedConfirm).toHaveBeenCalledWith(WORKING_DISCARD_PROMPT);
  });

  test("refusing to discard an in-flight request puts the message back", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockReturnValue(new Promise(() => undefined) as never);

    void requestForCurrentMessage();
    await waitFor(() => {
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });
    const signal = mockedQueryChat.mock.calls[0][4] as AbortSignal;

    // The user changes the message, is told it would stop the sentence being made, and
    // decides against it. The symbols and the caret go back where they were, and the model
    // keeps working on the message that is once again on screen.
    mockedConfirm.mockReturnValue(false);
    changeEncodingContents.value = EDITED_CONTENTS;

    expect(changeEncodingContents.value).toEqual(INPUT_CONTENTS);
    expect(signal.aborted).toBe(false);
    expect(sentenceCompletionsSignal.value.status).toBe("working");
  });

  test("refusing to discard the sentences on screen puts the message back", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockResolvedValue({
      message: { content: "1. I am hungry.\n2. I want food." }
    } as never);

    await requestForCurrentMessage();
    expect(sentenceCompletionsSignal.value.status).toBe("ready");

    mockedConfirm.mockReturnValue(false);
    changeEncodingContents.value = EDITED_CONTENTS;

    expect(mockedConfirm).toHaveBeenCalledWith(READY_DISCARD_PROMPT);
    expect(changeEncodingContents.value).toEqual(INPUT_CONTENTS);
    expect(sentenceCompletionsSignal.value).toMatchObject({
      status: "ready",
      sentences: ["I am hungry.", "I want food."]
    });
  });

  test("a second refused edit is still put back", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockReturnValue(new Promise(() => undefined) as never);

    void requestForCurrentMessage();
    await waitFor(() => {
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });

    // Restoring the contents runs the effect again. That pass must leave the snapshot
    // pointing at the message being worked on, or the next refusal restores the wrong thing.
    mockedConfirm.mockReturnValue(false);
    changeEncodingContents.value = EDITED_CONTENTS;
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };

    expect(changeEncodingContents.value).toEqual(INPUT_CONTENTS);
  });

  test("refusing an edit made in place puts the message back and asks only once", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [{ label: "me", composition: [124], modifierInfo: [] }],
      caretPosition: 0
    };
    mockedQueryChat.mockReturnValue(new Promise(() => undefined) as never);

    void requestForCurrentMessage();
    await waitFor(() => {
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });

    // The editing cells change the payloads array and the payload's `modifierInfo` in place and
    // then publish a fresh wrapper, so the revert cannot rely on the wrapper it captured earlier.
    const { payloads, caretPosition } = changeEncodingContents.value;
    payloads[0].modifierInfo?.push({ modifierId: [130], modifierGloss: "big", isPrepended: true });
    payloads.push({ label: "hungry", composition: [125], modifierInfo: [] });
    mockedConfirm.mockReturnValue(false);
    changeEncodingContents.value = { payloads, caretPosition };

    expect(mockedConfirm).toHaveBeenCalledTimes(1);
    expect(currentTelegraphicMessage()).toBe("me");
    expect(changeEncodingContents.value).toEqual({
      payloads: [{ label: "me", composition: [124], modifierInfo: [] }],
      caretPosition: 0
    });
    expect(sentenceCompletionsSignal.value.status).toBe("working");
  });

  test("moving the caret does not ask, since the message is unchanged", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockReturnValue(new Promise(() => undefined) as never);

    void requestForCurrentMessage();
    await waitFor(() => {
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });

    changeEncodingContents.value = { payloads: INPUT_CONTENTS.payloads, caretPosition: 0 };

    expect(mockedConfirm).not.toHaveBeenCalled();
    expect(sentenceCompletionsSignal.value.status).toBe("working");
  });

  test("editing with nothing being made does not ask", (): void => {
    changeEncodingContents.value = INPUT_CONTENTS;
    changeEncodingContents.value = EDITED_CONTENTS;

    expect(mockedConfirm).not.toHaveBeenCalled();
    expect(changeEncodingContents.value).toEqual(EDITED_CONTENTS);
  });

  test("aborting a query in flight stops it and leaves what is on screen", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockReturnValue(new Promise(() => undefined) as never);

    void requestForCurrentMessage();
    await waitFor(() => {
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });
    const signal = mockedQueryChat.mock.calls[0][4] as AbortSignal;

    abortActiveSentenceRequest();

    expect(signal.aborted).toBe(true);
    // The progress line must stop claiming a query is running, but the message the user
    // just spoke about stays on screen.
    expect(sentenceCompletionsSignal.value).toMatchObject({
      status: "ready", telegraphicMessage: "me hungry"
    });
  });

  test("aborting with nothing in flight does nothing", (): void => {
    abortActiveSentenceRequest();
    expect(sentenceCompletionsSignal.value).toEqual(IDLE_SENTENCE_STATE);
  });

  // A message the user has said and had translated before.
  const recordPastTranslation = (sentence: string): void => {
    saveMessageRecord(INPUT_CONTENTS.payloads);
    saveTranslation("me hungry", {
      model: "old-model:12b",
      candidates: [sentence],
      sentence,
      source: "chosen"
    });
  };

  test("with numSentences 1 a recalled sentence is spoken without any query", async (): Promise<void> => {
    setConfig(1);
    recordPastTranslation("I am hungry.");
    changeEncodingContents.value = INPUT_CONTENTS;

    await requestForCurrentMessage();

    expect(mockedQueryChat).not.toHaveBeenCalled();
    expect(mockedSpeak).toHaveBeenCalledWith("I am hungry.");
    expect(sentenceCompletionsSignal.value).toEqual({
      status: "ready",
      sentences: ["I am hungry."],
      model: "old-model:12b",
      telegraphicMessage: "me hungry"
    });
    const log = readMessageLog();
    expect(log[log.length - 1].translation).toMatchObject({
      model: "old-model:12b", sentence: "I am hungry.", source: "auto"
    });
  });

  test("a recalled sentence shows while the rest are still being made", async (): Promise<void> => {
    recordPastTranslation("I am hungry.");
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockReturnValue(new Promise(() => undefined) as never);

    void requestForCurrentMessage();

    await waitFor(() => {
      expect(sentenceCompletionsSignal.value).toMatchObject({
        status: "working",
        sentences: ["I am hungry."],
        model: "phony-model:12b",
        telegraphicMessage: "me hungry"
      });
    });
    // Nothing is spoken or recorded: with more than one sentence asked for, the user picks.
    expect(mockedSpeak).not.toHaveBeenCalled();
  });

  test("the rest are appended below the recalled sentence, dropping a duplicate", async (): Promise<void> => {
    recordPastTranslation("I am hungry.");
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockResolvedValue({
      message: { content: "1. I am hungry.\n2. I want food.\n3. Can I eat now?" }
    } as never);

    await requestForCurrentMessage();

    expect(sentenceCompletionsSignal.value).toEqual({
      status: "ready",
      sentences: ["I am hungry.", "I want food.", "Can I eat now?"],
      model: "phony-model:12b",
      telegraphicMessage: "me hungry"
    });
  });

  test("the total never exceeds numSentences", async (): Promise<void> => {
    recordPastTranslation("I am hungry.");
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockResolvedValue({
      message: { content: "1. I want food.\n2. Can I eat now?\n3. Feed me please." }
    } as never);

    await requestForCurrentMessage();

    expect(sentenceCompletionsSignal.value).toMatchObject({
      sentences: ["I am hungry.", "I want food.", "Can I eat now?"]
    });
  });

  test("a failed fill keeps the recalled sentence on screen", async (): Promise<void> => {
    recordPastTranslation("I am hungry.");
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockRejectedValue(new Error("connection refused"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await requestForCurrentMessage();

    expect(sentenceCompletionsSignal.value).toMatchObject({
      status: "error",
      sentences: ["I am hungry."],
      telegraphicMessage: "me hungry"
    });
    consoleErrorSpy.mockRestore();
  });

  test("editing after a failed fill asks before discarding the recalled sentence", async (): Promise<void> => {
    recordPastTranslation("I am hungry.");
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockRejectedValue(new Error("connection refused"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await requestForCurrentMessage();
    expect(sentenceCompletionsSignal.value.status).toBe("error");

    // A sentence the user can still see and tap must not vanish silently.
    mockedConfirm.mockReturnValue(false);
    changeEncodingContents.value = EDITED_CONTENTS;

    expect(mockedConfirm).toHaveBeenCalledWith(READY_DISCARD_PROMPT);
    expect(changeEncodingContents.value).toEqual(INPUT_CONTENTS);
    expect(sentenceCompletionsSignal.value).toMatchObject({
      status: "error", sentences: ["I am hungry."]
    });
    consoleErrorSpy.mockRestore();
  });

  test("moving the caret after a failed fill does not discard the recalled sentence", async (): Promise<void> => {
    recordPastTranslation("I am hungry.");
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockRejectedValue(new Error("connection refused"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await requestForCurrentMessage();
    changeEncodingContents.value = { payloads: INPUT_CONTENTS.payloads, caretPosition: 0 };

    expect(mockedConfirm).not.toHaveBeenCalled();
    expect(sentenceCompletionsSignal.value).toMatchObject({
      status: "error", sentences: ["I am hungry."]
    });
    consoleErrorSpy.mockRestore();
  });

  test("a message with no past translation queries as before", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockReturnValue(new Promise(() => undefined) as never);

    void requestForCurrentMessage();

    await waitFor(() => {
      expect(sentenceCompletionsSignal.value).toMatchObject({
        status: "working", sentences: [], model: "phony-model:12b"
      });
    });
  });

  test("clearing the message aborts a query in flight", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockReturnValue(new Promise(() => undefined) as never);

    void requestForCurrentMessage();
    await waitFor(() => {
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });
    const signal = mockedQueryChat.mock.calls[0][4] as AbortSignal;

    clearMessageAndChoices();

    expect(signal.aborted).toBe(true);
    expect(sentenceCompletionsSignal.value).toEqual(IDLE_SENTENCE_STATE);
    expect(mockedConfirm).not.toHaveBeenCalled();
  });
});
