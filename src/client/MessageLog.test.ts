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
  MESSAGE_LOG_KEY, messageText, readMessageLog, recordMessageText, saveMessageRecord, saveTranslation
} from "./MessageLog";
import { SymbolEncodingType } from "./index.d";

describe("messageLog", (): void => {

  const message = (...labels: string[]): SymbolEncodingType[] =>
    labels.map((label) => ({ label, composition: 1840, modifierInfo: [] }));

  const TRANSLATION = {
    model: "phony-model:12b",
    candidates: ["I am hungry.", "I want food."],
    sentence: "I am hungry.",
    source: "chosen" as const
  };

  beforeEach((): void => {
    window.localStorage.removeItem(MESSAGE_LOG_KEY);
    adaptivePaletteGlobals.config.maxStoredRecords = 3;
  });

  afterEach((): void => {
    window.localStorage.removeItem(MESSAGE_LOG_KEY);
  });

  describe("message text", (): void => {
    test("labels are joined with spaces", (): void => {
      expect(messageText(message("I", "want", "juice"))).toBe("I want juice");
    });

    test("blank labels are left out", (): void => {
      expect(messageText(message("I", "  ", "juice"))).toBe("I juice");
    });
  });

  describe("recording messages", (): void => {
    test("an empty log reads as an empty array", (): void => {
      expect(readMessageLog()).toEqual([]);
    });

    test("a saved message round-trips with a timestamp", (): void => {
      saveMessageRecord(message("I", "want", "juice"));
      const log = readMessageLog();
      expect(log).toHaveLength(1);
      expect(messageText(log[0].payloads)).toBe("I want juice");
      expect(typeof log[0].timestamp).toBe("string");
      expect(log[0].translation).toBeUndefined();
    });

    test("an empty message is not saved", (): void => {
      saveMessageRecord([]);
      expect(window.localStorage.getItem(MESSAGE_LOG_KEY)).toBeNull();
    });

    test("a repeated message is saved again rather than replacing the earlier one", (): void => {
      saveMessageRecord(message("I", "want", "juice"));
      saveMessageRecord(message("hello"));
      saveMessageRecord(message("I", "want", "juice"));
      expect(readMessageLog().map(recordMessageText)).toEqual(["I want juice", "hello", "I want juice"]);
    });

    test("saving the message that was just saved does not store it twice", (): void => {
      saveMessageRecord(message("I", "want", "juice"));
      saveMessageRecord(message("I", "want", "juice"));
      expect(readMessageLog()).toHaveLength(1);
    });

    test("the log is capped at maxStoredRecords, dropping oldest first", (): void => {
      for (let index = 1; index <= 5; index++) {
        saveMessageRecord(message(`word ${index}`));
      }
      const log = readMessageLog();
      expect(log).toHaveLength(3);
      expect(log.map((entry) => entry.payloads[0].label)).toEqual(["word 3", "word 4", "word 5"]);
    });

    test("nothing is stored when maxStoredRecords is zero", (): void => {
      adaptivePaletteGlobals.config.maxStoredRecords = 0;
      saveMessageRecord(message("I", "want", "juice"));
      saveTranslation("I want juice", TRANSLATION);
      expect(window.localStorage.getItem(MESSAGE_LOG_KEY)).toBeNull();
    });

    test("corrupt stored data reads as an empty log rather than throwing", (): void => {
      window.localStorage.setItem(MESSAGE_LOG_KEY, "{ not json");
      expect(readMessageLog()).toEqual([]);
    });

    test("entries without a payloads array are dropped", (): void => {
      window.localStorage.setItem(MESSAGE_LOG_KEY, JSON.stringify([
        { timestamp: "2026-08-07T00:00:00.000Z" },
        null,
        { timestamp: "2026-08-07T00:00:01.000Z", payloads: [{ label: "I", composition: 1840 }] }
      ]));
      const log = readMessageLog();
      expect(log).toHaveLength(1);
      expect(log[0].payloads[0].label).toBe("I");
    });

    test("entries with an unlabelled symbol are dropped", (): void => {
      window.localStorage.setItem(MESSAGE_LOG_KEY, JSON.stringify([
        { timestamp: "2026-08-07T00:00:00.000Z", payloads: [{}] },
        { timestamp: "2026-08-07T00:00:01.000Z", payloads: [{ label: 3, composition: 1840 }] },
        { timestamp: "2026-08-07T00:00:02.000Z", payloads: [{ label: "I", composition: 1840 }] }
      ]));
      const log = readMessageLog();
      expect(log).toHaveLength(1);
      expect(log.map(recordMessageText)).toEqual(["I"]);
    });
  });

  describe("recording translations", (): void => {
    test("a translation is attached to the message it came from", (): void => {
      saveMessageRecord(message("I", "want", "juice"));
      saveTranslation("I want juice", TRANSLATION);

      const log = readMessageLog();
      expect(log).toHaveLength(1);
      expect(log[0].translation).toEqual(TRANSLATION);
      expect(messageText(log[0].payloads)).toBe("I want juice");
    });

    test("a second sentence for the same message replaces the first", (): void => {
      saveMessageRecord(message("I", "want", "juice"));
      saveTranslation("I want juice", TRANSLATION);
      saveTranslation("I want juice", { ...TRANSLATION, sentence: "I want food.", source: "typed" });

      const log = readMessageLog();
      expect(log).toHaveLength(1);
      expect(log[0].translation).toMatchObject({ sentence: "I want food.", source: "typed" });
    });

    test("the most recent copy of a repeated message is the one translated", (): void => {
      saveMessageRecord(message("I", "want", "juice"));
      saveMessageRecord(message("hello"));
      saveMessageRecord(message("I", "want", "juice"));
      saveTranslation("I want juice", TRANSLATION);

      const log = readMessageLog();
      expect(log[0].translation).toBeUndefined();
      expect(log[2].translation).toEqual(TRANSLATION);
    });

    test("other messages are left alone", (): void => {
      saveMessageRecord(message("I", "want", "juice"));
      saveMessageRecord(message("you", "help", "me"));
      saveTranslation("I want juice", TRANSLATION);

      const log = readMessageLog();
      expect(log[0].translation).toEqual(TRANSLATION);
      expect(log[1].translation).toBeUndefined();
    });

    test("a translation with no message on record is still kept", (): void => {
      saveTranslation("I want juice", TRANSLATION);

      const log = readMessageLog();
      expect(log).toHaveLength(1);
      expect(log[0].payloads).toEqual([]);
      expect(log[0].translation).toEqual(TRANSLATION);
    });

    // Such a record has no symbols to read a message off, so it carries the message text
    // instead. Without it, every correction would pile up another record.
    test("a translation with no message on record is still replaced by the next one", (): void => {
      saveTranslation("I want juice", TRANSLATION);
      saveTranslation("I want juice", { ...TRANSLATION, sentence: "I want food.", source: "typed" });

      const log = readMessageLog();
      expect(log).toHaveLength(1);
      expect(log[0].translation).toMatchObject({ sentence: "I want food.", source: "typed" });
    });
  });
});
