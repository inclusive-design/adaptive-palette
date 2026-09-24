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
import type { AboutMeType } from "../index.d";

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

    const ABOUT_ME: AboutMeType = {
      facts: [{
        id: "fact-1", category: "Family", text: "has a dog named Rex",
        source: "manual", addedAt: "2026-09-22T00:00:00.000Z"
      }],
      dismissed: [{ category: "Preferences", text: "likes cats" }],
      pending: [{ category: "Family", text: "sister Ana" }],
      learntUpTo: { id: 7, timestamp: "2026-09-24T15:15:00.000Z" }
    };
    const EMPTY_ABOUT_ME: AboutMeType = { facts: [], dismissed: [], pending: [] };

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

    test("About Me reads as empty before anything is written", async (): Promise<void> => {
      expect(await storage.readAboutMe()).toEqual(EMPTY_ABOUT_ME);
    });

    test("About Me round-trips", async (): Promise<void> => {
      await storage.writeAboutMe(ABOUT_ME);
      expect(await storage.readAboutMe()).toEqual(ABOUT_ME);
    });

    test("writing About Me replaces what was there", async (): Promise<void> => {
      await storage.writeAboutMe(ABOUT_ME);
      const replacement: AboutMeType = {
        facts: [], dismissed: [{ category: "Preferences", text: "likes tea" }], pending: []
      };
      await storage.writeAboutMe(replacement);
      expect(await storage.readAboutMe()).toEqual(replacement);
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

    test("readMessagesAfter with no id reads from the oldest", async (): Promise<void> => {
      for (const label of ["one", "two", "three"]) {
        await storage.addMessage(record(label));
      }
      expect(labelsOf(await storage.readMessagesAfter(undefined, 2))).toEqual(["one", "two"]);
    });

    test("readMessagesAfter reads only messages after the id, oldest first", async (): Promise<void> => {
      await storage.addMessage(record("one"));
      const second = await storage.addMessage(record("two"));
      for (const label of ["three", "four", "five"]) {
        await storage.addMessage(record(label));
      }
      expect(labelsOf(await storage.readMessagesAfter(second.id, 10))).toEqual(["three", "four", "five"]);
      expect(labelsOf(await storage.readMessagesAfter(second.id, 2))).toEqual(["three", "four"]);
    });

    test("readMessagesAfter reads nothing after the newest message", async (): Promise<void> => {
      await storage.addMessage(record("one"));
      const last = await storage.addMessage(record("two"));
      expect(await storage.readMessagesAfter(last.id, 10)).toEqual([]);
    });

    test("readMessagesAfter with a limit of zero reads nothing", async (): Promise<void> => {
      await storage.addMessage(record("one"));
      expect(await storage.readMessagesAfter(undefined, 0)).toEqual([]);
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

    test("updateMessage stores a record whose id nothing is under", async (): Promise<void> => {
      const first = await storage.addMessage(record("one"));
      await storage.updateMessage(first.id + 100, record("two"));

      expect(labelsOf(await storage.readMessages(10))).toEqual(["one", "two"]);
    });

    test("clearAll empties every store", async (): Promise<void> => {
      await storage.addMessage(record("juice"));
      await storage.writeSettings({ "maxRecalledRecords": 12 });
      await storage.writeAboutMe(ABOUT_ME);

      await storage.clearAll();

      expect(await storage.readMessages(10)).toEqual([]);
      expect(await storage.readSettings()).toEqual({});
      expect(await storage.readAboutMe()).toEqual(EMPTY_ABOUT_ME);
    });

    test("destroy leaves a store with nothing in it", async (): Promise<void> => {
      await storage.writeSettings({ "maxRecalledRecords": 12 });
      await storage.addMessage(record("hello"));
      await storage.writeAboutMe(ABOUT_ME);

      await storage.destroy();
      await storage.open();

      expect(await storage.readSettings()).toEqual({});
      expect(await storage.readMessages(10)).toEqual([]);
      expect(await storage.readAboutMe()).toEqual(EMPTY_ABOUT_ME);
    });
  });
}
