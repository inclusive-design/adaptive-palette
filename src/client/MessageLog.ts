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
import { SymbolEncodingType } from "./index.d";

export const MESSAGE_LOG_KEY = "Message Log";

/*
 * How the preferred sentence was arrived at:
 * - "chosen" means the user picked it from the list
 * - "auto" means it was spoken automatically, when there was only one choice
 * - "typed" means it was typed by the user
 */
export type SentenceSourceType = "chosen" | "auto" | "typed";

/*
 * What a message turned into, present only on messages the user asked to translate.
 * The candidates that were not chosen are kept too: comparing them with the preferred
 * sentence is useful training data.
 */
export type TranslationInfoType = {
  model: string,
  candidates: string[],
  sentence: string,
  source: SentenceSourceType
};

/*
 * One message the user has said. The symbols are kept whole, rather than as text, so a
 * predicted word can be drawn as a symbol and put back into a message unchanged.
 */
export type MessageRecordType = {
  timestamp: string,
  payloads: SymbolEncodingType[],
  // The message as text, kept only on a record whose symbols were never stored. Everywhere
  // else the text is read off the symbols, so the two cannot drift apart.
  telegraphicMessage?: string,
  translation?: TranslationInfoType
};

/**
 * The text of a message: the labels of its symbols, space separated. A symbol may carry no
 * label, so labels are trimmed before being joined.
 * @param {SymbolEncodingType[]} payloads - The symbols in the message.
 * @returns {string}
 */
export function messageText (payloads: SymbolEncodingType[]): string {
  return payloads
    .map((payload) => payload.label.trim())
    .filter((label) => label.length > 0)
    .join(" ");
}

/**
 * The text of a stored message, from its symbols when it has them.
 * @param {MessageRecordType} record - The stored message.
 * @returns {string}
 */
export function recordMessageText (record: MessageRecordType): string {
  return record.payloads.length > 0 ? messageText(record.payloads) : (record.telegraphicMessage ?? "");
}

// Store the last parse of the log because word prediction reads it several times for one suggestion.
let cachedText: string | null = null;
let cachedLog: MessageRecordType[] = [];

/**
 * Read the stored messages. Anything unreadable reads as an empty log.
 * @returns {MessageRecordType[]}
 */
export function readMessageLog (): MessageRecordType[] {
  try {
    const stored = window.localStorage.getItem(MESSAGE_LOG_KEY);
    if (stored !== cachedText) {
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      cachedText = stored;
      cachedLog = !Array.isArray(parsed) ? [] : parsed.filter((entry) => {
        const payloads = (entry as MessageRecordType)?.payloads;
        return entry !== null && typeof entry === "object" && Array.isArray(payloads) &&
          payloads.every((payload) => payload !== null && typeof payload?.label === "string");
      }) as MessageRecordType[];
    }
    // A deep copy so a caller cannot alter what is cached.
    return structuredClone(cachedLog);
  } catch (error) {
    console.error(`Could not read "${MESSAGE_LOG_KEY}": ${String(error)}`);
    return [];
  }
}

/**
 * Replace the stored log, trimmed to `maxStoredRecords` by dropping the oldest entries.
 * @param {MessageRecordType[]} entries - The log to store.
 * @returns {void}
 */
function writeMessageLog (entries: MessageRecordType[]): void {
  const maxRecords = adaptivePaletteGlobals.config.maxStoredRecords;
  try {
    window.localStorage.setItem(MESSAGE_LOG_KEY, JSON.stringify(entries.slice(-maxRecords)));
  } catch (error) {
    console.error(`Could not save to "${MESSAGE_LOG_KEY}": ${String(error)}`);
  }
}

/**
 * Record a message the user has said, stamped with the current time.
 *
 * A message that has been said before is stored again rather than replacing the earlier
 * copy: how often a word is used is what word prediction ranks by. If a message is just
 * stored, both "Speak" and "Sentence" buttons will be save the same message again.
 * @param {SymbolEncodingType[]} payloads - The symbols in the message.
 * @returns {void}
 */
export function saveMessageRecord (payloads: SymbolEncodingType[]): void {
  if (!adaptivePaletteGlobals.config.maxStoredRecords || payloads.length === 0) {
    return;
  }
  const entries = readMessageLog();
  const lastRecord = entries[entries.length - 1];
  if (lastRecord && recordMessageText(lastRecord) === messageText(payloads)) {
    return;
  }
  writeMessageLog([...entries, { timestamp: new Date().toISOString(), payloads }]);
}

/**
 * Record what a message was translated into, against the message itself.
 *
 * The translation is attached to the most recent record of that message, which was stored
 * when the user asked for a sentence. Should there be no such record, because the log was
 * trimmed or logging was off when the message was said, the translation is stored on its own
 * rather than being dropped.
 *
 * Choosing a second sentence for the same message replaces the first: the most recently
 * spoken sentence is the preferred one.
 * @param {string} telegraphicMessage - The message that was translated.
 * @param {TranslationInfoType} translation - What it was translated into.
 * @returns {void}
 */
export function saveTranslation (telegraphicMessage: string, translation: TranslationInfoType): void {
  if (!adaptivePaletteGlobals.config.maxStoredRecords) {
    return;
  }
  const entries = readMessageLog();
  const index = entries.map(recordMessageText).lastIndexOf(telegraphicMessage);
  if (index === -1) {
    entries.push({ timestamp: new Date().toISOString(), payloads: [], telegraphicMessage, translation });
  } else {
    entries[index] = { ...entries[index], translation };
  }
  writeMessageLog(entries);
}
