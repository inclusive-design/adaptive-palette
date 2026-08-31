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

import { adaptivePaletteGlobals } from "../state/GlobalData";
import { StoredMessage, getStorage } from "./StorageBackend";
import { SymbolEncodingType } from "../index.d";

/*
 * How the preferred sentence was arrived at:
 * - "chosen" means the user picked it from the list
 * - "typed" means it was typed by the user
 */
export type SentenceSourceType = "chosen" | "typed";

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

/*
 * A record in this session's log. `id` is what storage gave it, and is absent only while its
 * write is still in flight or after one failed.
 */
type LoggedMessage = MessageRecordType & { id?: number };

/*
 * The messages this session works from: the newest `maxRecalledRecords`, hydrated once at
 * start-up and then kept in step by the writes below.
 *
 * Storage is asynchronous and `readMessageLog()` is called during render, so the log cannot be
 * fetched when it is wanted. Holding it here is what lets the read stay synchronous.
 */
let log: LoggedMessage[] = [];

/**
 * Whether a stored entry is a message record. The store is hand-editable through the
 * browser's developer tools, so this runs over everything read back from it.
 * @param {unknown} entry - The stored entry.
 * @returns {boolean}
 */
function isMessageRecord (entry: unknown): entry is StoredMessage {
  const payloads = (entry as StoredMessage)?.payloads;
  return entry !== null && typeof entry === "object" && Array.isArray(payloads) &&
    payloads.every((payload) => payload !== null && typeof payload?.label === "string");
}

/**
 * Read the stored messages into this session's log. Called once from
 * `initAdaptivePaletteGlobals()`, before anything renders, and by tests that seed a log.
 *
 * A store that cannot be read leaves an empty log, which is how the app starts anyway.
 * @returns {Promise<void>}
 */
export async function hydrateMessageLog (): Promise<void> {
  log = [];
  const maxRecords = adaptivePaletteGlobals.config.maxRecalledRecords;
  if (!maxRecords) {
    return;
  }
  try {
    log = (await getStorage().readMessages(maxRecords)).filter(isMessageRecord);
  } catch (error) {
    console.error(`Could not read the saved messages: ${String(error)}`);
  }
}

/**
 * Read the messages this session is working from.
 * @returns {MessageRecordType[]}
 */
export function readMessageLog (): MessageRecordType[] {
  // A deep copy so a caller cannot alter what is held here, with the storage id dropped: it
  // is bookkeeping for `persistChange`, not part of the public record shape.
  return structuredClone(log).map((record) => {
    delete record.id;
    return record;
  });
}

/*
 * The first write of a record, until it lands. `persistChange()` waits on it, so a change
 * made in the round trip between storing a record and its id coming back -- a translation
 * saved seconds after the message it belongs to -- is written rather than dropped.
 */
const pendingWrites = new WeakMap<LoggedMessage, Promise<void>>();

/**
 * Store a record that is not in storage yet, and remember the identity it was given so a
 * later translation can be written against it.
 * @param {LoggedMessage} record - The record, already in `log`.
 * @returns {void}
 */
function persistNew (record: LoggedMessage): void {
  pendingWrites.set(record, (async (): Promise<void> => {
    try {
      record.id = (await getStorage().addMessage(record)).id;
    } catch (error) {
      console.error(`Could not save the message: ${String(error)}`);
    }
  })());
}

/**
 * Store a change to a record that is already in storage, or on its way there.
 * @param {LoggedMessage} record - The changed record, already in `log`.
 * @returns {Promise<void>}
 */
async function persistChange (record: LoggedMessage): Promise<void> {
  // The id arrives with the record's first write, which may still be in flight.
  await pendingWrites.get(record);
  if (record.id === undefined) {
    console.error("Could not save the translation: its message was never stored.");
    return;
  }
  try {
    await getStorage().updateMessage(record.id, record);
  } catch (error) {
    console.error(`Could not save the translation: ${String(error)}`);
  }
}

/**
 * Add a record to the log, dropping the oldest if that puts it over `maxRecalledRecords`.
 * Only the log is trimmed. Storage keeps every message.
 * @param {LoggedMessage} record - The record to add.
 * @returns {void}
 */
function remember (record: LoggedMessage): void {
  log.push(record);
  if (log.length > adaptivePaletteGlobals.config.maxRecalledRecords) {
    log.shift();
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
  if (!adaptivePaletteGlobals.config.maxRecalledRecords || payloads.length === 0) {
    return;
  }
  const lastRecord = log[log.length - 1];
  if (lastRecord && recordMessageText(lastRecord) === messageText(payloads)) {
    return;
  }
  // The AI mark is dropped here: a message the user has said is theirs, so its labels stop being
  // the model's. Word prediction replays these payloads, and history suggestions are never marked.
  const unmarked = payloads.map((payload) => {
    const stored = { ...payload };
    delete stored.isAiLabel;
    return stored;
  });
  const record: LoggedMessage = { timestamp: new Date().toISOString(), payloads: unmarked };
  remember(record);
  persistNew(record);
}

/**
 * Record what a message was translated into, against the message itself. The message
 * attributes are not saved.
 *
 * The translation is attached to the most recent record of that message, which was stored
 * when the user asked for a sentence. Should there be no such record, because the log was
 * trimmed or logging was off when the message was said, the translation is stored on its own
 * rather than being dropped.
 *
 * Choosing a second sentence for the same message replaces the first: the most recently
 * spoken sentence is the preferred one. The candidates are added to rather than replaced,
 * so no sentence the message has been offered is lost.
 * @param {string} telegraphicMessage - The message that was translated.
 * @param {TranslationInfoType} translation - What it was translated into.
 * @returns {void}
 */
export function saveTranslation (telegraphicMessage: string, translation: TranslationInfoType): void {
  if (!adaptivePaletteGlobals.config.maxRecalledRecords) {
    return;
  }
  const index = log.map(recordMessageText).lastIndexOf(telegraphicMessage);
  if (index === -1) {
    const record: LoggedMessage = {
      timestamp: new Date().toISOString(), payloads: [], telegraphicMessage, translation
    };
    remember(record);
    persistNew(record);
    return;
  }
  // A recalled sentence with other candidates for a message is saved again.
  const previous = log[index].translation?.candidates ?? [];
  const candidates = [...new Set([...previous, ...translation.candidates])];
  // Changed in place rather than replaced, so an id still on its way from storage lands on
  // the record this is about to persist.
  log[index].translation = { ...translation, candidates };
  void persistChange(log[index]);
}

/**
 * Find the most recent translation for a message, if there is one.
 *
 * Matches on message text alone -- ignores attributes; see `saveTranslation()`.
 * @param {string} telegraphicMessage - The message to look up.
 * @returns {TranslationInfoType | undefined}
 */
export function findLatestTranslation (telegraphicMessage: string): TranslationInfoType | undefined {
  if (!adaptivePaletteGlobals.config.maxRecalledRecords) {
    return undefined;
  }
  for (let index = log.length - 1; index >= 0; index--) {
    const entry = log[index];
    if (entry.translation && recordMessageText(entry) === telegraphicMessage) {
      return entry.translation;
    }
  }
  return undefined;
}
