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
 * Where the app's data lives, behind an interface a second implementation can satisfy.
 *
 * The web build installs `IndexedDbStorage`; a desktop build will install a different
 * one, changing only the line in `InitGlobals.ts` that calls `setStorage()`.
 *
 * The interface names the app's own operations rather than generic get/set, so each backend
 * can use what its store is good at: a cursor in IndexedDB, a real table in SQL.
 *
 * `MessageRecordType` is imported as a type only, so this module adds nothing to the runtime
 * dependency graph and no cycle is formed with `MessageLog.ts`.
 */
import type { MessageRecordType } from "./MessageLog";

// A message as it exists in storage: the record plus the identity storage gave it.
export type StoredMessage = MessageRecordType & { id: number };

export interface AdaptivePaletteStorage {
  /** Ready the store for use. Rejects when the browser will not give the app a database. */
  open (): Promise<void>;

  /** The saved settings overrides, or an empty object when nothing has been saved. */
  readSettings (): Promise<Record<string, unknown>>;

  /** Replace the saved settings overrides. */
  writeSettings (overrides: Record<string, unknown>): Promise<void>;

  /** The newest `limit` messages, oldest first. Empty when `limit` is not positive. */
  readMessages (limit: number): Promise<StoredMessage[]>;

  /** Store a message that is not in the store yet, and hand back the id it was given. */
  addMessage (record: MessageRecordType): Promise<StoredMessage>;

  /** Replace the message with that id, storing it when nothing is under that id yet. */
  updateMessage (id: number, record: MessageRecordType): Promise<void>;

  /** Discard everything the app has stored. */
  clearAll (): Promise<void>;

  /**
   * Remove the store itself, not just its contents.
   *
   * `clearAll()` empties the store and leaves it in place, which is what the in-app
   * "clear saved data" wants. This is what uninstalling wants: nothing of the app's is
   * left in the browser afterwards. The store can be opened again, empty.
   */
  destroy (): Promise<void>;
}

let backend: AdaptivePaletteStorage | undefined;

/**
 * Install the backend the app will use. Called once from `initAdaptivePaletteGlobals()`, and
 * by tests that install a fake. Not called at module scope anywhere: a test must be free to
 * decide for itself what it is storing into.
 * @param {AdaptivePaletteStorage} storage - The backend to use.
 * @returns {void}
 */
export function setStorage (storage: AdaptivePaletteStorage): void {
  backend = storage;
}

/**
 * The installed backend.
 *
 * Throws when none is installed. Every caller reaches this from inside an `async` function or
 * a `try`, so the throw becomes a rejected promise that is logged rather than an error thrown
 * into the UI.
 * @returns {AdaptivePaletteStorage}
 */
export function getStorage (): AdaptivePaletteStorage {
  if (!backend) {
    throw new Error("No storage backend has been installed.");
  }
  return backend;
}
