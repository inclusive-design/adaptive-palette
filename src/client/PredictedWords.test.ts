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

import { render, screen, cleanup } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { html } from "htm/preact";

import { adaptivePaletteGlobals, changeEncodingContents, initAdaptivePaletteGlobals } from "./GlobalData";
import { MESSAGE_LOG_KEY, saveMessageRecord } from "./MessageLog";
import { PredictedWords, PREDICTED_WORDS_LABEL } from "./PredictedWords";
import { SymbolEncodingType } from "./index.d";

describe("PredictedWords component", (): void => {

  const message = (...labels: string[]): SymbolEncodingType[] =>
    labels.map((label) => ({ label, composition: 1840, modifierInfo: [] }));

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  beforeEach((): void => {
    window.localStorage.removeItem(MESSAGE_LOG_KEY);
    adaptivePaletteGlobals.config.maxStoredRecords = 100;
    adaptivePaletteGlobals.config.wordPrediction = { show: true, maxSuggestions: 4 };
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
    changeEncodingContents.value = { payloads: message("I", "want"), caretPosition: 1 };
    render(html`<${PredictedWords} />`);
    expect(screen.getByRole("group").querySelector("button")?.textContent).toContain("juice");
  });

  test("choosing a suggestion adds it to the message", async (): Promise<void> => {
    const user = userEvent.setup();
    changeEncodingContents.value = { payloads: message("I", "want"), caretPosition: 1 };
    render(html`<${PredictedWords} />`);

    await user.click(screen.getByRole("group").querySelectorAll("button")[0]);
    expect(changeEncodingContents.value.payloads.map((payload) => payload.label))
      .toEqual(["I", "want", "juice"]);
    expect(changeEncodingContents.value.caretPosition).toBe(2);
  });

  test("renders nothing when the feature is turned off", (): void => {
    adaptivePaletteGlobals.config.wordPrediction = { show: false, maxSuggestions: 4 };
    const { container } = render(html`<${PredictedWords} />`);
    expect(container.innerHTML).toBe("");
  });

  // The row holds its place so that the rest of the page does not shift as words are added.
  test("keeps a row of empty slots when there is nothing to suggest", (): void => {
    window.localStorage.removeItem(MESSAGE_LOG_KEY);
    changeEncodingContents.value = { payloads: message("unknown"), caretPosition: 0 };
    render(html`<${PredictedWords} />`);

    const suggestions = screen.getByRole("group", { name: PREDICTED_WORDS_LABEL });
    expect(suggestions.querySelectorAll("button")).toHaveLength(0);
    expect(suggestions.querySelectorAll(".predictedWordEmpty")).toHaveLength(4);
  });
});
