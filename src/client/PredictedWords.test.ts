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
import { render, screen, cleanup, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { html } from "htm/preact";

import {
  adaptivePaletteGlobals, changeEncodingContents, DISABLED_MODEL_QUERY, initAdaptivePaletteGlobals
} from "./GlobalData";
import { MESSAGE_LOG_KEY, saveMessageRecord } from "./MessageLog";
import {
  moreSuggestionsMessage, PredictedWords, PREDICTED_WORDS_LABEL, QUERYING_MESSAGE
} from "./PredictedWords";
import { cancelModelQuery, dismissModelStatus, modelWordsSignal, showModelStatusSignal } from "./WordPredictionState";
import { SymbolEncodingType } from "./index.d";

// The row is driven from `modelWordsSignal` directly here, so a query left waiting is all
// that is wanted of Ollama.
vi.mock("./OllamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./OllamaApi")>();
  return { ...actual, queryChat: vi.fn(() => new Promise(() => undefined)) };
});

describe("PredictedWords component", (): void => {

  const message = (...labels: string[]): SymbolEncodingType[] =>
    labels.map((label) => ({ label, composition: 1840, modifierInfo: [] }));

  /*
   * Updating the message triggers a debounced model query, so cancel it immediately
   */
  const setMessage = (...labels: string[]): void => {
    changeEncodingContents.value = { payloads: message(...labels), caretPosition: labels.length - 1 };
    cancelModelQuery();
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  beforeEach((): void => {
    window.localStorage.removeItem(MESSAGE_LOG_KEY);
    adaptivePaletteGlobals.config.maxStoredRecords = 100;
    adaptivePaletteGlobals.config.wordPrediction = { show: true, maxSuggestions: 4, ...DISABLED_MODEL_QUERY };
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
    saveMessageRecord(message("I", "want", "juice"));
    saveMessageRecord(message("I", "want", "juice"));
    saveMessageRecord(message("you", "help", "me"));
  });

  afterEach((): void => {
    cleanup();
    window.localStorage.removeItem(MESSAGE_LOG_KEY);
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  test("renders one button per suggestion", (): void => {
    render(html`<${PredictedWords} />`);
    const suggestions = screen.getByRole("group", { name: PREDICTED_WORDS_LABEL });
    expect(suggestions.querySelectorAll("button")).toHaveLength(2);
  });

  // The row is a fixed set of slots, so a word keeps its place as the message grows.
  test("draws every slot the configuration asks for, filled or not", (): void => {
    render(html`<${PredictedWords} />`);
    const suggestions = screen.getByRole("group", { name: PREDICTED_WORDS_LABEL });
    expect(suggestions.querySelectorAll(".predictedWord")).toHaveLength(4);
    expect(suggestions.querySelectorAll(".predictedWordEmpty")).toHaveLength(2);
  });

  test("suggests what usually follows the message so far", (): void => {
    setMessage("I", "want");
    render(html`<${PredictedWords} />`);
    expect(screen.getByRole("group").querySelector("button")?.textContent).toContain("juice");
  });

  test("choosing a suggestion adds it to the message", async (): Promise<void> => {
    const user = userEvent.setup();
    setMessage("I", "want");
    render(html`<${PredictedWords} />`);

    await user.click(screen.getByRole("group").querySelectorAll("button")[0]);
    expect(changeEncodingContents.value.payloads.map((payload) => payload.label))
      .toEqual(["I", "want", "juice"]);
    expect(changeEncodingContents.value.caretPosition).toBe(2);
  });

  test("renders nothing when the feature is turned off", (): void => {
    adaptivePaletteGlobals.config.wordPrediction = { show: false, maxSuggestions: 4, ...DISABLED_MODEL_QUERY };
    const { container } = render(html`<${PredictedWords} />`);
    expect(container.innerHTML).toBe("");
  });

  // The row holds its place so that the rest of the page does not shift as words are added.
  test("keeps a row of empty slots when there is nothing to suggest", (): void => {
    window.localStorage.removeItem(MESSAGE_LOG_KEY);
    setMessage("unknown");
    render(html`<${PredictedWords} />`);

    const suggestions = screen.getByRole("group", { name: PREDICTED_WORDS_LABEL });
    expect(suggestions.querySelectorAll("button")).toHaveLength(0);
    expect(suggestions.querySelectorAll(".predictedWordEmpty")).toHaveLength(4);
  });

  describe("with words from the model", (): void => {

    const modelWords = (...labels: string[]): SymbolEncodingType[] =>
      labels.map((label) => ({ label, composition: 329, modifierInfo: [] }));

    // The signal is set after the message, since changing the message clears it.
    const showModelWords = (contextKey: string, ...labels: string[]): void => {
      modelWordsSignal.value = { status: "ready", contextKey, payloads: modelWords(...labels) };
    };

    beforeEach((): void => {
      // With a model answering, the history fills only the slots its n-gram matches earn,
      // which is what leaves room for the words below.
      adaptivePaletteGlobals.config.wordPrediction = {
        show: true,
        maxSuggestions: 4,
        enableModelQuery: true,
        model: "phony-model:12b",
        systemPrompt: "List {{numWords}} words.",
        userPrompt: "Message so far: {{message}}"
      };
      adaptivePaletteGlobals.models = ["phony-model:12b"];
    });

    afterEach((): void => {
      modelWordsSignal.value = { status: "idle" };
      showModelStatusSignal.value = true;
      adaptivePaletteGlobals.models = [];
    });

    test("model words fill the slots the history left empty", (): void => {
      setMessage("I", "want");
      showModelWords("I want", "food", "tea");
      render(html`<${PredictedWords} />`);

      const suggestions = screen.getByRole("group", { name: PREDICTED_WORDS_LABEL });
      const labels = [...suggestions.querySelectorAll("button")].map((button) => button.textContent);
      // "juice" is what the history predicts after "I want"; the model's words follow it.
      expect(labels[0]).toContain("juice");
      expect(labels[1]).toContain("food");
      expect(labels[2]).toContain("tea");
      expect(suggestions.querySelectorAll(".predictedWordEmpty")).toHaveLength(1);
    });

    // Moving a button out from under someone reaching for it is worse than suggesting less.
    test("a word from the history keeps its place when the model answers", async (): Promise<void> => {
      setMessage("I", "want");
      const { container } = render(html`<${PredictedWords} />`);
      const beforeModel = container.querySelector("button")?.textContent;

      showModelWords("I want", "food", "tea");
      await waitFor(() => expect(container.querySelectorAll("button")).toHaveLength(3));
      expect(container.querySelector("button")?.textContent).toBe(beforeModel);
    });

    test("words answering a message the user has moved past are not drawn", (): void => {
      setMessage("I", "want");
      showModelWords("you help", "food", "tea");
      render(html`<${PredictedWords} />`);

      const labels = [...screen.getByRole("group").querySelectorAll("button")]
        .map((button) => button.textContent);
      expect(labels.some((label) => label?.includes("food"))).toBe(false);
    });

    test("the wait and the arrival are both reported", async (): Promise<void> => {
      setMessage("I", "want");
      render(html`<${PredictedWords} />`);
      expect(screen.getByRole("status").textContent?.trim()).toBe("");

      modelWordsSignal.value = { status: "working", contextKey: "I want" };
      await waitFor(() => expect(screen.getByRole("status").textContent?.trim()).toBe(QUERYING_MESSAGE));

      showModelWords("I want", "food", "tea");
      await waitFor(() => expect(screen.getByRole("status").textContent?.trim())
        .toBe(moreSuggestionsMessage(2)));
    });

    // Pressing Speak or Sentence finishes the message: nothing more to report about it, but
    // its words are still there to press.
    test("dismissing the status keeps the words on the row", async (): Promise<void> => {
      setMessage("I", "want");
      showModelWords("I want", "food", "tea");
      const { container } = render(html`<${PredictedWords} />`);
      await waitFor(() => expect(screen.getByRole("status").textContent?.trim())
        .toBe(moreSuggestionsMessage(2)));

      dismissModelStatus();
      await waitFor(() => expect(screen.getByRole("status").textContent?.trim()).toBe(""));
      expect(container.querySelectorAll("button")).toHaveLength(3);
    });

    // The wait belongs to the message it was started for, as its answer does.
    test("a query for a message the user has moved past is not reported", (): void => {
      setMessage("I", "want");
      modelWordsSignal.value = { status: "working", contextKey: "you help" };
      render(html`<${PredictedWords} />`);

      expect(screen.getByRole("status").textContent?.trim()).toBe("");
    });

    // Above the row, so that a status arriving does not move a word out from under the
    // user; and taking no space while empty, which is most of the time.
    test("the status line sits above the row of words", (): void => {
      setMessage("I", "want");
      const { container } = render(html`<${PredictedWords} />`);

      const status = screen.getByRole("status");
      const row = container.querySelector(".predictedWords");
      expect(status.compareDocumentPosition(row!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(status.textContent).toBe("");
    });

    test("one word is announced as one suggestion", (): void => {
      expect(moreSuggestionsMessage(1)).toBe("1 more word suggestion");
    });
  });
});
