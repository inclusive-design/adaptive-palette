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
 * The behaviour every storage backend must have, written once and run against each of them.
 * A backend that passes this is one the app can be switched to.
 */
import { AdaptivePaletteStorage } from "../core/StorageBackend";
import { MessageRecordType } from "../core/MessageLog";

/**
 * Run the shared behaviour suite against one backend.
 * @param {string} name - The backend's name, used in the describe block.
 * @param {Function} makeStorage - Builds a backend with nothing stored in it yet.
 * @returns {void}
 */
export function runStorageContractTests (
  name: string, makeStorage: () => AdaptivePaletteStorage | Promise<AdaptivePaletteStorage>
): void {
  describe(`${name} storage contract`, (): void => {

    let storage: AdaptivePaletteStorage;

    const record = (label: string): MessageRecordType => ({
      timestamp: "2026-08-28T00:00:00.000Z",
      payloads: [{ label, composition: 1840, modifierInfo: [] }]
    });

    const labelsOf = (messages: { payloads: { label: string }[] }[]): string[] =>
      messages.map((message) => message.payloads[0].label);

    beforeEach(async (): Promise<void> => {
      storage = await makeStorage();
      await storage.open();
      await storage.clearAll();
    });

    test("settings read as an empty object before anything is written", async (): Promise<void> => {
      expect(await storage.readSettings()).toEqual({});
    });

    test("settings round-trip", async (): Promise<void> => {
      await storage.writeSettings({ "maxRecalledRecords": 12, "announceSymbolOnInput": false });
      expect(await storage.readSettings()).toEqual({
        "maxRecalledRecords": 12, "announceSymbolOnInput": false
      });
    });

    test("writing settings replaces what was there", async (): Promise<void> => {
      await storage.writeSettings({ "maxRecalledRecords": 12 });
      await storage.writeSettings({ "announceSymbolOnInput": false });
      expect(await storage.readSettings()).toEqual({ "announceSymbolOnInput": false });
    });

    test("an added message comes back with an id", async (): Promise<void> => {
      const stored = await storage.addMessage(record("juice"));
      expect(typeof stored.id).toBe("number");
      expect(stored.payloads[0].label).toBe("juice");
    });

    test("each added message gets an id of its own", async (): Promise<void> => {
      const first = await storage.addMessage(record("one"));
      const second = await storage.addMessage(record("two"));
      expect(first.id).not.toBe(second.id);
    });

    test("messages read back oldest first", async (): Promise<void> => {
      await storage.addMessage(record("one"));
      await storage.addMessage(record("two"));
      await storage.addMessage(record("three"));
      expect(labelsOf(await storage.readMessages(10))).toEqual(["one", "two", "three"]);
    });

    test("a limit smaller than the store returns the newest, still oldest first", async (): Promise<void> => {
      for (const label of ["one", "two", "three", "four", "five"]) {
        await storage.addMessage(record(label));
      }
      expect(labelsOf(await storage.readMessages(2))).toEqual(["four", "five"]);
    });

    test("nothing is dropped when more is stored than is read back", async (): Promise<void> => {
      for (const label of ["one", "two", "three", "four", "five"]) {
        await storage.addMessage(record(label));
      }
      await storage.readMessages(2);
      expect(await storage.readMessages(10)).toHaveLength(5);
    });

    test("a limit of zero returns nothing", async (): Promise<void> => {
      await storage.addMessage(record("juice"));
      expect(await storage.readMessages(0)).toEqual([]);
    });

    test("updateMessage replaces the record with that id", async (): Promise<void> => {
      const first = await storage.addMessage(record("one"));
      await storage.addMessage(record("two"));
      await storage.updateMessage(first.id, { ...record("one"), telegraphicMessage: "one" });

      const messages = await storage.readMessages(10);
      expect(messages).toHaveLength(2);
      expect(messages[0].telegraphicMessage).toBe("one");
      expect(messages[1].telegraphicMessage).toBeUndefined();
    });

    test("clearAll empties both stores", async (): Promise<void> => {
      await storage.addMessage(record("juice"));
      await storage.writeSettings({ "maxRecalledRecords": 12 });

      await storage.clearAll();

      expect(await storage.readMessages(10)).toEqual([]);
      expect(await storage.readSettings()).toEqual({});
    });
  });
}
