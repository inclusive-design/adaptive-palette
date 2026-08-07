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

import { adaptivePaletteGlobals } from "./GlobalData";
import { MESSAGE_LOG_KEY, saveMessageRecord } from "./MessageLog";
import { predictNext, SEED_STARTERS } from "./WordPredictionUtils";
import { SymbolEncodingType } from "./index.d";

describe("wordPrediction", (): void => {

  const message = (...labels: string[]): SymbolEncodingType[] =>
    labels.map((label) => ({ label, composition: 1840, modifierInfo: [] }));

  const predictedLabels = (currentLabels: string[], maxSuggestions = 4): string[] =>
    predictNext(currentLabels, maxSuggestions).map((payload) => payload.label);

  beforeEach((): void => {
    window.localStorage.removeItem(MESSAGE_LOG_KEY);
    adaptivePaletteGlobals.config.maxStoredRecords = 100;
  });

  afterEach((): void => {
    window.localStorage.removeItem(MESSAGE_LOG_KEY);
  });

  describe("with no saved messages", (): void => {
    test("the first word is offered from the seeded starters", (): void => {
      expect(predictedLabels([])).toEqual(SEED_STARTERS.slice(0, 4).map((seed) => seed.label));
    });

    test("the seeded starters carry a renderable composition", (): void => {
      predictNext([], 4).forEach((payload) => expect(payload.composition).toBeDefined());
    });

    test("a message in progress gets no suggestions", (): void => {
      expect(predictedLabels(["I"])).toEqual([]);
    });
  });

  describe("with saved messages", (): void => {
    beforeEach((): void => {
      saveMessageRecord(message("I", "want", "juice"));
      saveMessageRecord(message("I", "want", "juice"));
      saveMessageRecord(message("I", "want", "music"));
      saveMessageRecord(message("you", "help", "me"));
    });

    test("first words are ranked by how often they start a message", (): void => {
      expect(predictedLabels([])).toEqual(["I", "you"]);
    });

    test("the seeded starters are dropped once a message has been saved", (): void => {
      expect(predictedLabels([])).not.toContain("please");
    });

    test("what followed the last two words is offered first", (): void => {
      expect(predictedLabels(["I", "want"])[0]).toBe("juice");
    });

    test("a two-word match beats a one-word match", (): void => {
      saveMessageRecord(message("please", "want", "music"));
      saveMessageRecord(message("please", "want", "music"));
      saveMessageRecord(message("please", "want", "music"));
      // "music" now follows "want" more often overall, but "juice" follows "I want".
      expect(predictedLabels(["I", "want"])[0]).toBe("juice");
    });

    test("a one-word match is used when the two-word context is unknown", (): void => {
      expect(predictedLabels(["please", "want"])[0]).toBe("juice");
    });

    test("suggestions back off to the most used words when nothing follows the context", (): void => {
      expect(predictedLabels(["juice"]).length).toBeGreaterThan(0);
    });

    test("the word at the end of the message is not suggested back", (): void => {
      expect(predictedLabels(["juice"])).not.toContain("juice");
    });

    test("a label is never suggested twice", (): void => {
      const labels = predictedLabels(["I", "want"]);
      expect(new Set(labels).size).toBe(labels.length);
    });

    test("no more than maxSuggestions are returned", (): void => {
      expect(predictedLabels(["I", "want"], 2)).toHaveLength(2);
    });

    test("asking for no suggestions returns none", (): void => {
      expect(predictNext(["I", "want"], 0)).toEqual([]);
    });

    test("a word is predicted in the form it was last used", (): void => {
      const modified: SymbolEncodingType[] = [
        { label: "I", composition: 1840, modifierInfo: [] },
        { label: "want", composition: 1840, modifierInfo: [] },
        {
          label: "juices", composition: 1840, indicatorId: 99,
          baseLabel: "juice", modifierInfo: []
        }
      ];
      saveMessageRecord(modified);
      const suggestion = predictNext(["I", "want"], 4).find((payload) => payload.label === "juices");
      expect(suggestion?.indicatorId).toBe(99);
    });
  });
});
