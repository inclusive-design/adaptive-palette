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
import { getStaticNewLabel, getNewLabelViaModelQuery, initIndicatorLabels, resetOllamaCacheForTests } from "./IndicatorLabelsUtils";
import { queryChat } from "./OllamaApi";

vi.mock("./OllamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./OllamaApi")>();
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
    resetOllamaCacheForTests();
    adaptivePaletteGlobals.config = { indicatorLabelLookup: { useModelQueryFallback: false, model: "" } };
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe("getStaticNewLabel", (): void => {

    test("returns the pregenerated label for a known id pair", (): void => {
      expect(getStaticNewLabel(382, 97)).toBe("helper");
    });

    test("returns undefined for an unknown id pair", (): void => {
      expect(getStaticNewLabel(9999, 97)).toBeUndefined();
    });

    test("returns undefined when userSelectedSymbolId is undefined", (): void => {
      expect(getStaticNewLabel(undefined, 97)).toBeUndefined();
    });

  });

  describe("getNewLabelViaModelQuery", (): void => {

    test("not-viable when useModelQueryFallback is false", (): void => {
      const result = getNewLabelViaModelQuery(undefined, "hand-built", undefined, 97);
      expect(result).toStrictEqual({ status: "not-viable" });
      expect(mockedQueryChat).not.toHaveBeenCalled();
    });

    test("not-viable when indicatorId is not in the loaded table", (): void => {
      adaptivePaletteGlobals.config = { indicatorLabelLookup: { useModelQueryFallback: true, model: "gemma4:12b" } };
      const result = getNewLabelViaModelQuery(undefined, "unknownIndicator", "unknownIndicator", 99999);
      expect(result).toStrictEqual({ status: "not-viable" });
      expect(mockedQueryChat).not.toHaveBeenCalled();
    });

    test("not-viable when userSelectedSymbolId is set but not found in symbols", (): void => {
      adaptivePaletteGlobals.config = { indicatorLabelLookup: { useModelQueryFallback: true, model: "gemma4:12b" } };
      const result = getNewLabelViaModelQuery(999999999, "ghost", undefined, 97);
      expect(result).toStrictEqual({ status: "not-viable" });
      expect(mockedQueryChat).not.toHaveBeenCalled();
    });

    test("pending: starts a query and resolves it to the parsed label", async (): Promise<void> => {
      adaptivePaletteGlobals.config = { indicatorLabelLookup: { useModelQueryFallback: true, model: "gemma4:12b" } };
      mockedQueryChat.mockResolvedValue(
        { message: { role: "assistant", content: " helper " } } as Awaited<ReturnType<typeof queryChat>>
      );

      const symbol = adaptivePaletteGlobals.symbols.find(s => s.id === 2)!;
      const result = getNewLabelViaModelQuery(symbol.id, symbol.gloss, undefined, 97);

      expect(result.status).toBe("pending");
      if (result.status !== "pending") throw new Error("unreachable");
      expect(await result.promise).toBe("helper");
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
      const [userPrompt, modelName, streamResp, systemPrompt] = mockedQueryChat.mock.calls[0];
      expect(modelName).toBe("gemma4:12b");
      expect(streamResp).toBe(false);
      expect(systemPrompt).toContain("linguistic assistant for Bliss");
      expect(userPrompt).toContain(`Word: "${symbol.gloss}"`);
      expect(userPrompt).toContain("Indicator: thing — Marks concrete sense");
    });

    test("second call after the first settles is served from cache synchronously, no re-query", async (): Promise<void> => {
      adaptivePaletteGlobals.config = { indicatorLabelLookup: { useModelQueryFallback: true, model: "gemma4:12b" } };
      mockedQueryChat.mockResolvedValue(
        { message: { role: "assistant", content: "walked" } } as Awaited<ReturnType<typeof queryChat>>
      );

      const first = getNewLabelViaModelQuery(undefined, "walk", "walk", 97);
      if (first.status !== "pending") throw new Error("unreachable");
      await first.promise;

      const second = getNewLabelViaModelQuery(undefined, "walk", "walk", 97);

      expect(second).toStrictEqual({ status: "cached", label: "walked" });
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });

    test("concurrent calls for the same key before settling share one in-flight query", async (): Promise<void> => {
      adaptivePaletteGlobals.config = { indicatorLabelLookup: { useModelQueryFallback: true, model: "gemma4:12b" } };
      let resolveQuery: (value: Awaited<ReturnType<typeof queryChat>>) => void;
      mockedQueryChat.mockImplementation(() => new Promise((resolve) => {
        resolveQuery = resolve;
      }));

      const first = getNewLabelViaModelQuery(undefined, "run", "run", 97);
      const second = getNewLabelViaModelQuery(undefined, "run", "run", 97);

      expect(first.status).toBe("pending");
      expect(second.status).toBe("pending");
      if (first.status !== "pending" || second.status !== "pending") throw new Error("unreachable");
      expect(first.promise).toBe(second.promise);

      resolveQuery!({ message: { role: "assistant", content: "ran" } } as Awaited<ReturnType<typeof queryChat>>);

      expect(await first.promise).toBe("ran");
      expect(await second.promise).toBe("ran");
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });

    test("thrown error resolves to undefined and is cached as a settled miss", async (): Promise<void> => {
      adaptivePaletteGlobals.config = { indicatorLabelLookup: { useModelQueryFallback: true, model: "gemma4:12b" } };
      mockedQueryChat.mockRejectedValue(new Error("connection refused"));

      const first = getNewLabelViaModelQuery(undefined, "jump", "jump", 97);
      if (first.status !== "pending") throw new Error("unreachable");
      expect(await first.promise).toBeUndefined();

      const second = getNewLabelViaModelQuery(undefined, "jump", "jump", 97);

      expect(second).toStrictEqual({ status: "cached", label: undefined });
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });

  });

});
