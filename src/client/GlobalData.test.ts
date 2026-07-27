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

describe("loadConfig telegraphicTranslation section", (): void => {

  const VALID_SECTION = {
    model: "phony-model:12b",
    numSentences: 3,
    maxStoredRecords: 500,
    systemPrompt: "Make {{numSentences}} sentences.",
    userPrompt: "Telegraphic message: {{telegraphicMessage}}"
  };

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

  test("a valid section is loaded", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: { useModelQueryFallback: false, model: "" },
      telegraphicTranslation: VALID_SECTION
    });
    await initAdaptivePaletteGlobals();
    expect(adaptivePaletteGlobals.config.telegraphicTranslation).toEqual(VALID_SECTION);
  });

  test("a missing section leaves the feature unconfigured", async (): Promise<void> => {
    stubConfigFetch({ indicatorLabelLookup: { useModelQueryFallback: false, model: "" } });
    await initAdaptivePaletteGlobals();
    expect(adaptivePaletteGlobals.config.telegraphicTranslation).toBeUndefined();
  });

  test("a malformed section leaves the feature unconfigured", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: { useModelQueryFallback: false, model: "" },
      telegraphicTranslation: { ...VALID_SECTION, numSentences: "three" }
    });
    await initAdaptivePaletteGlobals();
    expect(adaptivePaletteGlobals.config.telegraphicTranslation).toBeUndefined();
  });

  test("an empty prompt leaves the feature unconfigured", async (): Promise<void> => {
    stubConfigFetch({
      indicatorLabelLookup: { useModelQueryFallback: false, model: "" },
      telegraphicTranslation: { ...VALID_SECTION, systemPrompt: "   " }
    });
    await initAdaptivePaletteGlobals();
    expect(adaptivePaletteGlobals.config.telegraphicTranslation).toBeUndefined();
  });

  test("a bad indicatorLabelLookup section does not discard telegraphicTranslation", async (): Promise<void> => {
    stubConfigFetch({ telegraphicTranslation: VALID_SECTION });
    await initAdaptivePaletteGlobals();
    expect(adaptivePaletteGlobals.config.indicatorLabelLookup.useModelQueryFallback).toBe(false);
    expect(adaptivePaletteGlobals.config.telegraphicTranslation).toEqual(VALID_SECTION);
  });
});
