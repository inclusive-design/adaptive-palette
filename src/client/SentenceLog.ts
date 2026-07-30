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

export const SENTENCE_LOG_KEY = "Telegraphic Translation Log";

/*
 * How the preferred sentence was arrived at: picked from the list:
 * - "chosen" means the user picked it from the list
 * - "auto" means it was spoken automatically, when there was only one choice
 * - "typed" means it was typed by the user
 */
export type SentenceSourceType = "chosen" | "auto" | "typed";

export type SentenceRecordType = {
  timestamp: string,
  telegraphicMessage: string,
  model: string,
  candidates: string[],
  sentence: string,
  source: SentenceSourceType
};

/**
 * Read the stored records. Anything unreadable reads as an empty log.
 * @returns {SentenceRecordType[]}
 */
export function readSentenceLog (): SentenceRecordType[] {
  try {
    const stored = window.localStorage.getItem(SENTENCE_LOG_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    // non-object entries are dropped
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "object" && entry !== null) as SentenceRecordType[] : [];
  } catch (error) {
    console.error(`Could not read "${SENTENCE_LOG_KEY}": ${String(error)}`);
    return [];
  }
}

/**
 * Record the user's preferred sentence for a telegraphic message, stamped with the
 * current time, and trim the log to `maxStoredRecords` by dropping the oldest entries.
 * @param {Omit<SentenceRecordType, "timestamp">} record - The record without its timestamp.
 * @returns {void}
 */
export function saveSentenceRecord (record: Omit<SentenceRecordType, "timestamp">): void {
  const maxRecords = adaptivePaletteGlobals.config.telegraphicTranslation?.maxStoredRecords;
  if (!maxRecords) {
    return;
  }
  const entries = [
    ...readSentenceLog().filter((entry) => entry.telegraphicMessage !== record.telegraphicMessage),
    { ...record, timestamp: new Date().toISOString() }
  ];
  try {
    window.localStorage.setItem(SENTENCE_LOG_KEY, JSON.stringify(entries.slice(-maxRecords)));
  } catch (error) {
    console.error(`Could not save to "${SENTENCE_LOG_KEY}": ${String(error)}`);
  }
}
