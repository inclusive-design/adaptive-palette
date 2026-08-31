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
 * An in-memory storage backend for tests.
 *
 * Every test but `IndexedDbStorage.test.ts` uses this rather than a real database: it is
 * quick, it cannot leave a database behind for the next test to find, and deleting one is
 * slow enough in Firefox and WebKit to make tests flaky.
 *
 * Values are cloned on the way in and out, as a real store's structured clone would, so a
 * test cannot alter what is stored by holding on to a reference.
 */
import { AdaptivePaletteStorage, StoredMessage } from "../core/StorageBackend";
import { MessageRecordType } from "../core/MessageLog";

export class FakeStorage implements AdaptivePaletteStorage {

  private messages: StoredMessage[] = [];
  private settings: Record<string, unknown> = {};
  private nextId = 1;

  open (): Promise<void> {
    return Promise.resolve();
  }

  readSettings (): Promise<Record<string, unknown>> {
    return Promise.resolve(structuredClone(this.settings));
  }

  writeSettings (overrides: Record<string, unknown>): Promise<void> {
    this.settings = structuredClone(overrides);
    return Promise.resolve();
  }

  readMessages (limit: number): Promise<StoredMessage[]> {
    return Promise.resolve(limit > 0 ? structuredClone(this.messages.slice(-limit)) : []);
  }

  addMessage (record: MessageRecordType): Promise<StoredMessage> {
    const stored: StoredMessage = { ...structuredClone(record), id: this.nextId };
    this.nextId += 1;
    this.messages.push(stored);
    return Promise.resolve(structuredClone(stored));
  }

  updateMessage (id: number, record: MessageRecordType): Promise<void> {
    const index = this.messages.findIndex((message) => message.id === id);
    if (index === -1) {
      return Promise.reject(new Error(`No stored message has the id ${id}.`));
    }
    this.messages[index] = { ...structuredClone(record), id };
    return Promise.resolve();
  }

  clearAll (): Promise<void> {
    this.messages = [];
    this.settings = {};
    this.nextId = 1;
    return Promise.resolve();
  }
}
