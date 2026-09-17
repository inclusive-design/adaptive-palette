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
import { userEvent as browserUserEvent } from "vitest/browser";
import { html } from "htm/preact";

import { changeEncodingContents } from "../../state/GlobalData";
import { setTestConfig } from "../../testUtils/TestConfig";
import { editMessage, setEditGuard } from "../../core/MessageEdit";
import {
  discardEditPromptSignal, focusedMessageSignal, guardEdit, IDLE_SENTENCE_STATE, READY_DISCARD_PROMPT,
  sentenceCompletionsSignal, typedSentenceSignal
} from "./TelegraphicTranslationState";
import { INPUT_AREA_ID } from "../../cells/ContentEncoding";
import { SentenceChoices } from "./SentenceChoices";
import {
  DiscardEditDialog, CHANGE_ANYWAY_LABEL, DISCARD_DIALOG_TITLE, KEEP_SENTENCES_LABEL
} from "./DiscardEditDialog";
import { resetMessageLog } from "../../testUtils/MessageLogTestUtils";

vi.mock("../../utils/SpeechUtils");

// The dialog asking whether an edit may throw the sentence work away. It is raised by editing the
// message for real, since the question comes from the guard the gate consults.
describe("DiscardEditDialog", (): void => {

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

  const WORKING_STATE = { ...READY_STATE, status: "working" as const, sentences: [] };

  const MESSAGE_CONTENTS = {
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

  beforeEach(async (): Promise<void> => {
    await resetMessageLog();
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
    // Sentence buttons are found by the bare sentence, so the AI marking is off.
    setTestConfig({
      markAiSuggestions: false,
      telegraphicTranslation: {
        model: "phony-model:12b", numSentences: 3, systemPrompt: "prompt", userPrompt: "prompt",
        showBlissSentence: true
      }
    });
    setEditGuard(guardEdit);
  });

  afterEach(async (): Promise<void> => {
    cleanup();
    setEditGuard(null);
    sentenceCompletionsSignal.value = IDLE_SENTENCE_STATE;
    discardEditPromptSignal.value = null;
    typedSentenceSignal.value = "";
    focusedMessageSignal.value = null;
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
    await resetMessageLog();
  });

  // The page as the app draws it: the input area, where focus goes when the dialog closes, the
  // sentence area, and the dialog mounted on its own.
  const renderPage = (): void => {
    render(html`
      <div>
        <div id=${INPUT_AREA_ID} tabindex="0" role="textbox" aria-label="Input Area"></div>
        <${SentenceChoices} id=${CELL_ID} options=${CELL_OPTIONS} />
        <${DiscardEditDialog} />
      </div>
    `);
  };

  // Put sentences for the message on screen, then change the message.
  const editTheMessage = async (): Promise<void> => {
    editMessage(MESSAGE_CONTENTS);
    sentenceCompletionsSignal.value = READY_STATE;
    renderPage();
    editMessage(EDITED_CONTENTS);
    await screen.findByRole("dialog", { name: DISCARD_DIALOG_TITLE });
  };

  test("an edit that would discard the sentences asks first", async (): Promise<void> => {
    await editTheMessage();

    expect(screen.getByRole("dialog", { name: DISCARD_DIALOG_TITLE })).toBeVisible();
    expect(screen.getByText(READY_DISCARD_PROMPT)).toBeVisible();
  });

  // The edit never reaches the signal while the question is up, so the message on screen is the
  // one the user last agreed to.
  test("the edit is held back while the question is on screen", async (): Promise<void> => {
    await editTheMessage();

    expect(changeEncodingContents.value).toEqual(MESSAGE_CONTENTS);
  });

  test("Change anyway applies the edit and drops the sentences", async (): Promise<void> => {
    await editTheMessage();

    await userEvent.click(screen.getByRole("button", { name: CHANGE_ANYWAY_LABEL }));

    expect(changeEncodingContents.value).toEqual(EDITED_CONTENTS);
    expect(sentenceCompletionsSignal.value).toEqual(IDLE_SENTENCE_STATE);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  test("Keep sentences leaves the message as it was", async (): Promise<void> => {
    await editTheMessage();

    await userEvent.click(screen.getByRole("button", { name: KEEP_SENTENCES_LABEL }));

    expect(changeEncodingContents.value).toEqual(MESSAGE_CONTENTS);
    expect(sentenceCompletionsSignal.value).toMatchObject({ status: "ready", sentences: SENTENCES });
  });

  // `userEvent` here comes from `vitest/browser`: Escape closing a `<dialog>` is a UA default
  // action, which only runs for trusted events.
  test("Escape keeps the sentences, as losing them must be deliberate", async (): Promise<void> => {
    await editTheMessage();

    await browserUserEvent.keyboard("{Escape}");

    await waitFor(() => {
      expect(changeEncodingContents.value).toEqual(MESSAGE_CONTENTS);
    });
    expect(sentenceCompletionsSignal.value).toMatchObject({ status: "ready", sentences: SENTENCES });
  });

  // Sentences can land behind the question. Keeping them is a decision to use them, so they must
  // be reachable without re-scanning the page.
  test("sentences arriving behind the question get focus when they are kept", async (): Promise<void> => {
    editMessage(MESSAGE_CONTENTS);
    sentenceCompletionsSignal.value = WORKING_STATE;
    renderPage();
    editMessage(EDITED_CONTENTS);
    await screen.findByRole("dialog", { name: DISCARD_DIALOG_TITLE });

    sentenceCompletionsSignal.value = READY_STATE;
    await userEvent.click(screen.getByRole("button", { name: KEEP_SENTENCES_LABEL }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: SENTENCES[0] })).toHaveFocus();
    });
  });

  // A screen without a sentence area: there is no sentence to move focus to, so the one-shot
  // focus move stays unspent for when the sentences are drawn.
  test("keeping sentences that are not drawn leaves their focus move unspent", async (): Promise<void> => {
    editMessage(MESSAGE_CONTENTS);
    sentenceCompletionsSignal.value = READY_STATE;
    render(html`
      <div>
        <div id=${INPUT_AREA_ID} tabindex="0" role="textbox" aria-label="Input Area"></div>
        <${DiscardEditDialog} />
      </div>
    `);
    editMessage(EDITED_CONTENTS);
    await screen.findByRole("dialog", { name: DISCARD_DIALOG_TITLE });

    await userEvent.click(screen.getByRole("button", { name: KEEP_SENTENCES_LABEL }));

    await waitFor(() => {
      expect(document.getElementById(INPUT_AREA_ID)).toHaveFocus();
    });
    expect(focusedMessageSignal.value).toBeNull();
  });

  test("closing the dialog puts focus on the input area", async (): Promise<void> => {
    await editTheMessage();

    await userEvent.click(screen.getByRole("button", { name: KEEP_SENTENCES_LABEL }));

    await waitFor(() => {
      expect(document.getElementById(INPUT_AREA_ID)).toHaveFocus();
    });
  });
});
