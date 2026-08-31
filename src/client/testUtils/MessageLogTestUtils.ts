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

/**
 * The only place a test touches the message log's storage.
 *
 * `resetMessageLog()` installs a backend of its own each time, so no test can see what
 * another one stored, and there is no database to clean up afterwards.
 *
 * Call these after setting `adaptivePaletteGlobals.config`: how much is read back into the
 * log comes from `maxRecalledRecords`.
 */
import { MessageRecordType, hydrateMessageLog } from "../core/MessageLog";
import { setStorage } from "../core/StorageBackend";
import { FakeStorage } from "./FakeStorage";

let storage = new FakeStorage();

/**
 * Empty the message log, in storage and in the app. Call in `beforeEach` of any test that
 * reads or writes it.
 * @returns {Promise<void>}
 */
export async function resetMessageLog (): Promise<void> {
  storage = new FakeStorage();
  setStorage(storage);
  await hydrateMessageLog();
}

/**
 * Replace the message log with the given entries and read it back into the app. Typed as
 * `unknown[]` because some tests deliberately seed malformed records, to check they are
 * dropped rather than trusted.
 * @param {unknown[]} entries - What the log should hold, oldest first.
 * @returns {Promise<void>}
 */
export async function seedMessageLog (entries: unknown[]): Promise<void> {
  storage = new FakeStorage();
  setStorage(storage);
  for (const entry of entries) {
    await storage.addMessage(entry as MessageRecordType);
  }
  await hydrateMessageLog();
}

/**
 * What is actually in storage, as opposed to what the app has in hand. Reads far more than
 * `maxRecalledRecords`, because the point of it is to see what was kept beyond what is read
 * back.
 * @returns {Promise<unknown[]>}
 */
export function readStoredMessages (): Promise<unknown[]> {
  return storage.readMessages(Number.MAX_SAFE_INTEGER);
}
