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
import {
  loadConfig, DISABLED_MODEL_QUERY, DEFAULT_MAX_STORED_RECORDS, DEFAULT_MAX_SUGGESTIONS
} from "./Config";

/**
 * Stub `fetch` so that "/config.json" resolves to `configBody`.
 */
const stubConfigFetch = (configBody: unknown): void => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(configBody)
  })));
};

afterEach((): void => {
  vi.unstubAllGlobals();
});

// A valid `indicatorLabelLookup` section
const INDICATOR_SECTION = {
  useModelQueryFallback: false,
  model: "",
  systemPrompt: "You are a linguistic assistant.",
  userPrompt: "Word: {{word}}"
};

describe("loadConfig telegraphicTranslation section", (): void => {

  const TELEMSG_SECTION = {
    model: "phony-model:12b",
    numSentences: 3,
    systemPrompt: "Make {{numSentences}} sentences.",
    userPrompt: "Telegraphic message: {{telegraphicMessage}}"
  };

  test("a valid section is loaded", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: INDICATOR_SECTION,
      telegraphicTranslation: TELEMSG_SECTION
    });
    const config = await loadConfig();
    expect(config.telegraphicTranslation).toEqual(TELEMSG_SECTION);
  });

  test("a missing section leaves the feature unconfigured", async (): Promise<void> => {
    stubConfigFetch({ indicatorLabelLookup: INDICATOR_SECTION });
    const config = await loadConfig();
    expect(config.telegraphicTranslation).toBeUndefined();
  });

  test("a malformed section leaves the feature unconfigured", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: INDICATOR_SECTION,
      telegraphicTranslation: { ...TELEMSG_SECTION, numSentences: "three" }
    });
    const config = await loadConfig();
    expect(config.telegraphicTranslation).toBeUndefined();
  });

  test("an empty prompt leaves the feature unconfigured", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: INDICATOR_SECTION,
      telegraphicTranslation: { ...TELEMSG_SECTION, systemPrompt: "   " }
    });
    const config = await loadConfig();
    expect(config.telegraphicTranslation).toBeUndefined();
  });

  test("a bad indicatorLabelLookup section does not discard telegraphicTranslation", async (): Promise<void> => {
    stubConfigFetch({ telegraphicTranslation: TELEMSG_SECTION });
    const config = await loadConfig();
    expect(config.indicatorLabelLookup.useModelQueryFallback).toBe(false);
    expect(config.telegraphicTranslation).toEqual(TELEMSG_SECTION);
  });
});

describe("loadConfig indicatorLabelLookup section", (): void => {

  const DISABLED = { useModelQueryFallback: false, model: "", systemPrompt: "", userPrompt: "" };

  test("a valid section is loaded with both prompts", async (): Promise<void> => {
    const section = { ...INDICATOR_SECTION, useModelQueryFallback: true, model: "phony-model:12b" };
    stubConfigFetch({ indicatorLabelLookup: section });
    const config = await loadConfig();
    expect(config.indicatorLabelLookup).toEqual(section);
  });

  test("a missing prompt disables the fallback tier", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: { useModelQueryFallback: true, model: "phony-model:12b", systemPrompt: "Only this one." }
    });
    const config = await loadConfig();
    expect(config.indicatorLabelLookup).toEqual(DISABLED);
  });

  test("an empty prompt disables the fallback tier", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: { ...INDICATOR_SECTION, useModelQueryFallback: true, userPrompt: "   " }
    });
    const config = await loadConfig();
    expect(config.indicatorLabelLookup).toEqual(DISABLED);
  });

  test("a missing section disables the fallback tier", async (): Promise<void> => {
    stubConfigFetch({});
    const config = await loadConfig();
    expect(config.indicatorLabelLookup).toEqual(DISABLED);
  });
});

describe("loadConfig maxStoredRecords", (): void => {

  test("a positive integer is loaded as given", async (): Promise<void> => {
    stubConfigFetch({ indicatorLabelLookup: INDICATOR_SECTION, maxStoredRecords: 42 });
    const config = await loadConfig();
    expect(config.maxStoredRecords).toBe(42);
  });

  // Zero is how logging is turned off while the features that log stay available.
  test("zero is kept rather than treated as missing", async (): Promise<void> => {
    stubConfigFetch({ indicatorLabelLookup: INDICATOR_SECTION, maxStoredRecords: 0 });
    const config = await loadConfig();
    expect(config.maxStoredRecords).toBe(0);
  });

  test("a missing or malformed value falls back to the default", async (): Promise<void> => {
    stubConfigFetch({ indicatorLabelLookup: INDICATOR_SECTION });
    const missing = await loadConfig();
    expect(missing.maxStoredRecords).toBe(DEFAULT_MAX_STORED_RECORDS);

    stubConfigFetch({ indicatorLabelLookup: INDICATOR_SECTION, maxStoredRecords: -5 });
    const malformed = await loadConfig();
    expect(malformed.maxStoredRecords).toBe(DEFAULT_MAX_STORED_RECORDS);
  });
});

describe("loadConfig wordPrediction section", (): void => {

  test("a valid section is loaded as given", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: INDICATOR_SECTION,
      wordPrediction: { show: true, maxSuggestions: 6 }
    });
    const config = await loadConfig();
    expect(config.wordPrediction)
      .toEqual({ show: true, maxSuggestions: 6, ...DISABLED_MODEL_QUERY });
  });

  test("a missing section turns the feature off", async (): Promise<void> => {
    stubConfigFetch({ indicatorLabelLookup: INDICATOR_SECTION });
    const config = await loadConfig();
    expect(config.wordPrediction)
      .toEqual({ show: false, maxSuggestions: DEFAULT_MAX_SUGGESTIONS, ...DISABLED_MODEL_QUERY });
  });

  test("a malformed maxSuggestions falls back while the feature stays on", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: INDICATOR_SECTION,
      wordPrediction: { show: true, maxSuggestions: 0 }
    });
    const config = await loadConfig();
    expect(config.wordPrediction)
      .toEqual({ show: true, maxSuggestions: DEFAULT_MAX_SUGGESTIONS, ...DISABLED_MODEL_QUERY });
  });

  test("a fully configured model query is loaded as given", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: INDICATOR_SECTION,
      wordPrediction: {
        show: true, maxSuggestions: 6, enableModelQuery: true, model: "phony-model:12b",
        systemPrompt: "List {{numWords}} words.", userPrompt: "Message so far: {{message}}"
      }
    });
    const config = await loadConfig();
    expect(config.wordPrediction).toEqual({
      show: true, maxSuggestions: 6, enableModelQuery: true, model: "phony-model:12b",
      systemPrompt: "List {{numWords}} words.", userPrompt: "Message so far: {{message}}"
    });
  });

  // An empty model name means "whichever model Ollama has", as in the other sections.
  test("an empty model name leaves the query enabled", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: INDICATOR_SECTION,
      wordPrediction: {
        show: true, maxSuggestions: 6, enableModelQuery: true, model: "",
        systemPrompt: "List {{numWords}} words.", userPrompt: "Message so far: {{message}}"
      }
    });
    const config = await loadConfig();
    expect(config.wordPrediction.enableModelQuery).toBe(true);
    expect(config.wordPrediction.model).toBe("");
  });

  // There are no fallback prompts to query with, so anything short of a complete model
  // section leaves the history-based suggestions working on their own.
  test("an incomplete model query is turned off while the feature stays on", async (): Promise<void> => {
    const incompleteSections = [
      { show: true, maxSuggestions: 6, model: "m", systemPrompt: "s", userPrompt: "u" },
      { show: true, maxSuggestions: 6, enableModelQuery: true, model: "m", userPrompt: "u" },
      { show: true, maxSuggestions: 6, enableModelQuery: true, model: "m", systemPrompt: "  ", userPrompt: "u" },
      { show: true, maxSuggestions: 6, enableModelQuery: "yes", model: "m", systemPrompt: "s", userPrompt: "u" }
    ];
    for (const wordPrediction of incompleteSections) {
      stubConfigFetch({ indicatorLabelLookup: INDICATOR_SECTION, wordPrediction });
      const config = await loadConfig();
      expect(config.wordPrediction)
        .toEqual({ show: true, maxSuggestions: 6, ...DISABLED_MODEL_QUERY });
    }
  });
});

describe("loadConfig feature visibility sections", (): void => {

  test("valid sections are loaded as given", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: INDICATOR_SECTION,
      symbolSearch: { show: false },
      svgBuilderString: { show: true }
    });
    const config = await loadConfig();
    expect(config.symbolSearch).toEqual({ show: false });
    expect(config.svgBuilderString).toEqual({ show: true });
  });

  // Search is unconditionally visible before this change, so defaulting it on keeps an
  // existing config.json from silently losing the feature. The dev tool is opt-in.
  test("missing sections show search and hide the builder string", async (): Promise<void> => {
    stubConfigFetch({ indicatorLabelLookup: INDICATOR_SECTION });
    const config = await loadConfig();
    expect(config.symbolSearch).toEqual({ show: true });
    expect(config.svgBuilderString).toEqual({ show: false });
  });

  test("a non-boolean show falls back to the default", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: INDICATOR_SECTION,
      symbolSearch: { show: "yes" },
      svgBuilderString: { show: 1 }
    });
    const config = await loadConfig();
    expect(config.symbolSearch).toEqual({ show: true });
    expect(config.svgBuilderString).toEqual({ show: false });
  });

  test("an unreadable config file falls back to the defaults", async (): Promise<void> => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({})
    })));
    const config = await loadConfig();
    expect(config.symbolSearch).toEqual({ show: true });
    expect(config.svgBuilderString).toEqual({ show: false });
  });
});

describe("loadConfig announceSymbolOnInput", (): void => {

  test("`false` turns input announcements off", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: INDICATOR_SECTION,
      announceSymbolOnInput: false
    });
    const config = await loadConfig();
    expect(config.announceSymbolOnInput).toBe(false);
  });

  test("`true` keeps them on", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: INDICATOR_SECTION,
      announceSymbolOnInput: true
    });
    const config = await loadConfig();
    expect(config.announceSymbolOnInput).toBe(true);
  });

  test("a missing key leaves them on", async (): Promise<void> => {
    stubConfigFetch({ indicatorLabelLookup: INDICATOR_SECTION });
    const config = await loadConfig();
    expect(config.announceSymbolOnInput).toBe(true);
  });

  test("a non-boolean value leaves them on", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: INDICATOR_SECTION,
      announceSymbolOnInput: "no"
    });
    const config = await loadConfig();
    expect(config.announceSymbolOnInput).toBe(true);
  });

  test("an unreadable config file leaves them on", async (): Promise<void> => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({})
    })));
    const config = await loadConfig();
    expect(config.announceSymbolOnInput).toBe(true);
  });
});
