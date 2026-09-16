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

import { adaptivePaletteGlobals, changeEncodingContents } from "../../state/GlobalData";
import { AI_BADGE_TEXT, aiSuggestionLabel } from "../../components/AiBadge";
import { setTestConfig } from "../../testUtils/TestConfig";
import {
  discardEditPromptSignal, focusedMessageSignal, IDLE_SENTENCE_STATE,
  sentenceCompletionsSignal, typedSentenceSignal
} from "./TelegraphicTranslationState";
import { readMessageLog } from "../../core/MessageLog";
import {
  SentenceChoices, WORKING_MESSAGE, MAKING_MORE_MESSAGE, CANNOT_COMPLETE_MESSAGE,
  TYPE_YOUR_OWN_HINT, SPEAK_BUTTON_LABEL, DONE_BUTTON_LABEL
} from "./SentenceChoices";
import { mockedSpeak, mockedSpeakUnavailable } from "../../testUtils/SpeechUtilsMock";
import { resetMessageLog } from "../../testUtils/MessageLogTestUtils";

vi.mock("../../utils/SpeechUtils");

describe("SentenceChoices", (): void => {

  const CELL_ID = "sentence-choices";
  const CELL_OPTIONS = { rowStart: 1, rowSpan: 1, columnStart: 1, columnSpan: 1 };

  const SENTENCES = ["I am hungry.", "I want food.", "Can I eat now?"];

  const READY_STATE = {
    status: "ready" as const,
    sentences: SENTENCES,
    recalledSentence: null,
    model: "phony-model:12b",
    telegraphicMessage: "me hungry"
  };

  const WORKING_STATE = {
    status: "working" as const,
    sentences: [],
    recalledSentence: null,
    model: "phony-model:12b",
    telegraphicMessage: "me hungry"
  };

  const FILLING_STATE = {
    ...WORKING_STATE,
    sentences: [SENTENCES[0]]
  };

  beforeEach(async (): Promise<void> => {
    await resetMessageLog();
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
    setTestConfig({
      // No fixture here sets `recalledSentence`, so with the marking on every sentence in one
      // reads as the model's and is named "AI suggestion, ...". These tests are about other
      // behaviour and find their buttons by the bare sentence, so the marking is off for them.
      // "marking the model's sentences" below turns it back on.
      markAiSuggestions: false,
      telegraphicTranslation: {
        model: "phony-model:12b",
        numSentences: 3,
        systemPrompt: "prompt",
        userPrompt: "prompt",
        showBlissSentence: true
      }
    });
  });

  afterEach(async (): Promise<void> => {
    cleanup();
    sentenceCompletionsSignal.value = IDLE_SENTENCE_STATE;
    discardEditPromptSignal.value = null;
    typedSentenceSignal.value = "";
    focusedMessageSignal.value = null;
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
    await resetMessageLog();
  });

  test("shows nothing but an empty live region when idle", (): void => {
    sentenceCompletionsSignal.value = IDLE_SENTENCE_STATE;
    const { container } = render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);
    // Nothing is on screen.
    expect(screen.queryByRole("button")).toBeNull();

    // The live region has to be in the document before the announcement arrives,
    // otherwise screen readers routinely miss it.
    const liveRegion = container.querySelector("[role=\"status\"]");
    expect(liveRegion).not.toBeNull();
    expect(liveRegion?.textContent).toBe("");
  });

  test("the working message lands in the live region that was already there", async (): Promise<void> => {
    sentenceCompletionsSignal.value = IDLE_SENTENCE_STATE;
    const { container } = render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);
    const liveRegion = container.querySelector("[role=\"status\"]");

    sentenceCompletionsSignal.value = {
      status: "working", sentences: [], recalledSentence: null, model: "phony-model:12b",
      telegraphicMessage: "me hungry"
    };

    expect(await screen.findByText(WORKING_MESSAGE)).toBeVisible();

    // Same element as before the update -- the text arrived in a region the screen
    // reader was already watching, rather than the region appearing with the text in it.
    expect(container.querySelector("[role=\"status\"]")).toBe(liveRegion);
    expect(screen.getByPlaceholderText(TYPE_YOUR_OWN_HINT)).toBeVisible();
  });

  test("the error message lands in the live region that was already there", async (): Promise<void> => {
    sentenceCompletionsSignal.value = IDLE_SENTENCE_STATE;
    const { container } = render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);
    const liveRegion = container.querySelector("[role=\"status\"]");

    sentenceCompletionsSignal.value = { ...IDLE_SENTENCE_STATE, status: "error" };

    expect(await screen.findByText(CANNOT_COMPLETE_MESSAGE)).toBeVisible();
    expect(container.querySelector("[role=\"status\"]")).toBe(liveRegion);
    expect(liveRegion?.textContent).toBe(CANNOT_COMPLETE_MESSAGE);
  });

  test("renders one button per sentence plus the text box", (): void => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);
    for (const sentence of SENTENCES) {
      expect(screen.getByRole("button", { name: sentence })).toBeVisible();
    }
    expect(screen.getByPlaceholderText(TYPE_YOUR_OWN_HINT)).toBeVisible();
  });

  test("is drawn at its grid position, under its cell id", (): void => {
    sentenceCompletionsSignal.value = READY_STATE;
    const options = { ...CELL_OPTIONS, rowStart: 2, columnSpan: 3 };
    const { container } = render(html`<${SentenceChoices} id=${CELL_ID} options=${options} />`);

    const area = container.querySelector(".sentenceChoices") as HTMLElement;
    expect(area.id).toBe(CELL_ID);
    expect(area.style.gridRowStart).toBe("2");
    expect(area.style.gridColumnEnd).toBe("span 3");
  });

  const withBlissSetting = (showBlissSentence: boolean): void => {
    setTestConfig({
      markAiSuggestions: false,
      telegraphicTranslation: {
        model: "phony-model:12b", numSentences: 3, systemPrompt: "sys", userPrompt: "user",
        showBlissSentence
      }
    });
  };

  it("draws a Bliss row inside each sentence choice", async (): Promise<void> => {
    withBlissSetting(true);
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);
    const choices = await screen.findAllByRole("button", { name: SENTENCES[0] });
    expect(choices[0].querySelector(".blissSentence")).not.toBeNull();
  });

  it("shows the English sentence once, under the symbols", async (): Promise<void> => {
    withBlissSetting(true);
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);
    const choice = await screen.findByRole("button", { name: SENTENCES[0] });
    // The row carries the English itself; nothing else inside the button repeats it.
    const clone = choice.cloneNode(true) as HTMLElement;
    clone.querySelector(".blissSentence")?.remove();
    expect(clone.textContent?.trim()).toBe("");
    expect(choice.getAttribute("aria-label")).toBe(SENTENCES[0]);
  });

  it("keeps the choice's accessible name the plain English sentence", async (): Promise<void> => {
    withBlissSetting(true);
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);
    // The row is `aria-hidden`, so none of its labels join the button's name.
    expect(await screen.findByRole("button", { name: SENTENCES[0] })).toBeDefined();
  });

  it("draws no Bliss row when the setting is off", async (): Promise<void> => {
    withBlissSetting(false);
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);
    const choice = await screen.findByRole("button", { name: SENTENCES[0] });
    expect(choice.querySelector(".blissSentence")).toBeNull();
    expect(choice.getAttribute("aria-label")).toBeNull();
  });

  test("tapping a sentence logs it as chosen and keeps the choices on screen", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    await userEvent.click(screen.getByRole("button", { name: SENTENCES[1] }));

    const log = readMessageLog();
    expect(log).toHaveLength(1);
    expect(log[0].translation).toMatchObject({
      model: "phony-model:12b",
      candidates: SENTENCES,
      sentence: SENTENCES[1],
      source: "chosen"
    });
    expect(mockedSpeak).toHaveBeenCalledWith(SENTENCES[1]);
    expect(screen.getByRole("button", { name: SENTENCES[1] })).toBeVisible();
  });

  test("focus moves to the first choice when the sentences arrive", async (): Promise<void> => {
    sentenceCompletionsSignal.value = {
      status: "working", sentences: [], recalledSentence: null, model: "phony-model:12b",
      telegraphicMessage: "me hungry"
    };
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    sentenceCompletionsSignal.value = READY_STATE;

    const firstChoice = await screen.findByRole("button", { name: SENTENCES[0] });
    await waitFor(() => {
      expect(document.activeElement).toBe(firstChoice);
    });
  });

  test("typed text survives the sentence area being drawn again", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    const { unmount } = render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);
    await userEvent.type(screen.getByPlaceholderText(TYPE_YOUR_OWN_HINT), "I would like a snack.");

    unmount();
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    expect(screen.getByPlaceholderText<HTMLInputElement>(TYPE_YOUR_OWN_HINT).value).toBe("I would like a snack.");
  });

  test("drawing the sentence area again does not move focus to the first sentence again", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    const { unmount } = render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: SENTENCES[0] })).toHaveFocus();
    });

    unmount();
    const elsewhere = document.createElement("button");
    document.body.append(elsewhere);
    elsewhere.focus();
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);
    // Safety margin for effects that run after paint, though `render` already runs effects
    // inside `act()`.
    await new Promise((resolve) => setTimeout(resolve, 50));

    const focused = document.activeElement;
    elsewhere.remove();
    expect(focused).toBe(elsewhere);
  });

  test("tapping the same sentence again speaks it again without a second record", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    await userEvent.click(screen.getByRole("button", { name: SENTENCES[1] }));
    await userEvent.click(screen.getByRole("button", { name: SENTENCES[1] }));

    expect(mockedSpeak).toHaveBeenCalledTimes(2);
    const log = readMessageLog();
    expect(log).toHaveLength(1);
    expect(log[0].translation).toMatchObject({ sentence: SENTENCES[1], source: "chosen" });
  });

  test("a mis-tap is corrected by the next tap, which becomes the preference", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    await userEvent.click(screen.getByRole("button", { name: SENTENCES[1] }));
    await userEvent.click(screen.getByRole("button", { name: SENTENCES[0] }));

    const log = readMessageLog();
    expect(log).toHaveLength(1);
    expect(log[0].translation?.sentence).toBe(SENTENCES[0]);
  });

  test("typed text overrides an earlier tap for the same message", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    await userEvent.click(screen.getByRole("button", { name: SENTENCES[0] }));
    await userEvent.type(
      screen.getByPlaceholderText(TYPE_YOUR_OWN_HINT), "I would like a snack."
    );
    await userEvent.click(screen.getByRole("button", { name: SPEAK_BUTTON_LABEL }));

    const log = readMessageLog();
    expect(log).toHaveLength(1);
    expect(log[0].translation).toMatchObject({ sentence: "I would like a snack.", source: "typed" });
  });

  test("Done clears the choices, the message and the text box", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [{ label: "hungry", composition: [124], modifierInfo: [] }],
      caretPosition: 1
    };
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);
    await userEvent.type(screen.getByPlaceholderText(TYPE_YOUR_OWN_HINT), "leftover text");

    await userEvent.click(screen.getByRole("button", { name: DONE_BUTTON_LABEL }));

    expect(sentenceCompletionsSignal.value).toEqual(IDLE_SENTENCE_STATE);
    expect(changeEncodingContents.value.payloads).toEqual([]);
    expect(screen.queryByRole("button", { name: SENTENCES[0] })).toBeNull();
    expect(typedSentenceSignal.value).toBe("");
  });

  test("Done keeps the sentence already recorded for the message", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    await userEvent.click(screen.getByRole("button", { name: SENTENCES[0] }));
    await userEvent.click(screen.getByRole("button", { name: DONE_BUTTON_LABEL }));

    const log = readMessageLog();
    expect(log).toHaveLength(1);
    expect(log[0].translation?.sentence).toBe(SENTENCES[0]);
  });

  test("a different message keeps its own preference", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);
    await userEvent.click(screen.getByRole("button", { name: SENTENCES[0] }));

    sentenceCompletionsSignal.value = { ...READY_STATE, telegraphicMessage: "me thirsty" };
    await userEvent.click(await screen.findByRole("button", { name: SENTENCES[1] }));

    const log = readMessageLog();
    expect(log).toHaveLength(2);
    expect(log.map((entry) => entry.translation?.sentence)).toEqual([SENTENCES[0], SENTENCES[1]]);
  });

  test("submitting typed text logs it as typed and keeps it in the box", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    const textBox = screen.getByPlaceholderText<HTMLInputElement>(TYPE_YOUR_OWN_HINT);
    await userEvent.type(textBox, "I would like a snack.");
    await userEvent.click(screen.getByRole("button", { name: SPEAK_BUTTON_LABEL }));

    const log = readMessageLog();
    expect(log).toHaveLength(1);
    expect(log[0].translation).toMatchObject({ sentence: "I would like a snack.", source: "typed" });
    expect(mockedSpeak).toHaveBeenCalledWith("I would like a snack.");

    // Kept, not cleared: typing is expensive for these users, so the text stays available
    // to speak again or to edit into a second attempt.
    expect(textBox.value).toBe("I would like a snack.");
  });

  test("edited text can be spoken again and replaces the earlier preference", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    const textBox = screen.getByPlaceholderText<HTMLInputElement>(TYPE_YOUR_OWN_HINT);
    const speakButton = screen.getByRole("button", { name: SPEAK_BUTTON_LABEL });

    await userEvent.type(textBox, "I want a snack");
    await userEvent.click(speakButton);
    await userEvent.type(textBox, " now");
    await userEvent.click(speakButton);

    expect(textBox.value).toBe("I want a snack now");
    const log = readMessageLog();
    expect(log).toHaveLength(1);
    expect(log[0].translation?.sentence).toBe("I want a snack now");
  });

  test("submitting an empty text box logs nothing", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    await userEvent.click(screen.getByRole("button", { name: SPEAK_BUTTON_LABEL }));

    expect(readMessageLog()).toEqual([]);
  });

  test("the typing area is there while the first sentences are being made", (): void => {
    sentenceCompletionsSignal.value = WORKING_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    expect(screen.getByPlaceholderText(TYPE_YOUR_OWN_HINT)).toBeVisible();
    expect(screen.getByRole("button", { name: SPEAK_BUTTON_LABEL })).toBeVisible();
    expect(screen.getByRole("button", { name: DONE_BUTTON_LABEL })).toBeVisible();
  });

  test("the typing area is there after a failure", (): void => {
    sentenceCompletionsSignal.value = { ...WORKING_STATE, status: "error" };
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    expect(screen.getByPlaceholderText(TYPE_YOUR_OWN_HINT)).toBeVisible();
    expect(screen.getByRole("button", { name: SPEAK_BUTTON_LABEL })).toBeVisible();
  });

  test("a recalled sentence being topped up says more are coming", async (): Promise<void> => {
    sentenceCompletionsSignal.value = FILLING_STATE;
    const { container } = render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    expect(await screen.findByText(MAKING_MORE_MESSAGE)).toBeVisible();
    expect(container.querySelector("[role=\"status\"]")?.textContent).toBe(MAKING_MORE_MESSAGE);
    // The recalled sentence is tappable while the rest are being made.
    expect(screen.getByRole("button", { name: SENTENCES[0] })).toBeVisible();
  });

  test("nothing on screen yet says sentences are being made", async (): Promise<void> => {
    sentenceCompletionsSignal.value = WORKING_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    expect(await screen.findByText(WORKING_MESSAGE)).toBeVisible();
  });

  test("the fill lands below the recalled sentence and above the typing area", async (): Promise<void> => {
    sentenceCompletionsSignal.value = FILLING_STATE;
    const { container } = render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    sentenceCompletionsSignal.value = { ...READY_STATE, sentences: SENTENCES };

    await screen.findByRole("button", { name: SENTENCES[2] });
    // The sentence is the button's accessible name now, not a text node: the Bliss row carries
    // the visible English.
    const shown = [...container.querySelectorAll(".sentenceChoice")]
      .map((button) => button.getAttribute("aria-label"));
    expect(shown).toEqual(SENTENCES);
    // The form is the last thing on screen, after every sentence.
    expect(container.querySelector(".sentenceChoices > form")?.className).toBe("sentenceTypeYourOwn");
  });

  test("speaking typed text while a query runs stops the query", async (): Promise<void> => {
    sentenceCompletionsSignal.value = FILLING_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    await userEvent.type(screen.getByPlaceholderText(TYPE_YOUR_OWN_HINT), "I want a snack.");
    await userEvent.click(screen.getByRole("button", { name: SPEAK_BUTTON_LABEL }));

    // No more sentences are wanted, so the progress line stops.
    expect(sentenceCompletionsSignal.value.status).toBe("ready");
    const log = readMessageLog();
    expect(log).toHaveLength(1);
    expect(log[0].translation).toMatchObject({
      model: "phony-model:12b",
      candidates: [SENTENCES[0]],
      sentence: "I want a snack.",
      source: "typed"
    });
  });

  test("typed text with no sentences yet is recorded with the model that was asked", async (): Promise<void> => {
    sentenceCompletionsSignal.value = WORKING_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    await userEvent.type(screen.getByPlaceholderText(TYPE_YOUR_OWN_HINT), "I want a snack.");
    await userEvent.click(screen.getByRole("button", { name: SPEAK_BUTTON_LABEL }));

    const log = readMessageLog();
    expect(log[0].translation).toMatchObject({
      model: "phony-model:12b", candidates: [], sentence: "I want a snack.", source: "typed"
    });
  });

  test("tapping the recalled sentence while a query runs stops the query", async (): Promise<void> => {
    sentenceCompletionsSignal.value = FILLING_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    await userEvent.click(screen.getByRole("button", { name: SENTENCES[0] }));

    expect(sentenceCompletionsSignal.value.status).toBe("ready");
    expect(mockedSpeak).toHaveBeenCalledWith(SENTENCES[0]);
  });

  test("Speak is unavailable while the box is empty", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);
    const speakButton = screen.getByRole("button", { name: SPEAK_BUTTON_LABEL });

    expect(speakButton).toHaveAttribute("aria-disabled", "true");

    // `aria-disabled`, not `disabled`: the button has to stay focusable or a switch or
    // eye-gaze user loses their scan position the moment the box empties.
    expect(speakButton).not.toHaveAttribute("disabled");
    speakButton.focus();
    expect(document.activeElement).toBe(speakButton);

    await userEvent.type(screen.getByPlaceholderText(TYPE_YOUR_OWN_HINT), "hi");
    await waitFor(() => {
      expect(speakButton).toHaveAttribute("aria-disabled", "false");
    });
  });

  test("whitespace alone leaves Speak unavailable", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    await userEvent.type(screen.getByPlaceholderText(TYPE_YOUR_OWN_HINT), "   ");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: SPEAK_BUTTON_LABEL }))
        .toHaveAttribute("aria-disabled", "true");
    });
  });

  test("pressing Speak on an empty box says it is unavailable", async (): Promise<void> => {
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    await userEvent.click(screen.getByRole("button", { name: SPEAK_BUTTON_LABEL }));

    expect(mockedSpeakUnavailable).toHaveBeenCalledWith(SPEAK_BUTTON_LABEL);
    expect(readMessageLog()).toEqual([]);
  });

  test("an arriving fill does not pull focus back to the first sentence", async (): Promise<void> => {
    sentenceCompletionsSignal.value = FILLING_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    const firstChoice = await screen.findByRole("button", { name: SENTENCES[0] });
    await waitFor(() => {
      expect(document.activeElement).toBe(firstChoice);
    });

    // The user has scanned past the recalled sentence by the time the rest arrive.
    const doneButton = screen.getByRole("button", { name: DONE_BUTTON_LABEL });
    doneButton.focus();
    sentenceCompletionsSignal.value = { ...READY_STATE, sentences: SENTENCES };

    await screen.findByRole("button", { name: SENTENCES[2] });
    expect(document.activeElement).toBe(doneButton);
  });

  test("sentences arriving do not interrupt someone typing", async (): Promise<void> => {
    sentenceCompletionsSignal.value = WORKING_STATE;
    render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

    const textBox = screen.getByPlaceholderText(TYPE_YOUR_OWN_HINT);
    await userEvent.type(textBox, "I want");
    sentenceCompletionsSignal.value = READY_STATE;

    await screen.findByRole("button", { name: SENTENCES[0] });
    expect(document.activeElement).toBe(textBox);
  });

  describe("marking the model's sentences", (): void => {

    beforeEach((): void => {
      adaptivePaletteGlobals.config.markAiSuggestions = true;
    });

    const RECALLED_STATE = {
      status: "ready" as const,
      sentences: SENTENCES,
      recalledSentence: SENTENCES[0],
      model: "phony-model:12b",
      telegraphicMessage: "me hungry"
    };

    const choiceButtons = (): HTMLElement[] =>
      [...document.querySelectorAll<HTMLElement>(".sentenceChoice")];

    test("marks the model's sentences and leaves the recalled one plain", (): void => {
      sentenceCompletionsSignal.value = RECALLED_STATE;
      render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

      const [recalled, fromModel] = choiceButtons();

      expect(recalled).not.toHaveClass("aiSuggestion");
      expect(recalled.querySelector(".aiBadge")).toBeNull();
      // Bliss symbols are on in this file's config, so an unmarked sentence still names
      // itself for a screen reader.
      expect(recalled).toHaveAttribute("aria-label", SENTENCES[0]);

      expect(fromModel).toHaveClass("aiSuggestion");
      expect(fromModel.querySelector(".aiBadge")?.textContent).toBe(AI_BADGE_TEXT);
      expect(fromModel).toHaveAttribute("aria-label", aiSuggestionLabel(SENTENCES[1]));
    });

    // Nothing was recalled, so every sentence on screen is the model's.
    test("marks every sentence when none was recalled", (): void => {
      sentenceCompletionsSignal.value = { ...RECALLED_STATE, recalledSentence: null };
      render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

      expect(choiceButtons()).toHaveLength(SENTENCES.length);
      choiceButtons().forEach((button) => expect(button).toHaveClass("aiSuggestion"));
    });

    // Without the Bliss row, an unmarked sentence takes its name from its own text and needs
    // no `aria-label`; a marked one still needs the prefix.
    test("marks the sentences with the Bliss rows turned off", (): void => {
      setTestConfig({
        markAiSuggestions: true,
        telegraphicTranslation: {
          model: "phony-model:12b",
          numSentences: 3,
          systemPrompt: "prompt",
          userPrompt: "prompt",
          showBlissSentence: false
        }
      });
      sentenceCompletionsSignal.value = RECALLED_STATE;
      render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

      const [recalled, fromModel] = choiceButtons();
      expect(recalled).not.toHaveAttribute("aria-label");
      expect(fromModel).toHaveAttribute("aria-label", aiSuggestionLabel(SENTENCES[1]));
    });

    // The name a screen reader hears carries the prefix; what is spoken and logged must not.
    test("tapping a marked sentence speaks and logs the sentence, not its name", async (): Promise<void> => {
      sentenceCompletionsSignal.value = RECALLED_STATE;
      render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

      await userEvent.click(screen.getByRole("button", { name: aiSuggestionLabel(SENTENCES[1]) }));

      expect(mockedSpeak).toHaveBeenCalledWith(SENTENCES[1]);
      const log = readMessageLog();
      expect(log).toHaveLength(1);
      expect(log[0].translation).toMatchObject({ sentence: SENTENCES[1], source: "chosen" });
    });

    test("marks nothing when the setting is off", (): void => {
      adaptivePaletteGlobals.config.markAiSuggestions = false;
      sentenceCompletionsSignal.value = RECALLED_STATE;
      render(html`<${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />`);

      expect(document.querySelectorAll(".aiSuggestion")).toHaveLength(0);
      expect(document.querySelectorAll(".aiBadge")).toHaveLength(0);
      // The name it had before the feature existed is unchanged.
      expect(choiceButtons()[1]).toHaveAttribute("aria-label", SENTENCES[1]);
    });
  });
});
