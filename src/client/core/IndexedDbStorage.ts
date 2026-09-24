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
 * The storage of a page served from this computer: one IndexedDB database with a store each
 * for messages, settings and About Me. The hosted site uses `MemoryStorage` instead and
 * keeps nothing.
 *
 * Nothing is ever deleted to make room. The message log is kept whole, and how much of it the
 * app reads back is `maxRecalledRecords`, applied by the caller through `readMessages()`.
 */
import { AdaptivePaletteStorage, StoredMessage } from "./StorageBackend";
import type { MessageRecordType } from "./MessageLog";
import type { AboutMeType } from "../index.d";

export const DATABASE_NAME = "AdaptivePalette";
export const MESSAGES_STORE = "messages";
export const SETTINGS_STORE = "settings";
export const ABOUT_ME_STORE = "aboutMe";

const DATABASE_VERSION = 1;

// The settings store holds one record; this is its key.
const SETTINGS_KEY = "overrides";

// The About Me store holds one record; this is its key.
const ABOUT_ME_KEY = "aboutMe";

// Every store, for the transactions that must cover all of them.
const ALL_STORES = [MESSAGES_STORE, SETTINGS_STORE, ABOUT_ME_STORE];

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
        if (!database.objectStoreNames.contains(ABOUT_ME_STORE)) {
          database.createObjectStore(ABOUT_ME_STORE);
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

  /**
   * Release the connection. Used by tests; the app holds one open for its lifetime.
   *
   * A request's `onsuccess` fires before its transaction actually commits, and in WebKit that
   * gap is wide enough that closing right after a write does not yet fully release the
   * connection -- whatever comes next then sees a connection that looks still open. A no-op
   * transaction queues behind whatever came before it and only completes once that has, so
   * waiting on it first is a reliable way to know the connection is free to close.
   *
   * The no-op is `readwrite` although it writes nothing: two `readonly` transactions may run
   * at the same time, so a `readonly` one would not be made to wait for a read.
   * @returns {Promise<void>} - Resolves once the connection is actually released. A caller
   *                            that does nothing afterwards need not wait.
   */
  async close (): Promise<void> {
    if (this.database) {
      const database = this.database;
      try {
        await new Promise<void>((resolve) => {
          const flush = database.transaction(ALL_STORES, "readwrite");
          flush.oncomplete = (): void => resolve();
          flush.onerror = (): void => resolve();
          flush.onabort = (): void => resolve();
        });
      } catch {
        // `transaction()` throws on a connection that is already going away. There is then
        // nothing to wait for, and the release below must happen either way.
      }
    }
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

  async readAboutMe (): Promise<AboutMeType> {
    const stored = await asPromise(
      this.objectStore(ABOUT_ME_STORE, "readonly").get(ABOUT_ME_KEY)
    ) as Partial<AboutMeType> | undefined;
    // Hand-editable through the developer tools, so each list is checked. The entries
    // themselves, and `learntUpTo`, are checked by `hydrateAboutMe()`.
    const facts = stored?.facts;
    const dismissed = stored?.dismissed;
    const pending = stored?.pending;
    return {
      facts: Array.isArray(facts) ? facts : [],
      dismissed: Array.isArray(dismissed) ? dismissed : [],
      pending: Array.isArray(pending) ? pending : [],
      ...(stored?.learntUpTo === undefined ? {} : { learntUpTo: stored.learntUpTo })
    };
  }

  async writeAboutMe (aboutMe: AboutMeType): Promise<void> {
    await asPromise(this.objectStore(ABOUT_ME_STORE, "readwrite").put(aboutMe, ABOUT_ME_KEY));
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

  readMessagesAfter (afterId: number | undefined, limit: number): Promise<StoredMessage[]> {
    if (limit <= 0) {
      return Promise.resolve([]);
    }
    return new Promise((resolve, reject) => {
      let request: IDBRequest<IDBCursorWithValue | null>;
      try {
        // Keys are ids, so walking forward from just past `afterId` is oldest first.
        const range = afterId === undefined ? null : IDBKeyRange.lowerBound(afterId, true);
        request = this.objectStore(MESSAGES_STORE, "readonly").openCursor(range);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      const oldest: StoredMessage[] = [];
      request.onsuccess = (): void => {
        const cursor = request.result;
        if (cursor && oldest.length < limit) {
          oldest.push(cursor.value as StoredMessage);
          cursor.continue();
        } else {
          resolve(oldest);
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
    // Every store in one transaction, so a failure on any leaves all of them as they were.
    const transaction = this.database.transaction(ALL_STORES, "readwrite");
    ALL_STORES.forEach((store) => transaction.objectStore(store).clear());
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

  async destroy (): Promise<void> {
    // The connection has to go first, and has to be gone rather than merely closed: an open
    // one blocks the delete indefinitely, and a connection closed mid-transaction still
    // counts as open. `close()` waits that out.
    await this.close();
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.deleteDatabase(this.name);
      // Another tab still has it open. Reported rather than left hanging, so the caller
      // can tell the tester to close the other tab.
      request.onblocked = (): void => {
        reject(new Error("The saved data cannot be deleted while another tab has it open."));
      };
      request.onsuccess = (): void => resolve();
      request.onerror = (): void => reject(requestError(request));
    });
  }
}
