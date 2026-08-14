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
import { render, screen, cleanup, waitFor } from "@testing-library/preact";
import { userEvent } from "vitest/browser";
import { html } from "htm/preact";

import { adaptivePaletteGlobals } from "../../state/GlobalData";
import { loadConfig } from "../../core/Config";
import type { AdaptivePaletteConfigType } from "../../index.d";
import { SETTINGS_KEY } from "./SettingsSchema";
import {
  SettingsDialog, SAVE_LABEL, CLOSE_LABEL, CONFIRM_LABEL, DECLINE_LABEL,
  MODEL_NOTE, WARNING_TEXT, FAILURE_MESSAGE, dependentNote
} from "./SettingsDialog";

// Saving reloads the page, which would restart the test runner. Making local storage throw
// keeps every test on the failure path, where the dialog stays put; what the dialog asked
// to write is what these tests are about.
let setItemSpy: MockInstance;

const originalConfig = adaptivePaletteGlobals.config;
const originalFileConfig = adaptivePaletteGlobals.fileConfig;
const originalModels = adaptivePaletteGlobals.models;

// The values in `config.json`, which is what the dialog compares against when saving.
let fileConfig: AdaptivePaletteConfigType;

const SPEAK_LABEL = "Speak each symbol as I add it";
const MODEL_WORDS_LABEL = "Ask the AI model for suggestions";
const SUGGESTIONS_LABEL = "Suggestions to show";
const SENTENCES_LABEL = "Sentence choices to offer";
const WORDS_LABEL = "Enable word suggestion";
const LABEL_FALLBACK_LABEL = "Ask the AI model when no label is found";

/**
 * Point the globals at the file's configuration, changed as given, and say how many models
 * Ollama has.
 */
const withConfig = (changes: Partial<AdaptivePaletteConfigType>, models: string[] = ["a-model"]): void => {
  adaptivePaletteGlobals.config = { ...fileConfig, ...changes };
  adaptivePaletteGlobals.fileConfig = fileConfig;
  adaptivePaletteGlobals.models = models;
};

const renderDialog = (onRequestClose = (): void => undefined) =>
  render(html`<${SettingsDialog} onRequestClose=${onRequestClose} />`);

describe("SettingsDialog", () => {

  beforeAll(async () => {
    fileConfig = await loadConfig();
  });

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation((): void => {
      throw new Error("storage is not available");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation((): void => {
      throw new Error("storage is not available");
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    adaptivePaletteGlobals.config = originalConfig;
    adaptivePaletteGlobals.fileConfig = originalFileConfig;
    adaptivePaletteGlobals.models = originalModels;
  });

  test("groups the settings under their headings, in the order of the schema", () => {
    withConfig({});
    renderDialog();

    const headings = Array.from(document.querySelectorAll("legend")).map((legend) => legend.textContent);
    expect(headings).toEqual([
      "General", "Symbol entry", "Word prediction", "Sentences", "Indicator labels"
    ]);
  });

  // The user cannot supply the prompts the section also needs, so there is nothing to
  // offer and no empty heading is left behind.
  test("leaves out a group whose section is not configured", () => {
    withConfig({ telegraphicTranslation: undefined });
    renderDialog();

    const headings = Array.from(document.querySelectorAll("legend")).map((legend) => legend.textContent);
    expect(headings).not.toContain("Sentences");
    expect(screen.queryByLabelText(SENTENCES_LABEL)).not.toBeInTheDocument();
  });

  // The prompts are what a query needs, and the dialog cannot supply them.
  test("leaves out a model-backed setting whose section has no prompts", () => {
    withConfig({
      indicatorLabelLookup: {
        useModelQueryFallback: false, model: "", systemPrompt: "", userPrompt: ""
      }
    });
    renderDialog();

    const headings = Array.from(document.querySelectorAll("legend")).map((legend) => legend.textContent);
    expect(headings).not.toContain("Indicator labels");
    expect(screen.queryByLabelText(LABEL_FALLBACK_LABEL)).not.toBeInTheDocument();
  });

  test("marks the settings needing a model unavailable when Ollama has none", () => {
    withConfig({}, []);
    renderDialog();

    const control = screen.getByLabelText(MODEL_WORDS_LABEL);
    expect(control).toHaveAttribute("aria-disabled", "true");
    // Reachable, unlike a natively disabled control, so the note explaining it can be read.
    expect(control).not.toHaveAttribute("disabled");
    expect(control).toHaveAccessibleDescription(MODEL_NOTE);
    expect(screen.getAllByText(MODEL_NOTE)).toHaveLength(3);

    // Clicked directly: `userEvent` refuses an `aria-disabled` control, which is the
    // point of the attribute. The control's own handler is what keeps the box unchanged.
    const wasChecked = (control as HTMLInputElement).checked;
    (control as HTMLInputElement).click();
    expect((control as HTMLInputElement).checked).toBe(wasChecked);
  });

  test("leaves those settings editable when Ollama has a model", async () => {
    withConfig({});
    renderDialog();

    const control = screen.getByLabelText(MODEL_WORDS_LABEL);
    expect(control).not.toHaveAttribute("aria-disabled");
    expect(screen.queryByText(MODEL_NOTE)).not.toBeInTheDocument();

    const wasChecked = (control as HTMLInputElement).checked;
    await userEvent.click(control);
    expect((control as HTMLInputElement).checked).toBe(!wasChecked);
  });

  test("switches off the rest of the word prediction settings when it is turned off", async () => {
    withConfig({});
    renderDialog();

    await userEvent.click(screen.getByLabelText(WORDS_LABEL));

    const note = dependentNote(WORDS_LABEL);
    const suggestions = screen.getByLabelText(SUGGESTIONS_LABEL);
    expect(suggestions).toHaveAttribute("aria-disabled", "true");
    expect(suggestions).toHaveAccessibleDescription(note);
    // The model note gives way: turning the switch back on is what the user can do here.
    const modelWords = screen.getByLabelText(MODEL_WORDS_LABEL);
    expect(modelWords).toHaveAccessibleDescription(note);

    const wasChecked = (modelWords as HTMLInputElement).checked;
    (modelWords as HTMLInputElement).click();
    expect((modelWords as HTMLInputElement).checked).toBe(wasChecked);

    // Turning it back on frees them again.
    await userEvent.click(screen.getByLabelText(WORDS_LABEL));
    expect(screen.getByLabelText(SUGGESTIONS_LABEL)).not.toHaveAttribute("aria-disabled");
  });

  test("shows the number settings with their bounds, so the browser rejects a bad one", () => {
    withConfig({});
    renderDialog();

    const suggestions = screen.getByLabelText(SUGGESTIONS_LABEL);
    expect(suggestions).toHaveAttribute("min", "1");
    expect(suggestions).toHaveAttribute("step", "1");
    expect(suggestions).toBeRequired();
    expect(screen.getByLabelText("Messages to keep")).toHaveAttribute("min", "0");
  });

  test("saves nothing when the dialog is closed", async () => {
    withConfig({});
    const onRequestClose = vi.fn();
    renderDialog(onRequestClose);

    await userEvent.click(screen.getByLabelText(SPEAK_LABEL));
    await userEvent.click(screen.getByRole("button", { name: CLOSE_LABEL }));

    expect(onRequestClose).toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  test("warns before saving, and saves nothing while the warning is up", async () => {
    withConfig({});
    renderDialog();

    await userEvent.click(screen.getByRole("button", { name: SAVE_LABEL }));

    expect(await screen.findByText(WARNING_TEXT)).toBeInTheDocument();
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  test("declining the warning returns to the form with the edits still there", async () => {
    withConfig({});
    renderDialog();

    await userEvent.click(screen.getByLabelText(SPEAK_LABEL));
    await userEvent.click(screen.getByRole("button", { name: SAVE_LABEL }));
    await userEvent.click(await screen.findByRole("button", { name: DECLINE_LABEL }));

    const control = await screen.findByLabelText(SPEAK_LABEL);
    expect(control).toHaveProperty("checked", !fileConfig.announceSymbolOnInput);
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  test("saves the changed settings alone once the warning is confirmed", async () => {
    withConfig({});
    renderDialog();

    await userEvent.click(screen.getByLabelText(SPEAK_LABEL));
    await userEvent.click(screen.getByRole("button", { name: SAVE_LABEL }));
    await userEvent.click(await screen.findByRole("button", { name: CONFIRM_LABEL }));

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith(
        SETTINGS_KEY,
        JSON.stringify({ "announceSymbolOnInput": !fileConfig.announceSymbolOnInput })
      );
    });
  });

  // A field emptied before its row was switched off skips the form's own validation, a
  // readonly control being exempt from it.
  test("does not save a number the setting cannot take", async () => {
    withConfig({});
    renderDialog();

    await userEvent.clear(screen.getByLabelText(SUGGESTIONS_LABEL));
    await userEvent.click(screen.getByLabelText(WORDS_LABEL));
    await userEvent.click(screen.getByRole("button", { name: SAVE_LABEL }));
    await userEvent.click(await screen.findByRole("button", { name: CONFIRM_LABEL }));

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith(
        SETTINGS_KEY,
        JSON.stringify({ "wordPrediction.show": !fileConfig.wordPrediction.show })
      );
    });
  });

  // Reloading after a failed write would look like the settings had taken.
  test("reports a storage failure instead of closing", async () => {
    withConfig({});
    renderDialog();

    await userEvent.click(screen.getByLabelText(SPEAK_LABEL));
    await userEvent.click(screen.getByRole("button", { name: SAVE_LABEL }));
    await userEvent.click(await screen.findByRole("button", { name: CONFIRM_LABEL }));

    expect(await screen.findByRole("alert")).toHaveTextContent(FAILURE_MESSAGE);
  });

  // Nothing has been written yet on the next attempt, so the last failure must not be
  // announced again as if it had.
  test("drops the failure message when the warning is declined", async () => {
    withConfig({});
    renderDialog();

    await userEvent.click(screen.getByLabelText(SPEAK_LABEL));
    await userEvent.click(screen.getByRole("button", { name: SAVE_LABEL }));
    await userEvent.click(await screen.findByRole("button", { name: CONFIRM_LABEL }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: DECLINE_LABEL }));
    await userEvent.click(screen.getByRole("button", { name: SAVE_LABEL }));

    expect(await screen.findByText(WARNING_TEXT)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
