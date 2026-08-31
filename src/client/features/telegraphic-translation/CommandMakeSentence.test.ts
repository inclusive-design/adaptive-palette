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
import { setTestConfig } from "../../testUtils/TestConfig";
import { editMessage, setEditGuard } from "../../core/MessageEdit";
import {
  confirmDiscardEdit, discardEditPromptSignal, guardEdit, IDLE_SENTENCE_STATE,
  sentenceCompletionsSignal
} from "./TelegraphicTranslationState";
import { queryChat } from "../../core/OllamaApi";
import { CommandMakeSentence } from "./CommandMakeSentence";
import { mockedSpeakUnavailable } from "../../testUtils/SpeechUtilsMock";
import { resetMessageLog } from "../../testUtils/MessageLogTestUtils";

const make_setence_label = "Make a sentence";

// The request flow itself is covered by `telegraphicTranslationState.test.ts`. What is left
// here is the button tests: when it renders, when it is available, and that clicking it starts
// a request.
vi.mock("../../core/OllamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../core/OllamaApi")>();
  return { ...actual, queryChat: vi.fn() };
});

vi.mock("../../utils/SpeechUtils");

const mockedQueryChat = vi.mocked(queryChat);

describe("CommandMakeSentence", (): void => {

  const CELL_OPTIONS = {
    label: make_setence_label,
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
    setTestConfig({
      telegraphicTranslation: {
        model: "phony-model:12b",
        numSentences,
        systemPrompt: "Give {{numSentences}} sentences.",
        userPrompt: "Telegraphic message: {{telegraphicMessage}}",
        showBlissSentence: true
      }
    });
  };

  const renderCell = () => render(
    html`<${CommandMakeSentence} id="command-make-sentence" options=${CELL_OPTIONS} />`
  );

  beforeEach(async (): Promise<void> => {
    mockedQueryChat.mockReset();
    await resetMessageLog();
    adaptivePaletteGlobals.models = ["phony-model:12b"];
    setConfig(3);
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
    finishedMessageSignal.value = "";
    sentenceCompletionsSignal.value = IDLE_SENTENCE_STATE;
  });

  afterEach(async (): Promise<void> => {
    setEditGuard(null);
    cleanup();
    sentenceCompletionsSignal.value = IDLE_SENTENCE_STATE;
    discardEditPromptSignal.value = null;
    await resetMessageLog();
  });

  test("renders the Bliss symbol of its composition, keeping the label as the name", (): void => {
    renderCell();
    const button = screen.getByRole("button", { name: make_setence_label });
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  test("is marked unavailable, but stays focusable, while the input area is empty", (): void => {
    renderCell();
    const button = screen.getByRole("button", { name: make_setence_label });
    expect(button).toHaveAttribute("aria-disabled", "true");

    // Never the `disabled` attribute: that drops focus, costing a switch or eye-gaze
    // user their scan position.
    expect(button).not.toHaveAttribute("disabled");
    button.focus();
    expect(document.activeElement).toBe(button);
  });

  test("clicking while the input area is empty does not query", async (): Promise<void> => {
    renderCell();

    await userEvent.click(screen.getByRole("button", { name: make_setence_label }));

    expect(mockedQueryChat).not.toHaveBeenCalled();
    expect(sentenceCompletionsSignal.value).toEqual(IDLE_SENTENCE_STATE);
  });

  test("clicking while the input area is empty is announced", async (): Promise<void> => {
    // The button keeps `aria-disabled` rather than `disabled`, so it can be focused and
    // activated. Speech is the main feedback channel and must not go silent.
    renderCell();
    await userEvent.click(screen.getByRole("button", { name: make_setence_label }));

    expect(mockedSpeakUnavailable).toHaveBeenCalledWith(make_setence_label);
  });

  test("is available once the input area has content", (): void => {
    changeEncodingContents.value = INPUT_CONTENTS;
    renderCell();
    expect(screen.getByRole("button", { name: make_setence_label }))
      .toHaveAttribute("aria-disabled", "false");
  });

  test("the button goes unavailable on a whitespace-only message", (): void => {
    changeEncodingContents.value = {
      payloads: [{ label: " ", composition: [124], modifierInfo: [] }],
      caretPosition: 1
    };
    renderCell();
    expect(screen.getByRole("button", { name: make_setence_label }))
      .toHaveAttribute("aria-disabled", "true");
  });

  test("a click requests sentences for the joined labels", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockResolvedValue({
      message: { content: "1. I am hungry.\n2. I want food." }
    } as never);
    renderCell();

    await userEvent.click(screen.getByRole("button", { name: make_setence_label }));

    await waitFor(() => {
      expect(sentenceCompletionsSignal.value.status).toBe("ready");
    });
    expect(mockedQueryChat).toHaveBeenCalledWith(
      "Telegraphic message: me hungry", "phony-model:12b", false, "Give 3 sentences.",
      expect.any(AbortSignal)
    );
  });

  test("a click marks the message as finished", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    mockedQueryChat.mockResolvedValue({
      message: { content: "1. I am hungry." }
    } as never);
    renderCell();

    await userEvent.click(screen.getByRole("button", { name: make_setence_label }));

    expect(finishedMessageSignal.value).toBe("me hungry");
  });

  test("goes unavailable while a query is in flight, and a second click does not start another", async (): Promise<void> => {
    changeEncodingContents.value = INPUT_CONTENTS;
    let resolveQuery: (value: unknown) => void = () => undefined;
    mockedQueryChat.mockReturnValue(new Promise((resolve) => {
      resolveQuery = resolve;
    }) as never);
    renderCell();

    const button = screen.getByRole("button", { name: make_setence_label });
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

  test("editing the message while a query is in flight re-enables the button", async (): Promise<void> => {
    // Gated, since the question the user answers below is raised by the guard.
    setEditGuard(guardEdit);
    editMessage(INPUT_CONTENTS);
    let resolveQuery: (value: unknown) => void = () => undefined;
    mockedQueryChat.mockReturnValue(new Promise((resolve) => {
      resolveQuery = resolve;
    }) as never);
    renderCell();

    const button = screen.getByRole("button", { name: make_setence_label });
    await userEvent.click(button);
    await waitFor(() => {
      expect(button).toHaveAttribute("aria-disabled", "true");
    });

    // The user swaps a symbol while the model is still thinking, and says the sentence
    // being made can go.
    editMessage({
      payloads: [{ label: "later", composition: [126], modifierInfo: [] }],
      caretPosition: 1
    });
    confirmDiscardEdit();

    // The button must come back now, not when the abandoned query eventually settles.
    // The loading indicator has already gone, so a disabled button here has nothing
    // on screen explaining itself.
    await waitFor(() => {
      expect(button).toHaveAttribute("aria-disabled", "false");
    });

    // Resolved only to avoid leaving a dangling promise behind for the next test; the
    // continuation early-returns because this reply is no longer the one being waited for.
    resolveQuery({ message: { content: "1. I am hungry." } });
  });
});
