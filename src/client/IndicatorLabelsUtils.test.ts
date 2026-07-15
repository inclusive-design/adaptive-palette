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
import { getNewLabel, initIndicatorLabels } from "./IndicatorLabelsUtils";
import { queryChat } from "./ollamaApi";

vi.mock("./ollamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./ollamaApi")>();
  return { ...actual, queryChat: vi.fn() };
});

const mockedQueryChat = vi.mocked(queryChat);

const FAKE_LABELS = { "382_97": "helper", "1184_97": "aid" };
const FAKE_INDICATORS = [
  { id: 97, group: "Nominal", name: "INDICATOR THING", purpose: "Marks concrete sense" }
];

describe("IndicatorLabels", (): void => {

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  beforeEach(async (): Promise<void> => {
    mockedQueryChat.mockReset();
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      const body = url.includes("indicators.json") ? FAKE_INDICATORS : FAKE_LABELS;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(body)
      });
    }));
    await initIndicatorLabels();
    adaptivePaletteGlobals.config = { indicatorLabelLookup: { useOllamaFallback: false, model: "" } };
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  test("tier 1 hit: returns the pregenerated label for a known id pair", async (): Promise<void> => {
    const result = await getNewLabel(382, "help", undefined, 97);
    expect(result).toBe("helper");
    expect(mockedQueryChat).not.toHaveBeenCalled();
  });

  test("tier 1 miss, Ollama off: returns undefined without querying Ollama", async (): Promise<void> => {
    const result = await getNewLabel(9999, "unknown", undefined, 97);
    expect(result).toBeUndefined();
    expect(mockedQueryChat).not.toHaveBeenCalled();
  });

  test("no userSelectedSymbolId: tier 1 is skipped", async (): Promise<void> => {
    const result = await getNewLabel(undefined, "hand-built", undefined, 97);
    expect(result).toBeUndefined();
    expect(mockedQueryChat).not.toHaveBeenCalled();
  });

  test("tier 1 miss, Ollama on: queries Ollama with the expected system/user prompts", async (): Promise<void> => {
    adaptivePaletteGlobals.config = { indicatorLabelLookup: { useOllamaFallback: true, model: "gemma4:12b" } };
    mockedQueryChat.mockResolvedValue(
      { message: { role: "assistant", content: " helper " } } as Awaited<ReturnType<typeof queryChat>>
    );

    const symbol = adaptivePaletteGlobals.symbols.find(s => s.id === 2)!;
    const result = await getNewLabel(symbol.id, symbol.gloss, undefined, 97);

    expect(result).toBe("helper");
    expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    const [userPrompt, modelName, streamResp, systemPrompt] = mockedQueryChat.mock.calls[0];
    expect(modelName).toBe("gemma4:12b");
    expect(streamResp).toBe(false);
    expect(systemPrompt).toContain("linguistic assistant for Bliss");
    expect(userPrompt).toContain(`Word: "${symbol.gloss}"`);
    expect(userPrompt).toContain("Indicator: thing — Marks concrete sense");
  });

  test("second identical call is served from cache, no re-query", async (): Promise<void> => {
    adaptivePaletteGlobals.config = { indicatorLabelLookup: { useOllamaFallback: true, model: "gemma4:12b" } };
    mockedQueryChat.mockResolvedValue(
      { message: { role: "assistant", content: "walked" } } as Awaited<ReturnType<typeof queryChat>>
    );

    const payload = { label: "walk", composition: [500], baseLabel: "walk" };
    const first = await getNewLabel(undefined, "walk", "walk", 97);
    const second = await getNewLabel(undefined, "walk", "walk", 97);

    expect(first).toBe("walked");
    expect(second).toBe("walked");
    expect(mockedQueryChat).toHaveBeenCalledTimes(1);
  });

});
