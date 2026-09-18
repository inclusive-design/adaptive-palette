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
 * A storage backend that keeps everything in memory and nothing in the browser.
 *
 * This is what the hosted site runs on. Away from `localhost` the app may be on a public or
 * shared computer, where a message left in IndexedDB is readable by whoever sits down at it
 * next. Holding the data here instead means nothing outlives the tab: a reload clears it.
 *
 * It is also what every test but the two that open a real database stores into. It is quick, it
 * cannot leave a database behind for the next test to find, and deleting one is slow enough
 * in Firefox and WebKit to make tests flaky.
 *
 * Values are cloned on the way in and out, as a real store's structured clone would, so a
 * caller cannot alter what is stored by holding on to a reference.
 */
import { AdaptivePaletteStorage, StoredMessage } from "./StorageBackend";
import { MessageRecordType } from "./MessageLog";

/*
 * What this backend means for the user, shown on the hosted site's status line. It lives here
 * rather than with the other status text because it states this backend's own consequence.
 */
export const NOT_SAVED_MESSAGE =
  "Nothing is saved on this computer. Reloading the page clears your messages and settings.";

export class MemoryStorage implements AdaptivePaletteStorage {

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
    const stored: StoredMessage = { ...structuredClone(record), id };
    const index = this.messages.findIndex((message) => message.id === id);
    if (index === -1) {
      // What IndexedDB's `put` does with a key nothing is stored under.
      this.messages.push(stored);
      this.nextId = Math.max(this.nextId, id + 1);
    } else {
      this.messages[index] = stored;
    }
    return Promise.resolve();
  }

  clearAll (): Promise<void> {
    this.messages = [];
    this.settings = {};
    this.nextId = 1;
    return Promise.resolve();
  }

  destroy (): Promise<void> {
    this.messages = [];
    this.settings = {};
    this.nextId = 1;
    return Promise.resolve();
  }
}
