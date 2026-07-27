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
 * How the preferred sentence was arrived at: picked from the list, spoken automatically
 * in single-sentence mode, or typed by the user.
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
 * Read the stored records. Anything unreadable -- missing, corrupt, or not an array --
 * reads as an empty log: a broken log must never stop the user from talking.
 * @returns {SentenceRecordType[]}
 */
export function readSentenceLog (): SentenceRecordType[] {
  try {
    const stored = window.localStorage.getItem(SENTENCE_LOG_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed as SentenceRecordType[] : [];
  } catch (error) {
    console.error(`Could not read "${SENTENCE_LOG_KEY}": ${String(error)}`);
    return [];
  }
}

/**
 * Record the user's preferred sentence for a telegraphic message, stamped with the
 * current time, and trim the log to `maxStoredRecords` by dropping the oldest entries.
 *
 * One record per distinct telegraphic message: saving replaces any earlier record for the
 * same message and moves it to the end. The choices stay on screen after a tap, so taps
 * also arrive when the user wants the sentence repeated for a listener, is correcting a
 * mis-tap, or is editing their own wording. Keeping all of them would tell the
 * fine-tuning data that the user preferred A over B and B over A at once; keeping the
 * last one says what they settled on.
 *
 * Does nothing when the feature is unconfigured. A failed write -- a full quota, storage
 * disabled -- is logged and swallowed: the sentence has already been spoken, and losing a
 * training record is not worth interrupting a conversation over.
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
