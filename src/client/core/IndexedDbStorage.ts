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
 * The web build's storage: one IndexedDB database with a store for messages and a store for
 * settings.
 *
 * Nothing is ever deleted to make room. The message log is kept whole, and how much of it the
 * app reads back is `maxRecalledRecords`, applied by the caller through `readMessages()`.
 */
import { AdaptivePaletteStorage, StoredMessage } from "./StorageBackend";
import type { MessageRecordType } from "./MessageLog";

export const DATABASE_NAME = "AdaptivePalette";
export const MESSAGES_STORE = "messages";
export const SETTINGS_STORE = "settings";

const DATABASE_VERSION = 1;

// The settings store holds one record; this is its key.
const SETTINGS_KEY = "overrides";

/**
 * An `Error` for a failed request. `DOMException` carries the real message but is not
 * statically an `Error`, so it is wrapped rather than rejected with directly. The name is
 * kept: it is what tells a full disk from a duplicate key, and it is all a caller's
 * `console.error` will have to go on.
 * @param {IDBRequest} request - The request that failed.
 * @returns {Error}
 */
function requestError (request: IDBRequest): Error {
  const failure = request.error;
  return failure
    ? new Error(`${failure.name}: ${failure.message}`)
    : new Error("The IndexedDB request failed.");
}

/**
 * An IndexedDB request as a promise.
 * @param {IDBRequest} request - The request to wait on.
 * @returns {Promise} - Resolves with the request's result, rejects with its error.
 */
function asPromise<T> (request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = (): void => resolve(request.result);
    request.onerror = (): void => reject(requestError(request));
  });
}

export class IndexedDbStorage implements AdaptivePaletteStorage {

  private database: IDBDatabase | undefined;
  private readonly name: string;

  /**
   * @param {string} name - The database name. Tests pass one of their own so they never share
   *                        a database with each other or with the running app.
   */
  constructor (name: string = DATABASE_NAME) {
    this.name = name;
  }

  open (): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.name, DATABASE_VERSION);
      request.onupgradeneeded = (): void => {
        const database = request.result;
        if (!database.objectStoreNames.contains(MESSAGES_STORE)) {
          // Auto-incremented keys rise with insertion, so key order is time order and the
          // newest messages are the tail. That is what makes `readMessages()` a cursor walked
          // backwards from the end rather than a sort.
          database.createObjectStore(MESSAGES_STORE, { keyPath: "id", autoIncrement: true });
        }
        if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
          database.createObjectStore(SETTINGS_STORE);
        }
      };
      // Another tab holding the old version open. Rejected rather than left hanging: the
      // caller logs it and degrades to storing nothing, which is better than never starting.
      request.onblocked = (): void => {
        reject(new Error("The saved data cannot be opened while another tab has it open."));
      };
      request.onsuccess = (): void => {
        this.database = request.result;
        resolve();
      };
      request.onerror = (): void => reject(requestError(request));
    });
  }

  /** Release the connection. Used by tests; the app holds one open for its lifetime. */
  close (): void {
    this.database?.close();
    this.database = undefined;
  }

  /**
   * One object store, inside a transaction of its own.
   * @param {string} name - The store's name.
   * @param {IDBTransactionMode} mode - `"readonly"` or `"readwrite"`.
   * @returns {IDBObjectStore}
   */
  private objectStore (name: string, mode: IDBTransactionMode): IDBObjectStore {
    if (!this.database) {
      throw new Error("The database is not open.");
    }
    return this.database.transaction(name, mode).objectStore(name);
  }

  async readSettings (): Promise<Record<string, unknown>> {
    const stored: unknown = await asPromise(
      this.objectStore(SETTINGS_STORE, "readonly").get(SETTINGS_KEY)
    );
    return stored !== null && typeof stored === "object" ? stored as Record<string, unknown> : {};
  }

  async writeSettings (overrides: Record<string, unknown>): Promise<void> {
    await asPromise(this.objectStore(SETTINGS_STORE, "readwrite").put(overrides, SETTINGS_KEY));
  }

  readMessages (limit: number): Promise<StoredMessage[]> {
    if (limit <= 0) {
      return Promise.resolve([]);
    }
    return new Promise((resolve, reject) => {
      let request: IDBRequest<IDBCursorWithValue | null>;
      try {
        request = this.objectStore(MESSAGES_STORE, "readonly").openCursor(null, "prev");
      } catch (error) {
        // `objectStore()` only ever throws the "not open" Error above.
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      const newest: StoredMessage[] = [];
      request.onsuccess = (): void => {
        const cursor = request.result;
        if (cursor && newest.length < limit) {
          newest.push(cursor.value as StoredMessage);
          cursor.continue();
        } else {
          // Walked newest first; the caller wants oldest first.
          resolve(newest.reverse());
        }
      };
      request.onerror = (): void => reject(requestError(request));
    });
  }

  async addMessage (record: MessageRecordType): Promise<StoredMessage> {
    const id = await asPromise(this.objectStore(MESSAGES_STORE, "readwrite").add(record));
    return { ...record, id: id as number };
  }

  async updateMessage (id: number, record: MessageRecordType): Promise<void> {
    await asPromise(this.objectStore(MESSAGES_STORE, "readwrite").put({ ...record, id }));
  }

  clearAll (): Promise<void> {
    if (!this.database) {
      return Promise.reject(new Error("The database is not open."));
    }
    // Both stores in one transaction, so a failure on either leaves both as they were rather
    // than the messages gone and the settings kept.
    const transaction = this.database.transaction([MESSAGES_STORE, SETTINGS_STORE], "readwrite");
    transaction.objectStore(MESSAGES_STORE).clear();
    transaction.objectStore(SETTINGS_STORE).clear();
    return new Promise((resolve, reject) => {
      const failed = (): void => reject(
        transaction.error
          ? new Error(`${transaction.error.name}: ${transaction.error.message}`)
          : new Error("The saved data could not be cleared.")
      );
      transaction.oncomplete = (): void => resolve();
      transaction.onerror = failed;
      transaction.onabort = failed;
    });
  }
}
