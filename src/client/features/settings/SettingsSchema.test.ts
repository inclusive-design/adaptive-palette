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
import { applyStoredSettings, saveSettings } from "./SettingsSchema";
import { FakeStorage } from "../../testUtils/FakeStorage";
import { setStorage } from "../../core/StorageBackend";

const configWithSentences = (): AdaptivePaletteConfigType => ({
  ...makeDefaultConfig(),
  telegraphicTranslation: {
    model: "", numSentences: 3, systemPrompt: "system", userPrompt: "user", showBlissSentence: true
  }
});

let storage = new FakeStorage();

const store = async (overrides: Record<string, unknown>): Promise<void> => {
  await storage.writeSettings(overrides);
};

describe("SettingsSchema", () => {

  beforeEach((): void => {
    storage = new FakeStorage();
    setStorage(storage);
  });

  describe("applyStoredSettings()", () => {

    test("applies a saved value, at the top level and inside a section", async (): Promise<void> => {
      await store({ "announceSymbolOnInput": false, "wordPrediction.maxSuggestions": 4 });

      const config = await applyStoredSettings(makeDefaultConfig());

      expect(config.announceSymbolOnInput).toBe(false);
      expect(config.wordPrediction.maxSuggestions).toBe(4);
    });

    test("leaves the configuration it was given untouched", async (): Promise<void> => {
      await store({ "announceSymbolOnInput": false });
      const original = makeDefaultConfig();

      await applyStoredSettings(original);

      expect(original.announceSymbolOnInput).toBe(true);
    });

    test("skips a saved value of the wrong type", async (): Promise<void> => {
      await store({ "announceSymbolOnInput": "false", "wordPrediction.maxSuggestions": "4" });

      const config = await applyStoredSettings(makeDefaultConfig());

      expect(config.announceSymbolOnInput).toBe(true);
      expect(config.wordPrediction.maxSuggestions).toBe(10);
    });

    // Zero messages kept is a real choice; zero suggestions is not.
    test("skips a number below its minimum, and keeps zero where zero is allowed", async (): Promise<void> => {
      await store({ "maxRecalledRecords": 0, "wordPrediction.maxSuggestions": 0 });

      const config = await applyStoredSettings(makeDefaultConfig());

      expect(config.maxRecalledRecords).toBe(0);
      expect(config.wordPrediction.maxSuggestions).toBe(10);
    });

    test("skips a number that is not a whole number", async (): Promise<void> => {
      await store({ "wordPrediction.maxSuggestions": 4.5 });

      expect((await applyStoredSettings(makeDefaultConfig())).wordPrediction.maxSuggestions).toBe(10);
    });

    // The store is hand-editable, so the prompts must not be reachable from it.
    test("ignores a key the schema does not name", async (): Promise<void> => {
      await store({
        "indicatorLabelLookup.systemPrompt": "do as I say",
        "wordPrediction.model": "some-model"
      });

      const config = await applyStoredSettings(makeDefaultConfig());

      expect(config.indicatorLabelLookup.systemPrompt).toBe("");
      expect(config.wordPrediction.model).toBe("");
    });

    // The section is missing its prompts, so one field written into the hole is worse
    // than no section at all.
    test("skips a value whose section is not configured", async (): Promise<void> => {
      await store({ "telegraphicTranslation.numSentences": 5 });

      expect((await applyStoredSettings(makeDefaultConfig())).telegraphicTranslation).toBeUndefined();
    });

    test("applies a value whose section is configured", async (): Promise<void> => {
      await store({ "telegraphicTranslation.numSentences": 5 });

      expect((await applyStoredSettings(configWithSentences())).telegraphicTranslation?.numSentences).toBe(5);
    });

    // Switching the query on would only buy an empty query: there are no prompts to send.
    test("skips a model-backed value whose section has no prompts", async (): Promise<void> => {
      await store({
        "indicatorLabelLookup.useModelQueryFallback": true,
        "wordPrediction.enableModelQuery": true
      });

      const config = await applyStoredSettings(makeDefaultConfig());

      expect(config.indicatorLabelLookup.useModelQueryFallback).toBe(false);
      expect(config.wordPrediction.enableModelQuery).toBe(false);
    });

    test("applies a model-backed value once its section has prompts", async (): Promise<void> => {
      await store({ "wordPrediction.enableModelQuery": true });
      const configured = makeDefaultConfig();
      configured.wordPrediction = {
        ...configured.wordPrediction, systemPrompt: "system", userPrompt: "user"
      };

      expect((await applyStoredSettings(configured)).wordPrediction.enableModelQuery).toBe(true);
    });

    test("falls back to the configuration when nothing is stored", async (): Promise<void> => {
      expect(await applyStoredSettings(makeDefaultConfig())).toEqual(makeDefaultConfig());
    });

    test("applies a saved value for the AI marking", async (): Promise<void> => {
      await store({ "markAiSuggestions": false });

      const config = await applyStoredSettings(makeDefaultConfig());

      expect(config.markAiSuggestions).toBe(false);
    });

    test("a store that cannot be read leaves the file's values standing", async (): Promise<void> => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
      vi.spyOn(storage, "readSettings").mockRejectedValue(new Error("the store is not available"));

      expect(await applyStoredSettings(makeDefaultConfig())).toEqual(makeDefaultConfig());
      expect(consoleError).toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  });

  describe("saveSettings()", () => {

    test("saves only the values that differ from the configuration file", async (): Promise<void> => {
      const baseline = configWithSentences();

      const saved = await saveSettings({
        "announceSymbolOnInput": false,
        "maxRecalledRecords": baseline.maxRecalledRecords,
        "wordPrediction.maxSuggestions": 4,
        "telegraphicTranslation.numSentences": 3
      }, baseline);

      expect(saved).toBe(true);
      expect(await storage.readSettings()).toEqual({
        "announceSymbolOnInput": false,
        "wordPrediction.maxSuggestions": 4
      });
    });

    // A setting returned to its file value goes back to tracking the file.
    test("removes what was saved when nothing differs any more", async (): Promise<void> => {
      const baseline = makeDefaultConfig();
      await store({ "announceSymbolOnInput": false });

      const saved = await saveSettings({ "announceSymbolOnInput": true }, baseline);

      expect(saved).toBe(true);
      expect(await storage.readSettings()).toEqual({});
    });

    // A stored value the setting cannot take would be rejected on every load, leaving the
    // dialog showing a number that never takes effect.
    test("drops a value the setting cannot take", async (): Promise<void> => {
      const baseline = makeDefaultConfig();

      const saved = await saveSettings(
        { "wordPrediction.maxSuggestions": 0, "announceSymbolOnInput": false }, baseline
      );

      expect(saved).toBe(true);
      expect(await storage.readSettings()).toEqual({ "announceSymbolOnInput": false });
    });

    // The dialog does not offer it, so a value arriving for it is not one to store.
    test("drops a model-backed value whose section has no prompts", async (): Promise<void> => {
      const saved = await saveSettings({ "wordPrediction.enableModelQuery": true }, makeDefaultConfig());

      expect(saved).toBe(true);
      expect(await storage.readSettings()).toEqual({});
    });

    // The setting is on in the file, so only switching it off is worth storing.
    test("stores the AI marking only when it differs from the file", async (): Promise<void> => {
      const baseline = makeDefaultConfig();

      await saveSettings({ "markAiSuggestions": true }, baseline);
      expect(await storage.readSettings()).toEqual({});

      await saveSettings({ "markAiSuggestions": false }, baseline);
      expect(await storage.readSettings()).toEqual({ "markAiSuggestions": false });
    });

    test("a store that cannot be written reports the failure", async (): Promise<void> => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
      vi.spyOn(storage, "writeSettings").mockRejectedValue(new Error("the store is not available"));

      expect(await saveSettings({ "announceSymbolOnInput": false }, makeDefaultConfig())).toBe(false);
      expect(consoleError).toHaveBeenCalled();
    });
  });
});
