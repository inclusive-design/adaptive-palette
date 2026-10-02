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
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/preact";
import { userEvent } from "vitest/browser";
import { html } from "htm/preact";

import { adaptivePaletteGlobals, settingsSavedCount } from "../../state/GlobalData";
import { loadConfig } from "../../core/Config";
import type { AdaptivePaletteConfigType } from "../../index.d";
import { type AdaptivePaletteStorage, setStorage } from "../../core/StorageBackend";
import { MemoryStorage } from "../../core/MemoryStorage";
import { IndexedDbStorage } from "../../core/IndexedDbStorage";
import { SettingsDialog, dependentNote } from "./SettingsDialog";
import { isLocalHost } from "../../core/OllamaApi";
import { en } from "../../i18n/en";
import { languageSignal } from "../../i18n/I18n";

// Under the test runner the hostname is always `localhost`. The real function stays in place
// so every test sees the local page unless it asks for the hosted one.
vi.mock("../../core/OllamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../core/OllamaApi")>();
  return { ...actual, isLocalHost: vi.fn(actual.isLocalHost) };
});

// A spy that passes the write through to the store, so a test can check what was written.
// A test of the failure path makes it reject.
let writeSettingsSpy: MockInstance;

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
const MARK_AI_LABEL = "Mark AI suggestions";
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
    const storage = new MemoryStorage();
    setStorage(storage);
    writeSettingsSpy = vi.spyOn(storage, "writeSettings");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.mocked(isLocalHost).mockReset();
    adaptivePaletteGlobals.config = originalConfig;
    adaptivePaletteGlobals.fileConfig = originalFileConfig;
    adaptivePaletteGlobals.models = originalModels;
    languageSignal.value = "en";
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
    expect(control).toHaveAccessibleDescription(en.settingsModelNote);
    // The four model settings, and "Mark AI suggestions", which has nothing to mark without one.
    expect(screen.getAllByText(en.settingsModelNote)).toHaveLength(5);
    expect(screen.getByLabelText(MARK_AI_LABEL)).toHaveAccessibleDescription(en.settingsModelNote);

    // Clicked directly: `userEvent` refuses an `aria-disabled` control, which is the
    // point of the attribute. The control's own handler is what keeps the box unchanged.
    const wasChecked = (control as HTMLInputElement).checked;
    (control as HTMLInputElement).click();
    expect((control as HTMLInputElement).checked).toBe(wasChecked);
  });

  // There is no Ollama to start on the hosted site, so the note says where the features are.
  test("says the AI features are desktop-only on the hosted site", () => {
    vi.mocked(isLocalHost).mockReturnValue(false);
    withConfig({}, []);
    renderDialog();

    const control = screen.getByLabelText(MODEL_WORDS_LABEL);
    expect(control).toHaveAttribute("aria-disabled", "true");
    expect(control).toHaveAccessibleDescription(en.hosted);
    expect(screen.getAllByText(en.hosted)).toHaveLength(5);
    expect(screen.getByLabelText(MARK_AI_LABEL)).toHaveAccessibleDescription(en.hosted);
    expect(screen.queryByText(en.settingsModelNote)).not.toBeInTheDocument();
  });

  test("leaves those settings editable when Ollama has a model", async () => {
    withConfig({});
    renderDialog();

    const control = screen.getByLabelText(MODEL_WORDS_LABEL);
    expect(control).not.toHaveAttribute("aria-disabled");
    expect(screen.getByLabelText(MARK_AI_LABEL)).not.toHaveAttribute("aria-disabled");
    expect(screen.queryByText(en.settingsModelNote)).not.toBeInTheDocument();

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
    expect(screen.getByLabelText("Messages to remember")).toHaveAttribute("min", "0");
  });

  // The store is gone once the erase has finished, so every later write fails where only
  // the console sees it. Leaving "Save and close" live would tell the user the app was
  // still saving when it was not.
  test("stops offering to save once the data has been erased", async () => {
    withConfig({});
    vi.spyOn(window, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    renderDialog();

    await userEvent.click(screen.getByRole("button", { name: en.eraseLabel }));
    await userEvent.click(await screen.findByRole("button", { name: en.eraseConfirm }));

    await waitFor(() => expect(screen.getByText(en.eraseDone)).toBeInTheDocument());
    const save = screen.getByRole("button", { name: en.settingsSave });
    expect(save).toHaveAttribute("aria-disabled", "true");

    // Marked unavailable rather than disabled, so the click has to be refused as well.
    // `fireEvent` because the button is still clickable: only the handler turns it away.
    fireEvent.click(save);
    expect(writeSettingsSpy).not.toHaveBeenCalled();
  });

  // Nothing is left to save, but the user still has to get out of the dialog.
  test("still closes once the data has been erased", async () => {
    withConfig({});
    vi.spyOn(window, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    const onRequestClose = vi.fn();
    renderDialog(onRequestClose);

    await userEvent.click(screen.getByRole("button", { name: en.eraseLabel }));
    await userEvent.click(await screen.findByRole("button", { name: en.eraseConfirm }));
    await waitFor(() => expect(screen.getByText(en.eraseDone)).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: en.close }));
    expect(onRequestClose).toHaveBeenCalled();
  });

  test("saves nothing when the dialog is closed", async () => {
    withConfig({});
    const onRequestClose = vi.fn();
    renderDialog(onRequestClose);

    await userEvent.click(screen.getByLabelText(SPEAK_LABEL));
    await userEvent.click(screen.getByRole("button", { name: en.close }));

    expect(onRequestClose).toHaveBeenCalled();
    expect(writeSettingsSpy).not.toHaveBeenCalled();
  });

  test("saves the changed settings alone", async () => {
    withConfig({});
    renderDialog();

    await userEvent.click(screen.getByLabelText(SPEAK_LABEL));
    await userEvent.click(screen.getByRole("button", { name: en.settingsSave }));

    await waitFor(() => {
      expect(writeSettingsSpy).toHaveBeenCalledWith(
        { "announceSymbolOnInput": !fileConfig.announceSymbolOnInput }
      );
    });
  });

  test("saving a language switches the UI to it at once", async () => {
    withConfig({});
    renderDialog();

    await userEvent.selectOptions(screen.getByLabelText(en.settingLanguage), "Svenska");
    await userEvent.click(screen.getByRole("button", { name: en.settingsSave }));

    await waitFor(() => expect(languageSignal.value).toBe("sv"));
    expect(writeSettingsSpy).toHaveBeenCalledWith({ "language": "sv" });
  });

  // `?lang=` sets the page's language but not `config.language`, which holds the saved choice.
  test("saving with the language untouched keeps the saved choice, not the URL's", async () => {
    withConfig({ language: "sv" });
    languageSignal.value = "en";
    renderDialog();

    expect(screen.getByLabelText(en.settingLanguage)).toHaveValue("en");
    await userEvent.click(screen.getByRole("button", { name: en.settingsSave }));

    await waitFor(() => expect(writeSettingsSpy).toHaveBeenCalledWith({ "language": "sv" }));
    expect(languageSignal.value).toBe("en");
  });

  test("shows its text in the current language", () => {
    withConfig({});
    languageSignal.value = "sv";
    renderDialog();

    expect(screen.getByRole("button", { name: "Spara och stäng" })).toBeInTheDocument();
    expect(screen.getByText("Allmänt")).toBeInTheDocument();
  });

  // A field emptied before its row was switched off skips the form's own validation, a
  // readonly control being exempt from it.
  test("does not save a number the setting cannot take", async () => {
    withConfig({});
    renderDialog();

    await userEvent.clear(screen.getByLabelText(SUGGESTIONS_LABEL));
    await userEvent.click(screen.getByLabelText(WORDS_LABEL));
    await userEvent.click(screen.getByRole("button", { name: en.settingsSave }));

    await waitFor(() => {
      expect(writeSettingsSpy).toHaveBeenCalledWith(
        { "wordPrediction.show": !fileConfig.wordPrediction.show }
      );
    });
  });

  // Closing after a failed write would look like the settings had taken.
  test("reports a storage failure and keeps the dialog open", async () => {
    withConfig({});
    writeSettingsSpy.mockRejectedValue(new Error("storage is not available"));
    const onRequestClose = vi.fn();
    const savedCount = settingsSavedCount.value;
    renderDialog(onRequestClose);

    await userEvent.click(screen.getByLabelText(SPEAK_LABEL));
    await userEvent.click(screen.getByRole("button", { name: en.settingsSave }));

    expect(await screen.findByRole("alert")).toHaveTextContent(en.settingsFailed);
    expect(onRequestClose).not.toHaveBeenCalled();
    expect(settingsSavedCount.value).toBe(savedCount);
    expect(adaptivePaletteGlobals.config.announceSymbolOnInput).toBe(fileConfig.announceSymbolOnInput);
  });
});

// The same save path runs on both versions: IndexedDB on the desktop version, memory on the
// public website. A reload here would restart the test runner, so a test that finishes also
// shows the page was not reloaded.
describe.each([
  ["MemoryStorage", (): Promise<AdaptivePaletteStorage> => Promise.resolve(new MemoryStorage())],
  ["IndexedDbStorage", async (): Promise<AdaptivePaletteStorage> => {
    const storage = new IndexedDbStorage(`SettingsDialogTest-${Date.now()}`);
    await storage.open();
    return storage;
  }]
])("saving the settings with %s", (_name, makeStorage) => {

  beforeAll(async () => {
    fileConfig = await loadConfig();
  });

  beforeEach(async () => {
    setStorage(await makeStorage());
  });

  afterEach(() => {
    cleanup();
    adaptivePaletteGlobals.config = originalConfig;
    adaptivePaletteGlobals.fileConfig = originalFileConfig;
    adaptivePaletteGlobals.models = originalModels;
  });

  test("applies the settings, tells the page and closes", async () => {
    withConfig({});
    const onRequestClose = vi.fn();
    const savedCount = settingsSavedCount.value;
    renderDialog(onRequestClose);

    await userEvent.click(screen.getByLabelText(SPEAK_LABEL));
    await userEvent.click(screen.getByRole("button", { name: en.settingsSave }));

    await waitFor(() => expect(onRequestClose).toHaveBeenCalled());
    expect(adaptivePaletteGlobals.config.announceSymbolOnInput).toBe(!fileConfig.announceSymbolOnInput);
    expect(settingsSavedCount.value).toBe(savedCount + 1);
  });
});
