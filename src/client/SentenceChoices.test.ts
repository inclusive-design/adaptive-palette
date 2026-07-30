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

import { adaptivePaletteGlobals, changeEncodingContents } from "./GlobalData";
import { sentenceCompletionsSignal } from "./TelegraphicTranslationState";
import { SENTENCE_LOG_KEY, readSentenceLog } from "./SentenceLog";
import { speak } from "./GlobalUtils";
import {
  SentenceChoices, WORKING_MESSAGE, CANNOT_COMPLETE_MESSAGE, TYPE_YOUR_OWN_HINT,
  SPEAK_BUTTON_LABEL, DONE_BUTTON_LABEL
} from "./SentenceChoices";

vi.mock("./GlobalUtils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./GlobalUtils")>();
  return { ...actual, speak: vi.fn() };
});

const mockedSpeak = vi.mocked(speak);

describe("SentenceChoices component", (): void => {

  const SENTENCES = ["I am hungry.", "I want food.", "Can I eat now?"];

  const READY_STATE = {
    status: "ready" as const,
    sentences: SENTENCES,
    model: "phony-model:12b",
    telegraphicMessage: "me hungry"
  };

  beforeEach((): void => {
    mockedSpeak.mockReset();
    window.localStorage.removeItem(SENTENCE_LOG_KEY);
    adaptivePaletteGlobals.config = {
      indicatorLabelLookup: { useModelQueryFallback: false, model: "" },
      telegraphicTranslation: {
        model: "phony-model:12b",
        numSentences: 3,
        maxStoredRecords: 500,
        systemPrompt: "prompt",
        userPrompt: "prompt"
      }
    };
  });

  afterEach((): void => {
    cleanup();
    sentenceCompletionsSignal.value = { status: "idle" };
    window.localStorage.removeItem(SENTENCE_LOG_KEY);
  });

  test("shows nothing but an empty live region when idle", (): void => {
    sentenceCompletionsSignal.value = { status: "idle" };
    const { container } = render(html`<${SentenceChoices} />`);
    expect(container.textContent).toBe("");

    // The live region has to be in the document before the announcement arrives,
    // otherwise screen readers routinely miss it.
    const liveRegion = container.querySelector("[role=\"status\"]");
    expect(liveRegion).not.toBeNull();
    expect(liveRegion?.textContent).toBe("");
  });

  test("the working message lands in the live region that was already there", async (): Promise<void> => {
    sentenceCompletionsSignal.value = { status: "idle" };
    const { container } = render(html`<${SentenceChoices} />`);
    const liveRegion = container.querySelector("[role=\"status\"]");

    sentenceCompletionsSignal.value = { status: "working", telegraphicMessage: "me hungry" };

    expect(await screen.findByText(WORKING_MESSAGE)).toBeVisible();

    // Same element as before the update -- the text arrived in a region the screen
    // reader was already watching, rather than the region appearing with the text in it.
    expect(container.querySelector("[role=\"status\"]")).toBe(liveRegion);
    expect(screen.queryByPlaceholderText(TYPE_YOUR_OWN_HINT)).toBeNull();
  });

  test("the error message lands in the live region that was already there", async (): Promise<void> => {
    sentenceCompletionsSignal.value = { status: "idle" };
    const { container } = render(html`<${SentenceChoices} />`);
    const liveRegion = container.querySelector("[role=\"status\"]");

    sentenceCompletionsSignal.value = { status: "error" };

    expect(await screen.findByText(CANNOT_COMPLETE_MESSAGE)).toBeVisible();
    expect(container.querySelector("[role=\"status\"]")).toBe(liveRegion);
    expect(liveRegion?.textContent).toBe(CANNOT_COMPLETE_MESSAGE);
  });

  test("renders one button per sentence plus the text box", (): void => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} />`);
    for (const sentence of SENTENCES) {
      expect(screen.getByRole("button", { name: sentence })).toBeVisible();
    }
    expect(screen.getByPlaceholderText(TYPE_YOUR_OWN_HINT)).toBeVisible();
  });

  test("tapping a sentence logs it as chosen and keeps the choices on screen", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} />`);

    await userEvent.click(screen.getByRole("button", { name: SENTENCES[1] }));

    const log = readSentenceLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      telegraphicMessage: "me hungry",
      model: "phony-model:12b",
      candidates: SENTENCES,
      sentence: SENTENCES[1],
      source: "chosen"
    });
    expect(mockedSpeak).toHaveBeenCalledWith(SENTENCES[1]);
    expect(screen.getByRole("button", { name: SENTENCES[1] })).toBeVisible();
  });

  test("focus moves to the first choice when the sentences arrive", async (): Promise<void> => {
    sentenceCompletionsSignal.value = { status: "working", telegraphicMessage: "me hungry" };
    render(html`<${SentenceChoices} />`);

    sentenceCompletionsSignal.value = READY_STATE;

    const firstChoice = await screen.findByRole("button", { name: SENTENCES[0] });
    await waitFor(() => {
      expect(document.activeElement).toBe(firstChoice);
    });
  });

  test("tapping the same sentence again speaks it again without a second record", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} />`);

    await userEvent.click(screen.getByRole("button", { name: SENTENCES[1] }));
    await userEvent.click(screen.getByRole("button", { name: SENTENCES[1] }));

    expect(mockedSpeak).toHaveBeenCalledTimes(2);
    const log = readSentenceLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ sentence: SENTENCES[1], source: "chosen" });
  });

  test("a mis-tap is corrected by the next tap, which becomes the preference", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} />`);

    await userEvent.click(screen.getByRole("button", { name: SENTENCES[1] }));
    await userEvent.click(screen.getByRole("button", { name: SENTENCES[0] }));

    const log = readSentenceLog();
    expect(log).toHaveLength(1);
    expect(log[0].sentence).toBe(SENTENCES[0]);
  });

  test("typed text overrides an earlier tap for the same message", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} />`);

    await userEvent.click(screen.getByRole("button", { name: SENTENCES[0] }));
    await userEvent.type(
      screen.getByPlaceholderText(TYPE_YOUR_OWN_HINT), "I would like a snack."
    );
    await userEvent.click(screen.getByRole("button", { name: SPEAK_BUTTON_LABEL }));

    const log = readSentenceLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ sentence: "I would like a snack.", source: "typed" });
  });

  test("Done clears the choices, the message and the text box", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [{ label: "hungry", composition: [124], modifierInfo: [] }],
      caretPosition: 1
    };
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} />`);
    await userEvent.type(screen.getByPlaceholderText(TYPE_YOUR_OWN_HINT), "leftover text");

    await userEvent.click(screen.getByRole("button", { name: DONE_BUTTON_LABEL }));

    expect(sentenceCompletionsSignal.value).toEqual({ status: "idle" });
    expect(changeEncodingContents.value.payloads).toEqual([]);
    expect(screen.queryByRole("button", { name: SENTENCES[0] })).toBeNull();
  });

  test("Done keeps the sentence already recorded for the message", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} />`);

    await userEvent.click(screen.getByRole("button", { name: SENTENCES[0] }));
    await userEvent.click(screen.getByRole("button", { name: DONE_BUTTON_LABEL }));

    const log = readSentenceLog();
    expect(log).toHaveLength(1);
    expect(log[0].sentence).toBe(SENTENCES[0]);
  });

  test("a different message keeps its own preference", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} />`);
    await userEvent.click(screen.getByRole("button", { name: SENTENCES[0] }));

    sentenceCompletionsSignal.value = { ...READY_STATE, telegraphicMessage: "me thirsty" };
    await userEvent.click(await screen.findByRole("button", { name: SENTENCES[1] }));

    const log = readSentenceLog();
    expect(log).toHaveLength(2);
    expect(log.map((entry) => entry.telegraphicMessage)).toEqual(["me hungry", "me thirsty"]);
  });

  test("submitting typed text logs it as typed and keeps it in the box", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} />`);

    const textBox = screen.getByPlaceholderText<HTMLInputElement>(TYPE_YOUR_OWN_HINT);
    await userEvent.type(textBox, "I would like a snack.");
    await userEvent.click(screen.getByRole("button", { name: SPEAK_BUTTON_LABEL }));

    const log = readSentenceLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ sentence: "I would like a snack.", source: "typed" });
    expect(mockedSpeak).toHaveBeenCalledWith("I would like a snack.");

    // Kept, not cleared: typing is expensive for these users, so the text stays available
    // to speak again or to edit into a second attempt.
    expect(textBox.value).toBe("I would like a snack.");
  });

  test("edited text can be spoken again and replaces the earlier preference", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} />`);

    const textBox = screen.getByPlaceholderText<HTMLInputElement>(TYPE_YOUR_OWN_HINT);
    const speakButton = screen.getByRole("button", { name: SPEAK_BUTTON_LABEL });

    await userEvent.type(textBox, "I want a snack");
    await userEvent.click(speakButton);
    await userEvent.type(textBox, " now");
    await userEvent.click(speakButton);

    expect(textBox.value).toBe("I want a snack now");
    const log = readSentenceLog();
    expect(log).toHaveLength(1);
    expect(log[0].sentence).toBe("I want a snack now");
  });

  test("submitting an empty text box logs nothing", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} />`);

    await userEvent.click(screen.getByRole("button", { name: SPEAK_BUTTON_LABEL }));

    expect(readSentenceLog()).toEqual([]);
  });
});
