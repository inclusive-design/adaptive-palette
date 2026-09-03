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
import { AdaptivePaletteConfigType } from "../../index.d";
import { hasModel, missingModels, requiredModels, setupStatus } from "./SetupState";

// The default config names no models at all, so each test says which it wants.
const configWith = (models: {
  indicator?: string, telegraphic?: string, prediction?: string
}): AdaptivePaletteConfigType => {
  const config = makeDefaultConfig();
  config.indicatorLabelLookup.model = models.indicator ?? "";
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
  });

  describe("hasModel", () => {
    test("matches a name exactly", () => {
      expect(hasModel(["gemma4:12b", "llama3:8b"], "gemma4:12b")).toBe(true);
    });

    test("does not match a different tag of the same model", () => {
      expect(hasModel(["gemma4:27b"], "gemma4:12b")).toBe(false);
    });

    test("an untagged name matches the `latest` tag Ollama gives it", () => {
      expect(hasModel(["gemma4:latest"], "gemma4")).toBe(true);
    });

    test("finds nothing in an empty list", () => {
      expect(hasModel([], "gemma4:12b")).toBe(false);
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
    test("an empty model list means Ollama is not answering", () => {
      expect(setupStatus(configWith({ indicator: "gemma4:12b" }), [])).toBe("noOllama");
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
      expect(setupStatus(configWith({}), [])).toBe("ready");
    });
  });
});
