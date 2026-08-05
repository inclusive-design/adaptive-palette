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
import { initAdaptivePaletteGlobals, adaptivePaletteGlobals } from "./GlobalData";

/**
 * Stub `fetch` so that "/config.json" resolves to `configBody` and every other
 * URL resolves to an empty object, which is enough for the other init fetches.
 */
const stubConfigFetch = (configBody: unknown): void => {
  vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(url.includes("config.json") ? configBody : {})
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
    maxStoredRecords: 500,
    systemPrompt: "Make {{numSentences}} sentences.",
    userPrompt: "Telegraphic message: {{telegraphicMessage}}"
  };

  test("a valid section is loaded", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: INDICATOR_SECTION,
      telegraphicTranslation: TELEMSG_SECTION
    });
    await initAdaptivePaletteGlobals();
    expect(adaptivePaletteGlobals.config.telegraphicTranslation).toEqual(TELEMSG_SECTION);
  });

  test("a missing section leaves the feature unconfigured", async (): Promise<void> => {
    stubConfigFetch({ indicatorLabelLookup: INDICATOR_SECTION });
    await initAdaptivePaletteGlobals();
    expect(adaptivePaletteGlobals.config.telegraphicTranslation).toBeUndefined();
  });

  test("a malformed section leaves the feature unconfigured", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: INDICATOR_SECTION,
      telegraphicTranslation: { ...TELEMSG_SECTION, numSentences: "three" }
    });
    await initAdaptivePaletteGlobals();
    expect(adaptivePaletteGlobals.config.telegraphicTranslation).toBeUndefined();
  });

  test("maxStoredRecords of zero is valid and keeps the feature configured", async (): Promise<void> => {
    const section = { ...TELEMSG_SECTION, maxStoredRecords: 0 };
    stubConfigFetch({
      indicatorLabelLookup: INDICATOR_SECTION,
      telegraphicTranslation: section
    });
    await initAdaptivePaletteGlobals();
    expect(adaptivePaletteGlobals.config.telegraphicTranslation).toEqual(section);
  });

  test("an empty prompt leaves the feature unconfigured", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: INDICATOR_SECTION,
      telegraphicTranslation: { ...TELEMSG_SECTION, systemPrompt: "   " }
    });
    await initAdaptivePaletteGlobals();
    expect(adaptivePaletteGlobals.config.telegraphicTranslation).toBeUndefined();
  });

  test("a bad indicatorLabelLookup section does not discard telegraphicTranslation", async (): Promise<void> => {
    stubConfigFetch({ telegraphicTranslation: TELEMSG_SECTION });
    await initAdaptivePaletteGlobals();
    expect(adaptivePaletteGlobals.config.indicatorLabelLookup.useModelQueryFallback).toBe(false);
    expect(adaptivePaletteGlobals.config.telegraphicTranslation).toEqual(TELEMSG_SECTION);
  });
});

describe("loadConfig indicatorLabelLookup section", (): void => {

  const DISABLED = { useModelQueryFallback: false, model: "", systemPrompt: "", userPrompt: "" };

  test("a valid section is loaded with both prompts", async (): Promise<void> => {
    const section = { ...INDICATOR_SECTION, useModelQueryFallback: true, model: "phony-model:12b" };
    stubConfigFetch({ indicatorLabelLookup: section });
    await initAdaptivePaletteGlobals();
    expect(adaptivePaletteGlobals.config.indicatorLabelLookup).toEqual(section);
  });

  test("a missing prompt disables the fallback tier", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: { useModelQueryFallback: true, model: "phony-model:12b", systemPrompt: "Only this one." }
    });
    await initAdaptivePaletteGlobals();
    expect(adaptivePaletteGlobals.config.indicatorLabelLookup).toEqual(DISABLED);
  });

  test("an empty prompt disables the fallback tier", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: { ...INDICATOR_SECTION, useModelQueryFallback: true, userPrompt: "   " }
    });
    await initAdaptivePaletteGlobals();
    expect(adaptivePaletteGlobals.config.indicatorLabelLookup).toEqual(DISABLED);
  });

  test("a missing section disables the fallback tier", async (): Promise<void> => {
    stubConfigFetch({});
    await initAdaptivePaletteGlobals();
    expect(adaptivePaletteGlobals.config.indicatorLabelLookup).toEqual(DISABLED);
  });
});

describe("loadConfig feature visibility sections", (): void => {

  test("valid sections are loaded as given", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: INDICATOR_SECTION,
      symbolSearch: { show: false },
      svgBuilderString: { show: true }
    });
    await initAdaptivePaletteGlobals();
    expect(adaptivePaletteGlobals.config.symbolSearch).toEqual({ show: false });
    expect(adaptivePaletteGlobals.config.svgBuilderString).toEqual({ show: true });
  });

  // Search is unconditionally visible before this change, so defaulting it on keeps an
  // existing config.json from silently losing the feature. The dev tool is opt-in.
  test("missing sections show search and hide the builder string", async (): Promise<void> => {
    stubConfigFetch({ indicatorLabelLookup: INDICATOR_SECTION });
    await initAdaptivePaletteGlobals();
    expect(adaptivePaletteGlobals.config.symbolSearch).toEqual({ show: true });
    expect(adaptivePaletteGlobals.config.svgBuilderString).toEqual({ show: false });
  });

  test("a non-boolean show falls back to the default", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: INDICATOR_SECTION,
      symbolSearch: { show: "yes" },
      svgBuilderString: { show: 1 }
    });
    await initAdaptivePaletteGlobals();
    expect(adaptivePaletteGlobals.config.symbolSearch).toEqual({ show: true });
    expect(adaptivePaletteGlobals.config.svgBuilderString).toEqual({ show: false });
  });

  test("an unreadable config file falls back to the defaults", async (): Promise<void> => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({})
    })));
    await initAdaptivePaletteGlobals();
    expect(adaptivePaletteGlobals.config.symbolSearch).toEqual({ show: true });
    expect(adaptivePaletteGlobals.config.svgBuilderString).toEqual({ show: false });
  });
});
