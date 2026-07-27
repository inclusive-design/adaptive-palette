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
import {
  SENTENCE_LOG_KEY, readSentenceLog, saveSentenceRecord
} from "./sentenceLog";

describe("sentenceLog", (): void => {

  const RECORD = {
    telegraphicMessage: "me hungry",
    model: "phony-model:12b",
    candidates: ["I am hungry.", "I want food."],
    sentence: "I am hungry.",
    source: "chosen" as const
  };

  beforeEach((): void => {
    window.localStorage.removeItem(SENTENCE_LOG_KEY);
    adaptivePaletteGlobals.config = {
      indicatorLabelLookup: { useModelQueryFallback: false, model: "" },
      telegraphicTranslation: {
        model: "phony-model:12b",
        numSentences: 3,
        maxStoredRecords: 3,
        systemPrompt: "prompt",
        userPrompt: "prompt"
      }
    };
  });

  afterEach((): void => {
    window.localStorage.removeItem(SENTENCE_LOG_KEY);
  });

  test("an empty log reads as an empty array", (): void => {
    expect(readSentenceLog()).toEqual([]);
  });

  test("a saved record round-trips with a timestamp", (): void => {
    saveSentenceRecord(RECORD);
    const log = readSentenceLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject(RECORD);
    expect(typeof log[0].timestamp).toBe("string");
  });

  test("records for different messages accumulate in order", (): void => {
    saveSentenceRecord(RECORD);
    saveSentenceRecord({ ...RECORD, telegraphicMessage: "me thirsty", sentence: "I want a drink." });
    const log = readSentenceLog();
    expect(log.map((entry) => entry.telegraphicMessage)).toEqual(["me hungry", "me thirsty"]);
  });

  test("saving again for the same message replaces the earlier preference", (): void => {
    saveSentenceRecord(RECORD);
    saveSentenceRecord({ ...RECORD, sentence: "I want food.", source: "typed" });

    const log = readSentenceLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ sentence: "I want food.", source: "typed" });
  });

  test("a replaced record moves to the end of the log", (): void => {
    saveSentenceRecord(RECORD);
    saveSentenceRecord({ ...RECORD, telegraphicMessage: "me thirsty", sentence: "I want a drink." });
    saveSentenceRecord({ ...RECORD, sentence: "I want food." });

    expect(readSentenceLog().map((entry) => entry.telegraphicMessage))
      .toEqual(["me thirsty", "me hungry"]);
  });

  test("the log is capped at maxStoredRecords, dropping oldest first", (): void => {
    for (let index = 1; index <= 5; index++) {
      saveSentenceRecord({ ...RECORD, telegraphicMessage: `message ${index}` });
    }
    const log = readSentenceLog();
    expect(log).toHaveLength(3);
    expect(log.map((entry) => entry.telegraphicMessage))
      .toEqual(["message 3", "message 4", "message 5"]);
  });

  test("corrupt stored data reads as an empty log rather than throwing", (): void => {
    window.localStorage.setItem(SENTENCE_LOG_KEY, "{ not json");
    expect(readSentenceLog()).toEqual([]);
  });

  test("nothing is stored when the feature is unconfigured", (): void => {
    adaptivePaletteGlobals.config = {
      indicatorLabelLookup: { useModelQueryFallback: false, model: "" }
    };
    saveSentenceRecord(RECORD);
    expect(window.localStorage.getItem(SENTENCE_LOG_KEY)).toBeNull();
  });
});
