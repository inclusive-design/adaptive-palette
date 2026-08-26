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

import { adaptivePaletteGlobals, changeEncodingContents, finishedMessageSignal } from "../../state/GlobalData";
import { initAdaptivePaletteGlobals } from "../../core/InitGlobals";
import { DISABLED_MODEL_QUERY } from "../../core/Config";
import { MESSAGE_LOG_KEY, saveMessageRecord } from "../../core/MessageLog";
import {
  moreSuggestionsMessage, PredictedWords, PREDICTED_WORDS_LABEL, QUERYING_MESSAGE
} from "./PredictedWords";
import { cancelModelQuery, modelWordsSignal, queryContextKeyOf } from "./WordPredictionState";
import { SymbolEncodingType } from "../../index.d";
import { AI_BADGE_TEXT, aiSuggestionLabel } from "../../components/AiBadge";
import { selectedAttributesSignal, clearAttributes } from "../message-attributes/MessageAttributesState";

// The row is driven from `modelWordsSignal` directly here, so a query left waiting is all
// that is wanted of Ollama.
vi.mock("../../core/OllamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../core/OllamaApi")>();
  return { ...actual, queryChat: vi.fn(() => new Promise(() => undefined)) };
});

describe("PredictedWords", (): void => {

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
    adaptivePaletteGlobals.config.markAiSuggestions = true;
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
      finishedMessageSignal.value = "";
      adaptivePaletteGlobals.models = [];
      clearAttributes();
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

    // The row has to compare against the same combined key the query was made under, or the
    // model's words never clear the `contextKey` check once an attribute is set.
    test("model words render with an attribute set", (): void => {
      selectedAttributesSignal.value = [
        { category: "Feeling", label: "angry", composition: 1198 }
      ];
      setMessage("I", "want");
      showModelWords(queryContextKeyOf("I want"), "food", "tea");
      render(html`<${PredictedWords} />`);

      const labels = [...screen.getByRole("group").querySelectorAll("button")]
        .map((button) => button.textContent);
      expect(labels.some((label) => label?.includes("food"))).toBe(true);
    });

    test("the querying status shows with an attribute set", async (): Promise<void> => {
      selectedAttributesSignal.value = [
        { category: "Feeling", label: "angry", composition: 1198 }
      ];
      setMessage("I", "want");
      render(html`<${PredictedWords} />`);

      modelWordsSignal.value = { status: "working", contextKey: queryContextKeyOf("I want") };
      await waitFor(() => expect(screen.getByRole("status").textContent?.trim()).toBe(QUERYING_MESSAGE));
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
    test("finishing the message keeps the words on the row", async (): Promise<void> => {
      setMessage("I", "want");
      showModelWords("I want", "food", "tea");
      const { container } = render(html`<${PredictedWords} />`);
      await waitFor(() => expect(screen.getByRole("status").textContent?.trim())
        .toBe(moreSuggestionsMessage(2)));

      finishedMessageSignal.value = "I want";
      await waitFor(() => expect(screen.getByRole("status").textContent?.trim()).toBe(""));
      expect(container.querySelectorAll("button")).toHaveLength(3);
    });

    // Speak leaves the message and its attributes in place, so adjusting an attribute after
    // finishing is normal use. The words already on the row must stay recognized as the answer
    // to this message, not vanish because the key they were stored under has gone stale.
    test("setting an attribute after finishing keeps the words on the row", async (): Promise<void> => {
      setMessage("I", "want");
      showModelWords("I want", "food", "tea");
      const { container } = render(html`<${PredictedWords} />`);
      await waitFor(() => expect(screen.getByRole("status").textContent?.trim())
        .toBe(moreSuggestionsMessage(2)));

      finishedMessageSignal.value = "I want";
      await waitFor(() => expect(screen.getByRole("status").textContent?.trim()).toBe(""));

      selectedAttributesSignal.value = [
        { category: "Feeling", label: "angry", composition: 1198 }
      ];
      // The row's existing "3 buttons" DOM state does not change on its own, so wait for the
      // signal's key to be restamped -- the thing this fix actually does -- before checking
      // that the row still reflects it, rather than asserting a value the DOM already had.
      await waitFor(() => {
        const shown = modelWordsSignal.peek();
        expect(shown.status === "ready" && shown.contextKey).toBe(queryContextKeyOf("I want"));
      });
      expect(container.querySelectorAll("button")).toHaveLength(3);
    });

    // "Delete all" jumps straight to an empty message without ever setting
    // `finishedMessageSignal`, so it must not be read as matching the still-empty
    // `finishedMessageSignal` and have the deleted message's model suggestions restamped onto
    // the now-empty row.
    test("deleting the whole message clears the model's suggestions", async (): Promise<void> => {
      setMessage("I", "want");
      showModelWords("I want", "food", "tea");
      const { container } = render(html`<${PredictedWords} />`);
      await waitFor(() => expect(screen.getByRole("status").textContent?.trim())
        .toBe(moreSuggestionsMessage(2)));

      changeEncodingContents.value = { payloads: [], caretPosition: -1 };

      await waitFor(() => {
        const labels = [...container.querySelectorAll("button")].map((button) => button.textContent);
        expect(labels.some((label) => label?.includes("food"))).toBe(false);
      });
    });

    // The wait belongs to the message it was started for, as its answer does.
    test("a query for a message the user has moved past is not reported", (): void => {
      setMessage("I", "want");
      modelWordsSignal.value = { status: "working", contextKey: "you help" };
      render(html`<${PredictedWords} />`);

      expect(screen.getByRole("status").textContent?.trim()).toBe("");
    });

    test("the status line sits above the row of words", (): void => {
      setMessage("I", "want");
      const { container } = render(html`<${PredictedWords} />`);

      const status = screen.getByRole("status");
      const row = container.querySelector(".predictedWords");
      expect(status.compareDocumentPosition(row!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(status.textContent).toBe("");
    });

    // The status line's space is held whether or not it has text: a status arriving must not
    // move a word out from under a user already reaching for it.
    test("the row does not move when the status line fills", async (): Promise<void> => {
      setMessage("I", "want");
      const { container } = render(html`<${PredictedWords} />`);
      const row = container.querySelector(".predictedWords") as HTMLElement;
      const topWhileEmpty = row.getBoundingClientRect().top;

      modelWordsSignal.value = { status: "working", contextKey: "I want" };
      await waitFor(() => expect(screen.getByRole("status").textContent?.trim()).toBe(QUERYING_MESSAGE));
      expect(row.getBoundingClientRect().top).toBe(topWhileEmpty);
    });

    test("one word is announced as one suggestion", (): void => {
      expect(moreSuggestionsMessage(1)).toBe("1 more word suggestion");
    });

    // "juice" is what the history predicts after "I want"; the model's words follow it, and
    // only they are marked.
    test("marks the model's words and leaves the history's plain", (): void => {
      setMessage("I", "want");
      showModelWords("I want", "food", "tea");
      render(html`<${PredictedWords} />`);

      const suggestions = screen.getByRole("group", { name: PREDICTED_WORDS_LABEL });
      const buttons = [...suggestions.querySelectorAll("button")];

      expect(buttons[0]).not.toHaveClass("aiSuggestion");
      expect(buttons[0].querySelector(".aiBadge")).toBeNull();
      expect(buttons[0]).not.toHaveAttribute("aria-label");

      expect(buttons[1]).toHaveClass("aiSuggestion");
      expect(buttons[1].querySelector(".aiBadge")?.textContent).toBe(AI_BADGE_TEXT);
      expect(buttons[1]).toHaveAttribute("aria-label", aiSuggestionLabel("food"));
    });

    // The cell's accessible name carries the prefix; the word added to the message must not.
    test("choosing a marked word adds the word, not its name", async (): Promise<void> => {
      const user = userEvent.setup();
      setMessage("I", "want");
      showModelWords("I want", "food", "tea");
      render(html`<${PredictedWords} />`);

      await user.click(screen.getByRole("button", { name: aiSuggestionLabel("food") }));

      expect(changeEncodingContents.value.payloads.map((payload) => payload.label))
        .toEqual(["I", "want", "food"]);
    });

    test("marks nothing when the setting is off", (): void => {
      adaptivePaletteGlobals.config.markAiSuggestions = false;
      setMessage("I", "want");
      showModelWords("I want", "food", "tea");
      render(html`<${PredictedWords} />`);

      const suggestions = screen.getByRole("group", { name: PREDICTED_WORDS_LABEL });
      expect(suggestions.querySelectorAll(".aiSuggestion")).toHaveLength(0);
      expect(suggestions.querySelectorAll(".aiBadge")).toHaveLength(0);
      expect(suggestions.querySelector("button")).not.toHaveAttribute("aria-label");
    });
  });
});
