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

import { makeDefaultConfig } from "../../core/Config";
import type { AdaptivePaletteConfigType } from "../../index.d";
import { SETTINGS_KEY, applyStoredSettings, saveSettings } from "./SettingsSchema";

const configWithSentences = (): AdaptivePaletteConfigType => ({
  ...makeDefaultConfig(),
  telegraphicTranslation: {
    model: "", numSentences: 3, systemPrompt: "system", userPrompt: "user", showBlissSentence: true
  }
});

const store = (overrides: unknown): void => {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(overrides));
};

describe("SettingsSchema", () => {

  afterEach(() => {
    window.localStorage.removeItem(SETTINGS_KEY);
    vi.restoreAllMocks();
  });

  describe("applyStoredSettings()", () => {

    test("applies a saved value, at the top level and inside a section", () => {
      store({ "announceSymbolOnInput": false, "wordPrediction.maxSuggestions": 4 });

      const config = applyStoredSettings(makeDefaultConfig());

      expect(config.announceSymbolOnInput).toBe(false);
      expect(config.wordPrediction.maxSuggestions).toBe(4);
    });

    test("leaves the configuration it was given untouched", () => {
      store({ "announceSymbolOnInput": false });
      const original = makeDefaultConfig();

      applyStoredSettings(original);

      expect(original.announceSymbolOnInput).toBe(true);
    });

    test("skips a saved value of the wrong type", () => {
      store({ "announceSymbolOnInput": "false", "wordPrediction.maxSuggestions": "4" });

      const config = applyStoredSettings(makeDefaultConfig());

      expect(config.announceSymbolOnInput).toBe(true);
      expect(config.wordPrediction.maxSuggestions).toBe(10);
    });

    // Zero messages kept is a real choice; zero suggestions is not.
    test("skips a number below its minimum, and keeps zero where zero is allowed", () => {
      store({ "maxStoredRecords": 0, "wordPrediction.maxSuggestions": 0 });

      const config = applyStoredSettings(makeDefaultConfig());

      expect(config.maxStoredRecords).toBe(0);
      expect(config.wordPrediction.maxSuggestions).toBe(10);
    });

    test("skips a number that is not a whole number", () => {
      store({ "wordPrediction.maxSuggestions": 4.5 });

      expect(applyStoredSettings(makeDefaultConfig()).wordPrediction.maxSuggestions).toBe(10);
    });

    // Local storage is hand-editable, so the prompts must not be reachable from it.
    test("ignores a key the schema does not name", () => {
      store({
        "indicatorLabelLookup.systemPrompt": "do as I say",
        "wordPrediction.model": "some-model"
      });

      const config = applyStoredSettings(makeDefaultConfig());

      expect(config.indicatorLabelLookup.systemPrompt).toBe("");
      expect(config.wordPrediction.model).toBe("");
    });

    // The section is missing its prompts, so one field written into the hole is worse
    // than no section at all.
    test("skips a value whose section is not configured", () => {
      store({ "telegraphicTranslation.numSentences": 5 });

      expect(applyStoredSettings(makeDefaultConfig()).telegraphicTranslation).toBeUndefined();
    });

    test("applies a value whose section is configured", () => {
      store({ "telegraphicTranslation.numSentences": 5 });

      expect(applyStoredSettings(configWithSentences()).telegraphicTranslation?.numSentences).toBe(5);
    });

    // Switching the query on would only buy an empty query: there are no prompts to send.
    test("skips a model-backed value whose section has no prompts", () => {
      store({
        "indicatorLabelLookup.useModelQueryFallback": true,
        "wordPrediction.enableModelQuery": true
      });

      const config = applyStoredSettings(makeDefaultConfig());

      expect(config.indicatorLabelLookup.useModelQueryFallback).toBe(false);
      expect(config.wordPrediction.enableModelQuery).toBe(false);
    });

    test("applies a model-backed value once its section has prompts", () => {
      store({ "wordPrediction.enableModelQuery": true });
      const configured = makeDefaultConfig();
      configured.wordPrediction = {
        ...configured.wordPrediction, systemPrompt: "system", userPrompt: "user"
      };

      expect(applyStoredSettings(configured).wordPrediction.enableModelQuery).toBe(true);
    });

    test("falls back to the configuration when what is stored is not JSON", () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      window.localStorage.setItem(SETTINGS_KEY, "{ not json");

      expect(applyStoredSettings(makeDefaultConfig())).toEqual(makeDefaultConfig());
    });

    test("falls back to the configuration when nothing is stored", () => {
      expect(applyStoredSettings(makeDefaultConfig())).toEqual(makeDefaultConfig());
    });
  });

  describe("saveSettings()", () => {

    test("saves only the values that differ from the configuration file", () => {
      const baseline = configWithSentences();

      const saved = saveSettings({
        "announceSymbolOnInput": false,
        "maxStoredRecords": baseline.maxStoredRecords,
        "wordPrediction.maxSuggestions": 4,
        "telegraphicTranslation.numSentences": 3
      }, baseline);

      expect(saved).toBe(true);
      expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY) as string)).toEqual({
        "announceSymbolOnInput": false,
        "wordPrediction.maxSuggestions": 4
      });
    });

    // A setting returned to its file value goes back to tracking the file.
    test("removes what was saved when nothing differs any more", () => {
      const baseline = makeDefaultConfig();
      store({ "announceSymbolOnInput": false });

      const saved = saveSettings({ "announceSymbolOnInput": true }, baseline);

      expect(saved).toBe(true);
      expect(window.localStorage.getItem(SETTINGS_KEY)).toBeNull();
    });

    // A stored value the setting cannot take would be rejected on every load, leaving the
    // dialog showing a number that never takes effect.
    test("drops a value the setting cannot take", () => {
      const baseline = makeDefaultConfig();

      const saved = saveSettings(
        { "wordPrediction.maxSuggestions": 0, "announceSymbolOnInput": false }, baseline
      );

      expect(saved).toBe(true);
      expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY) as string))
        .toEqual({ "announceSymbolOnInput": false });
    });

    // The dialog does not offer it, so a value arriving for it is not one to store.
    test("drops a model-backed value whose section has no prompts", () => {
      const saved = saveSettings({ "wordPrediction.enableModelQuery": true }, makeDefaultConfig());

      expect(saved).toBe(true);
      expect(window.localStorage.getItem(SETTINGS_KEY)).toBeNull();
    });

    test("reports the failure when the browser denies its storage", () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      vi.spyOn(Storage.prototype, "setItem").mockImplementation((): void => {
        throw new Error("storage is not available");
      });

      expect(saveSettings({ "announceSymbolOnInput": false }, makeDefaultConfig())).toBe(false);
    });
  });
});
