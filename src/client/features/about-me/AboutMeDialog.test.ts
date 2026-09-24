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
import { render, screen, cleanup, waitFor, within } from "@testing-library/preact";
import { userEvent } from "vitest/browser";
import { html } from "htm/preact";

import { adaptivePaletteGlobals } from "../../state/GlobalData";
import { setStorage } from "../../core/StorageBackend";
import { MemoryStorage } from "../../core/MemoryStorage";
import { NO_MODELS_MESSAGE } from "../../core/OllamaApi";
import { setTestConfig } from "../../testUtils/TestConfig";
import { mockedSpeakUnavailable } from "../../testUtils/SpeechUtilsMock";
import type { DismissedFactType, AboutMeFactType } from "../../index.d";
import { aboutMeSignal, FactSuggestionType } from "./AboutMeState";
import { requestFactSuggestions, LearningResultType } from "./AboutMeExtractionUtils";
import {
  AboutMeDialog, NOTES_HEADING, LEARNT_HEADING, SUGGEST_LABEL, CATEGORY_LABEL, NOTE_LABEL,
  ADD_LABEL, EDIT_LABEL, EDIT_NOTE_LABEL, DELETE_LABEL, SAVE_LABEL, CANCEL_LABEL, ACCEPT_LABEL,
  REJECT_LABEL, RESTORE_LABEL, CLOSE_LABEL, NO_NOTES_TEXT, NOTHING_DISMISSED_TEXT,
  NOTHING_NEW_TEXT, DISMISSED_HEADING, suggestionsReadyText, factDateText, ADDED_LABEL,
  learntUpToText, MORE_WAITING_TEXT, NO_NEW_MESSAGES_TEXT
} from "./AboutMeDialog";

vi.mock("../../utils/SpeechUtils");

vi.mock("./AboutMeExtractionUtils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./AboutMeExtractionUtils")>();
  return { ...actual, requestFactSuggestions: vi.fn() };
});

const mockedRequest = vi.mocked(requestFactSuggestions);
const originalConfig = adaptivePaletteGlobals.config;

const ABOUT_ME_CONFIG = { model: "", systemPrompt: "Find facts.", userPrompt: "{{messages}}", messagesPerRun: 200 };

const fact = (overrides: Partial<AboutMeFactType> = {}): AboutMeFactType => ({
  id: "fact-1", category: "Family", text: "has a dog named Rex",
  source: "manual", addedAt: "2026-09-22T00:00:00.000Z", ...overrides
});

const renderDialog = (onRequestClose = (): void => undefined) =>
  render(html`<${AboutMeDialog} onRequestClose=${onRequestClose} />`);

const learntSection = (): HTMLElement => screen.getByRole("region", { name: LEARNT_HEADING });

const dismissedSection = (): HTMLElement => screen.getByRole("region", { name: DISMISSED_HEADING });

const turnedDown = (text: string): DismissedFactType => ({ category: "Preferences", text });

const cardFor = (text: string): HTMLElement | null => screen.getByText(text).closest("li");

/**
 * Make "Suggest updates" behave as the real one does: add the suggestions to the About Me
 * pending list and report the run.
 * @param {FactSuggestionType[]} suggestions - What the model found.
 * @param {boolean} hasMore - Whether more messages are waiting.
 */
const suggestWith = (suggestions: FactSuggestionType[], hasMore = false): void => {
  mockedRequest.mockImplementation((): Promise<LearningResultType> => {
    const aboutMe = aboutMeSignal.peek();
    aboutMeSignal.value = { ...aboutMe, pending: [...aboutMe.pending, ...suggestions] };
    return Promise.resolve({ status: "learnt", found: suggestions.length, hasMore });
  });
};

describe("factDateText", (): void => {

  test("formats an ISO timestamp as a local date", (): void => {
    // Asserted loosely: the exact string depends on the browser's locale and timezone,
    // and these tests run in Chromium, Firefox and WebKit.
    expect(factDateText("2026-09-22T12:00:00.000Z")).toContain("2026");
  });

  test("gives nothing when there is no timestamp to show", (): void => {
    expect(factDateText(undefined)).toBe("");
    expect(factDateText(null)).toBe("");
    expect(factDateText("")).toBe("");
    expect(factDateText("not a date")).toBe("");
  });

});

describe("learntUpToText", (): void => {

  test("names the date of the last message learnt from", (): void => {
    const text = learntUpToText("2026-09-24T15:15:00.000Z");
    expect(text).toContain("Learnt from your messages up to");
    expect(text).toContain("2026");
  });

  test("gives nothing when there is no usable timestamp", (): void => {
    expect(learntUpToText(undefined)).toBe("");
    expect(learntUpToText("")).toBe("");
    expect(learntUpToText("not a date")).toBe("");
  });
});

describe("AboutMeDialog", (): void => {

  beforeEach((): void => {
    setStorage(new MemoryStorage());
    aboutMeSignal.value = { facts: [], dismissed: [], pending: [] };
    setTestConfig({ aboutMe: ABOUT_ME_CONFIG });
    mockedRequest.mockReset();
    mockedSpeakUnavailable.mockClear();
  });

  afterEach((): void => {
    cleanup();
    adaptivePaletteGlobals.config = originalConfig;
  });

  test("shows all three sections", (): void => {
    renderDialog();
    expect(screen.getByRole("region", { name: NOTES_HEADING })).toBeInTheDocument();
    expect(learntSection()).toBeInTheDocument();
    expect(dismissedSection()).toBeInTheDocument();
    expect(screen.getByText(NO_NOTES_TEXT)).toBeInTheDocument();
    expect(screen.getByText(NOTHING_DISMISSED_TEXT)).toBeInTheDocument();
  });

  test("the add-note form comes before the notes", (): void => {
    aboutMeSignal.value = { facts: [fact()], dismissed: [], pending: [] };
    renderDialog();
    const addButton = screen.getByRole("button", { name: ADD_LABEL });
    const firstNote = cardFor("has a dog named Rex") as HTMLElement;
    expect(addButton.compareDocumentPosition(firstNote) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test("a fact saved without a usable date renders without one", (): void => {
    // Both directions in one test: without the first assertion, dropping the date line
    // altogether would leave the second one passing for the wrong reason.
    aboutMeSignal.value = {
      facts: [fact(), fact({ id: "fact-2", text: "likes tea", addedAt: "" })],
      dismissed: [], pending: [] };
    renderDialog();
    expect(cardFor("has a dog named Rex")?.textContent).toContain(ADDED_LABEL);
    expect(cardFor("likes tea")?.textContent).not.toContain(ADDED_LABEL);
  });

  test("lists what was turned down, so it can be added back later", (): void => {
    aboutMeSignal.value = { facts: [], dismissed: [turnedDown("likes tea")], pending: [] };
    renderDialog();
    const inDismissed = within(dismissedSection());
    expect(inDismissed.getByText("likes tea")).toBeInTheDocument();
    expect(inDismissed.getByText("Preferences")).toBeInTheDocument();
  });

  test("adding back a dismissed suggestion moves it to what has been learnt", async (): Promise<void> => {
    aboutMeSignal.value = { facts: [], dismissed: [turnedDown("likes tea")], pending: [] };
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: `${RESTORE_LABEL}: likes tea` }));

    await waitFor(() => expect(aboutMeSignal.value.dismissed).toEqual([]));
    expect(within(learntSection()).getByText("likes tea")).toBeInTheDocument();
    expect(aboutMeSignal.value.facts[0]).toMatchObject({
      category: "Preferences", text: "likes tea", source: "suggested"
    });
  });

  test("adding one back moves focus to the next one", async (): Promise<void> => {
    aboutMeSignal.value = { facts: [], dismissed: [turnedDown("likes tea"), turnedDown("likes cats")], pending: [] };
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: `${RESTORE_LABEL}: likes tea` }));

    await waitFor(() => expect(
      screen.getByRole("button", { name: `${RESTORE_LABEL}: likes cats` })
    ).toHaveFocus());
  });

  test("adding the last one back moves focus to Add note", async (): Promise<void> => {
    aboutMeSignal.value = { facts: [], dismissed: [turnedDown("likes tea")], pending: [] };
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: `${RESTORE_LABEL}: likes tea` }));

    await waitFor(() => expect(screen.getByRole("button", { name: ADD_LABEL })).toHaveFocus());
  });

  test("adds a note", async (): Promise<void> => {
    renderDialog();
    await userEvent.selectOptions(screen.getByLabelText(CATEGORY_LABEL), "Preferences");
    await userEvent.fill(screen.getByLabelText(NOTE_LABEL), "likes tea");
    await userEvent.click(screen.getByRole("button", { name: ADD_LABEL }));

    expect(await screen.findByText("likes tea")).toBeInTheDocument();
    expect(aboutMeSignal.value.facts[0]).toMatchObject({
      category: "Preferences", text: "likes tea", source: "manual"
    });
    expect(screen.getByLabelText(NOTE_LABEL)).toHaveValue("");
  });

  test("edits a note", async (): Promise<void> => {
    aboutMeSignal.value = { facts: [fact()], dismissed: [], pending: [] };
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: `${EDIT_LABEL}: has a dog named Rex` }));
    await userEvent.fill(screen.getByLabelText(EDIT_NOTE_LABEL), "has a dog named Max");
    await userEvent.click(screen.getByRole("button", { name: SAVE_LABEL }));

    expect(await screen.findByText("has a dog named Max")).toBeInTheDocument();
    expect(aboutMeSignal.value.facts[0].text).toBe("has a dog named Max");
  });

  test("deletes a note", async (): Promise<void> => {
    aboutMeSignal.value = { facts: [fact()], dismissed: [], pending: [] };
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: `${DELETE_LABEL}: has a dog named Rex` }));

    await waitFor(() => expect(screen.queryByText("has a dog named Rex")).not.toBeInTheDocument());
    expect(aboutMeSignal.value.dismissed).toEqual([]);
  });

  test("a learnt fact can be deleted but not edited, and is then dismissed", async (): Promise<void> => {
    aboutMeSignal.value = { facts: [fact({ source: "suggested" })], dismissed: [], pending: [] };
    renderDialog();
    const learnt = within(learntSection());
    expect(learnt.getByText("has a dog named Rex")).toBeInTheDocument();
    expect(learnt.queryByRole("button", { name: `${EDIT_LABEL}: has a dog named Rex` })).not.toBeInTheDocument();

    await userEvent.click(learnt.getByRole("button", { name: `${DELETE_LABEL}: has a dog named Rex` }));

    await waitFor(() => expect(aboutMeSignal.value.dismissed)
      .toEqual([{ category: "Family", text: "has a dog named Rex" }]));
  });

  test("hides Suggest updates when the section is not configured", (): void => {
    setTestConfig({});
    renderDialog();
    expect(screen.queryByRole("button", { name: SUGGEST_LABEL })).not.toBeInTheDocument();
  });

  test("accepting a suggestion adds it to what has been learnt", async (): Promise<void> => {
    suggestWith([
      { category: "Family", text: "sister Ana" },
      { category: "Preferences", text: "likes tea" }
    ]);
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: SUGGEST_LABEL }));
    await userEvent.click(await screen.findByRole("button", { name: `${ACCEPT_LABEL}: sister Ana` }));

    await waitFor(() => expect(
      screen.queryByRole("button", { name: `${ACCEPT_LABEL}: sister Ana` })
    ).not.toBeInTheDocument());
    expect(within(learntSection()).getByText("sister Ana")).toBeInTheDocument();
    expect(aboutMeSignal.value.facts[0]).toMatchObject({ text: "sister Ana", source: "suggested" });
    expect(screen.getByRole("button", { name: `${ACCEPT_LABEL}: likes tea` })).toBeInTheDocument();
  });

  test("rejecting a suggestion dismisses it", async (): Promise<void> => {
    suggestWith([{ category: "Preferences", text: "likes tea" }]);
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: SUGGEST_LABEL }));
    await userEvent.click(await screen.findByRole("button", { name: `${REJECT_LABEL}: likes tea` }));

    await waitFor(() => expect(aboutMeSignal.value.dismissed)
      .toEqual([{ category: "Preferences", text: "likes tea" }]));
    expect(aboutMeSignal.value.facts).toEqual([]);
    // Scoped to the learnt section: a rejected suggestion is kept in `dismissed` and is listed
    // there, so an unscoped query now matches the dismissed card. What this asserts is that
    // rejecting did not add a fact.
    expect(within(learntSection()).queryByText("likes tea")).not.toBeInTheDocument();
  });

  test("says so when there is nothing new", async (): Promise<void> => {
    suggestWith([]);
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: SUGGEST_LABEL }));
    expect(await screen.findByText(NOTHING_NEW_TEXT)).toBeInTheDocument();
  });

  test("shows why a suggestion request failed", async (): Promise<void> => {
    mockedRequest.mockRejectedValue(new Error(NO_MODELS_MESSAGE));
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: SUGGEST_LABEL }));
    expect(await screen.findByText(NO_MODELS_MESSAGE)).toBeInTheDocument();
  });

  test("announces how many suggestions arrived and moves focus to the first Accept", async (): Promise<void> => {
    suggestWith([
      { category: "Family", text: "sister Ana" },
      { category: "Preferences", text: "likes tea" }
    ]);
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: SUGGEST_LABEL }));

    expect(await screen.findByText(suggestionsReadyText(2))).toBeInTheDocument();
    await waitFor(() => expect(
      screen.getByRole("button", { name: `${ACCEPT_LABEL}: sister Ana` })
    ).toHaveFocus());
  });

  test("editing a note moves focus to its text box", async (): Promise<void> => {
    aboutMeSignal.value = { facts: [fact()], dismissed: [], pending: [] };
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: `${EDIT_LABEL}: has a dog named Rex` }));

    await waitFor(() => expect(screen.getByLabelText(EDIT_NOTE_LABEL)).toHaveFocus());
  });

  test("saving an edit puts focus back on that note's Edit button", async (): Promise<void> => {
    aboutMeSignal.value = { facts: [fact()], dismissed: [], pending: [] };
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: `${EDIT_LABEL}: has a dog named Rex` }));
    await userEvent.fill(screen.getByLabelText(EDIT_NOTE_LABEL), "has a dog named Max");
    await userEvent.click(screen.getByRole("button", { name: SAVE_LABEL }));

    await waitFor(() => expect(
      screen.getByRole("button", { name: `${EDIT_LABEL}: has a dog named Max` })
    ).toHaveFocus());
  });

  test("cancelling an edit puts focus back on that note's Edit button", async (): Promise<void> => {
    aboutMeSignal.value = { facts: [fact()], dismissed: [], pending: [] };
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: `${EDIT_LABEL}: has a dog named Rex` }));
    await userEvent.click(screen.getByRole("button", { name: CANCEL_LABEL }));

    await waitFor(() => expect(
      screen.getByRole("button", { name: `${EDIT_LABEL}: has a dog named Rex` })
    ).toHaveFocus());
  });

  test("deleting a note moves focus to the next note's Delete button", async (): Promise<void> => {
    aboutMeSignal.value = {
      facts: [fact(), fact({ id: "fact-2", text: "likes tea", category: "Preferences" })],
      dismissed: [], pending: [] };
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: `${DELETE_LABEL}: has a dog named Rex` }));

    await waitFor(() => expect(
      screen.getByRole("button", { name: `${DELETE_LABEL}: likes tea` })
    ).toHaveFocus());
  });

  test("deleting the last note moves focus to Add note", async (): Promise<void> => {
    aboutMeSignal.value = { facts: [fact()], dismissed: [], pending: [] };
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: `${DELETE_LABEL}: has a dog named Rex` }));

    await waitFor(() => expect(screen.getByRole("button", { name: ADD_LABEL })).toHaveFocus());
  });

  test("deleting the last learnt fact moves focus to Suggest updates", async (): Promise<void> => {
    aboutMeSignal.value = { facts: [fact({ source: "suggested" })], dismissed: [], pending: [] };
    renderDialog();
    await userEvent.click(within(learntSection())
      .getByRole("button", { name: `${DELETE_LABEL}: has a dog named Rex` }));

    await waitFor(() => expect(screen.getByRole("button", { name: SUGGEST_LABEL })).toHaveFocus());
  });

  test("accepting a suggestion moves focus to the next one", async (): Promise<void> => {
    suggestWith([
      { category: "Family", text: "sister Ana" },
      { category: "Preferences", text: "likes tea" }
    ]);
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: SUGGEST_LABEL }));
    await userEvent.click(await screen.findByRole("button", { name: `${ACCEPT_LABEL}: sister Ana` }));

    await waitFor(() => expect(
      screen.getByRole("button", { name: `${ACCEPT_LABEL}: likes tea` })
    ).toHaveFocus());
  });

  test("rejecting the last suggestion moves focus to Suggest updates", async (): Promise<void> => {
    suggestWith([{ category: "Preferences", text: "likes tea" }]);
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: SUGGEST_LABEL }));
    await userEvent.click(await screen.findByRole("button", { name: `${REJECT_LABEL}: likes tea` }));

    await waitFor(() => expect(screen.getByRole("button", { name: SUGGEST_LABEL })).toHaveFocus());
  });

  test("shows pending suggestions without asking again", (): void => {
    aboutMeSignal.value = { facts: [], dismissed: [], pending: [turnedDown("likes tea")] };
    renderDialog();
    expect(screen.getByRole("button", { name: `${ACCEPT_LABEL}: likes tea` })).toBeInTheDocument();
    expect(mockedRequest).not.toHaveBeenCalled();
  });

  test("shows how far learning has got", (): void => {
    aboutMeSignal.value = {
      facts: [], dismissed: [], pending: [], learntUpTo: { id: 3, timestamp: "2026-09-24T15:15:00.000Z" }
    };
    renderDialog();
    expect(screen.getByText(learntUpToText("2026-09-24T15:15:00.000Z"))).toBeInTheDocument();
  });

  test("says when more messages are waiting", async (): Promise<void> => {
    suggestWith([], true);
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: SUGGEST_LABEL }));
    expect(await screen.findByText(MORE_WAITING_TEXT)).toBeInTheDocument();
  });

  test("says when the last batch read the rest", async (): Promise<void> => {
    suggestWith([], false);
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: SUGGEST_LABEL }));
    expect(await screen.findByText(NO_NEW_MESSAGES_TEXT)).toBeInTheDocument();
  });

  test("says when there are no new messages at all", async (): Promise<void> => {
    mockedRequest.mockResolvedValue({ status: "upToDate" });
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: SUGGEST_LABEL }));
    expect(await screen.findByText(NO_NEW_MESSAGES_TEXT)).toBeInTheDocument();
  });

  test("moves focus to the first new suggestion, after ones already pending", async (): Promise<void> => {
    aboutMeSignal.value = { facts: [], dismissed: [], pending: [turnedDown("likes tea")] };
    suggestWith([{ category: "Family", text: "sister Ana" }]);
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: SUGGEST_LABEL }));
    await waitFor(() => expect(
      screen.getByRole("button", { name: `${ACCEPT_LABEL}: sister Ana` })
    ).toHaveFocus());
  });

  test("the new note needs text", (): void => {
    renderDialog();
    expect(screen.getByLabelText(NOTE_LABEL)).toBeRequired();
  });

  test("asks the model once however often Suggest updates is activated", async (): Promise<void> => {
    let finishRequest = (result: LearningResultType): void => { void result; };
    mockedRequest.mockReturnValue(new Promise((resolve) => { finishRequest = resolve; }));
    renderDialog();
    const suggestButton = screen.getByRole("button", { name: SUGGEST_LABEL });

    // Both activations land before Preact re-renders, which is what a second switch hit does.
    suggestButton.click();
    suggestButton.click();

    expect(mockedRequest).toHaveBeenCalledTimes(1);
    expect(mockedSpeakUnavailable).toHaveBeenCalledWith(SUGGEST_LABEL);
    finishRequest({ status: "learnt", found: 0, hasMore: false });
    expect(await screen.findByText(NOTHING_NEW_TEXT)).toBeInTheDocument();
  });

  test("Close asks to close the dialog", async (): Promise<void> => {
    const onRequestClose = vi.fn();
    renderDialog(onRequestClose);
    await userEvent.click(screen.getByRole("button", { name: CLOSE_LABEL }));
    expect(onRequestClose).toHaveBeenCalled();
  });
});
