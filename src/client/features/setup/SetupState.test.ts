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

import { makeDefaultConfig } from "../../core/Config";
import type { AdaptivePaletteConfigType } from "../../index.d";
import { missingModels, requiredModels, setupStatus } from "./SetupState";

// The default config names no models at all, so each test says which it wants.
const configWith = (models: {
  indicator?: string, telegraphic?: string, prediction?: string
}): AdaptivePaletteConfigType => {
  const config = makeDefaultConfig();
  config.labelLookup.model = models.indicator ?? "";
  config.wordPrediction.model = models.prediction ?? "";
  if (models.telegraphic !== undefined) {
    config.telegraphicTranslation = {
      model: models.telegraphic,
      numSentences: 3,
      systemPrompt: "system",
      userPrompt: "user",
      showBlissSentence: true
    };
  }
  return config;
};

describe("SetupState", (): void => {

  describe("requiredModels", () => {
    test("names each model once, however many sections ask for it", () => {
      const config = configWith({
        indicator: "gemma4:12b", telegraphic: "gemma4:12b", prediction: "gemma4:12b"
      });
      expect(requiredModels(config)).toEqual(["gemma4:12b"]);
    });

    test("collects the models of sections that differ", () => {
      const config = configWith({ indicator: "gemma4:12b", prediction: "llama3:8b" });
      expect(requiredModels(config)).toEqual(["gemma4:12b", "llama3:8b"]);
    });

    test("skips an empty model, which means whichever model Ollama has first", () => {
      const config = configWith({ indicator: "", prediction: "gemma4:12b" });
      expect(requiredModels(config)).toEqual(["gemma4:12b"]);
    });

    test("asks for nothing when telegraphic translation is not configured", () => {
      expect(requiredModels(configWith({}))).toEqual([]);
    });

    test("includes the About Me and word naming models", () => {
      const config = configWith({ prediction: "gemma4:12b" });
      config.aboutMe = { ...config.aboutMe, model: "qwen3:8b" } as AdaptivePaletteConfigType["aboutMe"];
      config.wordNaming = { ...config.wordNaming, model: "llama3:8b" } as AdaptivePaletteConfigType["wordNaming"];
      expect(requiredModels(config)).toEqual(["gemma4:12b", "qwen3:8b", "llama3:8b"]);
    });
  });

  describe("missingModels", () => {
    test("names only what is not there", () => {
      const config = configWith({ indicator: "gemma4:12b", prediction: "llama3:8b" });
      expect(missingModels(config, ["gemma4:12b"])).toEqual(["llama3:8b"]);
    });

    test("is empty when everything asked for is there", () => {
      const config = configWith({ indicator: "gemma4:12b" });
      expect(missingModels(config, ["gemma4:12b", "llama3:8b"])).toEqual([]);
    });
  });

  describe("setupStatus", () => {
    test("no model list means Ollama is not answering", () => {
      expect(setupStatus(configWith({ indicator: "gemma4:12b" }), null)).toBe("noOllama");
    });

    test("an empty model list means Ollama answers but has nothing downloaded", () => {
      expect(setupStatus(configWith({ indicator: "gemma4:12b" }), [])).toBe("missingModels");
    });

    test("a model the config asks for and Ollama has not got", () => {
      const config = configWith({ indicator: "gemma4:12b" });
      expect(setupStatus(config, ["llama3:8b"])).toBe("missingModels");
    });

    test("everything in place", () => {
      const config = configWith({ indicator: "gemma4:12b" });
      expect(setupStatus(config, ["gemma4:12b"])).toBe("ready");
    });

    test("a config that asks for no model is ready as soon as Ollama answers", () => {
      expect(setupStatus(configWith({}), ["llama3:8b"])).toBe("ready");
    });

    // Nothing would use a model, so the tester is not asked to download one -- the state a
    // `config.json` that fails to parse falls back to.
    test("a config that asks for no model is ready even with Ollama down", () => {
      expect(setupStatus(configWith({}), null)).toBe("ready");
    });
  });
});
