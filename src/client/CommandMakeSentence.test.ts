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
  adaptivePaletteGlobals, changeEncodingContents, sentenceCompletionsSignal
} from "./GlobalData";
import { SENTENCE_LOG_KEY, readSentenceLog } from "./sentenceLog";
import { queryChat } from "./ollamaApi";
import { speak } from "./GlobalUtils";
import { CommandMakeSentence, MAKE_SENTENCE_LABEL } from "./CommandMakeSentence";

vi.mock("./ollamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./ollamaApi")>();
  return { ...actual, queryChat: vi.fn() };
});

vi.mock("./GlobalUtils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./GlobalUtils")>();
  return { ...actual, speak: vi.fn() };
});

const mockedQueryChat = vi.mocked(queryChat);
const mockedSpeak = vi.mocked(speak);

describe("CommandMakeSentence component", (): void => {

  const CELL_OPTIONS = {
    label: MAKE_SENTENCE_LABEL,
    composition: [840, ";", 81, ";", 368, "/", 502, "/", 414],
    rowStart: 3,
    rowSpan: 1,
    columnStart: 1,
    columnSpan: 14,
    ariaControls: "sentenceChoices"
  };

  const INPUT_CONTENTS = {
    payloads: [
      { label: "me", composition: [124], modifierInfo: [] },
      { label: "hungry", composition: [125], modifierInfo: [] }
    ],
    caretPosition: 2
  };

  const setConfig = (numSentences: number): void => {
    adaptivePaletteGlobals.config = {
      indicatorLabelLookup: { useModelQueryFallback: false, model: "" },
      telegraphicTranslation: {
        model: "phony-model:12b",
        numSentences,
        maxStoredRecords: 500,
        systemPrompt: "Give {{numSentences}} sentences.",
        userPrompt: "Telegraphic message: {{telegraphicMessage}}"
      }
    };
  };

  const renderCell = () => render(
    html`<${CommandMakeSentence} id="command-make-sentence" options=${CELL_OPTIONS} />`
  );

  beforeEach((): void => {
    mockedQueryChat.mockReset();
    mockedSpeak.mockReset();
    window.localStorage.removeItem(SENTENCE_LOG_KEY);
    adaptivePaletteGlobals.LLMs = ["phony-model:12b"];
    setConfig(3);
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
    sentenceCompletionsSignal.value = { status: "idle" };
  });

  afterEach((): void => {
    cleanup();
    sentenceCompletionsSignal.value = { status: "idle" };
    window.localStorage.removeItem(SENTENCE_LOG_KEY);
  });

  test("renders nothing when no models are available", (): void => {
    adaptivePaletteGlobals.LLMs = [];
    const { container } = renderCell();
    expect(container.textContent).toBe("");
  });

  test("renders nothing when the feature is unconfigured", (): void => {
    adaptivePaletteGlobals.config = {
      indicatorLabelLookup: { useModelQueryFallback: false, model: "" }
    };
    const { container } = renderCell();
    expect(container.textContent).toBe("");
  });

  test("renders the Bliss symbol of its composition, keeping the label as the name", (): void => {
    renderCell();
    const button = screen.getByRole("button", { name: MAKE_SENTENCE_LABEL });
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  test("is marked unavailable, but stays focusable, while the input area is empty", (): void => {
    renderCell();
    const button = screen.getByRole("button", { name: MAKE_SENTENCE_LABEL });
    expect(button).toHaveAttribute("aria-disabled", "true");

    // Never the `disabled` attribute: that drops focus, costing a switch or eye-gaze
    // user their scan position.
    expect(button).not.toHaveAttribute("disabled");
    button.focus();
    expect(document.activeElement).toBe(button);
  });

  test("clicking while the input area is empty does not query", async (): Promise<void> => {
    renderCell();

    await userEvent.click(screen.getByRole("button", { name: MAKE_SENTENCE_LABEL }));

    expect(mockedQueryChat).not.toHaveBeenCalled();
    expect(sentenceCompletionsSignal.value).toEqual({ status: "idle" });
  });

  test("is available once the input area has content", (): void => {
    changeEncodingContents.value = INPUT_CONTENTS;
    renderCell();
    expect(screen.getByRole("button", { name: MAKE_SENTENCE_LABEL }))
      .toHaveAttribute("aria-disabled", "false");
  });

  test("a whitespace-only message is treated as empty", (): void => {
    changeEncodingContents.value = {
      payloads: [{ label: " ", composition: [124], modifierInfo: [] }],
      caretPosition: 1
    };
    renderCell();
    expect(screen.getByRole("button", { name: MAKE_SENTENCE_LABEL }))
      .toHaveAttribute("aria-disabled", "true");
  });

  test("a click queries with the joined labels and publishes the sentences", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockResolvedValue({
      message: { content: "1. I am hungry.\n2. I want food." }
    } as never);
    renderCell();

    await userEvent.click(screen.getByRole("button", { name: MAKE_SENTENCE_LABEL }));

    await waitFor(() => {
      expect(sentenceCompletionsSignal.value).toEqual({
        status: "ready",
        sentences: ["I am hungry.", "I want food."],
        model: "phony-model:12b",
        telegraphicMessage: "me hungry"
      });
    });
    expect(mockedQueryChat).toHaveBeenCalledWith(
      "Telegraphic message: me hungry", "phony-model:12b", false, "Give 3 sentences."
    );
  });

  test("a failed query publishes the error state", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockRejectedValue(new Error("connection refused"));
    renderCell();

    await userEvent.click(screen.getByRole("button", { name: MAKE_SENTENCE_LABEL }));

    await waitFor(() => {
      expect(sentenceCompletionsSignal.value).toEqual({ status: "error" });
    });
  });

  test("with numSentences 1 the sentence is logged immediately as auto", async (): Promise<void> => {
    setConfig(1);
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockResolvedValue({ message: { content: "1. I am hungry." } } as never);
    renderCell();

    await userEvent.click(screen.getByRole("button", { name: MAKE_SENTENCE_LABEL }));

    await waitFor(() => {
      expect(readSentenceLog()).toHaveLength(1);
    });
    expect(readSentenceLog()[0]).toMatchObject({
      sentence: "I am hungry.",
      source: "auto",
      telegraphicMessage: "me hungry"
    });
    expect(mockedSpeak).toHaveBeenCalledWith("I am hungry.");
  });

  test("a second click while a query is in flight does not start another", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    let resolveQuery: (value: unknown) => void = () => undefined;
    mockedQueryChat.mockReturnValue(new Promise((resolve) => {
      resolveQuery = resolve;
    }) as never);
    renderCell();

    const button = screen.getByRole("button", { name: MAKE_SENTENCE_LABEL });
    await userEvent.click(button);
    await waitFor(() => {
      expect(button).toHaveAttribute("aria-disabled", "true");
    });
    await userEvent.click(button);

    expect(mockedQueryChat).toHaveBeenCalledTimes(1);

    resolveQuery({ message: { content: "1. I am hungry." } });
    await waitFor(() => {
      expect(sentenceCompletionsSignal.value.status).toBe("ready");
    });
  });

  test("the published message is the one from when the query started", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    let resolveQuery: (value: unknown) => void = () => undefined;
    mockedQueryChat.mockReturnValue(new Promise((resolve) => {
      resolveQuery = resolve;
    }) as never);
    renderCell();

    await userEvent.click(screen.getByRole("button", { name: MAKE_SENTENCE_LABEL }));

    // The user keeps editing while the model is thinking. The record must still name the
    // message that was actually translated.
    changeEncodingContents.value = {
      payloads: [{ label: "later", composition: [126], modifierInfo: [] }],
      caretPosition: 1
    };
    resolveQuery({ message: { content: "1. I am hungry." } });

    await waitFor(() => {
      expect(sentenceCompletionsSignal.value).toMatchObject({
        status: "ready",
        telegraphicMessage: "me hungry"
      });
    });
  });

  test("with numSentences above 1 nothing is logged until the user picks", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockResolvedValue({
      message: { content: "1. I am hungry.\n2. I want food." }
    } as never);
    renderCell();

    await userEvent.click(screen.getByRole("button", { name: MAKE_SENTENCE_LABEL }));

    await waitFor(() => {
      expect(sentenceCompletionsSignal.value.status).toBe("ready");
    });
    expect(readSentenceLog()).toEqual([]);
  });
});
