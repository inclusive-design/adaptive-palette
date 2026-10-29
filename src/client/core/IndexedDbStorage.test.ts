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
 * The main test against a real IndexedDB; `InitGlobals.test.ts` opens one too. Everything
 * else uses `MemoryStorage`.
 */
import { ABOUT_ME_STORE, IndexedDbStorage, MESSAGES_STORE, SETTINGS_STORE } from "./IndexedDbStorage";
import { runStorageContractTests } from "../testUtils/StorageContract";

let databaseCount = 0;

runStorageContractTests("IndexedDbStorage", () => {
  databaseCount += 1;
  return new IndexedDbStorage(`AdaptivePaletteTest-${Date.now()}-${databaseCount}`);
});

describe("IndexedDbStorage", (): void => {

  test("data written before a close is there after reopening", async (): Promise<void> => {
    const name = `AdaptivePaletteTest-reopen-${Date.now()}`;

    const first = new IndexedDbStorage(name);
    await first.open();
    await first.addMessage({
      timestamp: "2026-08-28T00:00:00.000Z",
      payloads: [{ label: "juice", composition: 1840, modifierInfo: [] }]
    });
    await first.writeSettings({ "maxRecalledRecords": 12 });
    await first.close();

    const second = new IndexedDbStorage(name);
    await second.open();
    const messages = await second.readMessages(10);
    expect(messages).toHaveLength(1);
    expect(messages[0].payloads[0].label).toBe("juice");
    expect(await second.readSettings()).toEqual({ "maxRecalledRecords": 12 });
    await second.close();
  });

  test("About Me facts saved before pending existed reads back with none", async (): Promise<void> => {
    const storage = new IndexedDbStorage(`AdaptivePaletteTest-pending-${Date.now()}`);
    await storage.open();
    await storage.writeAboutMe({ facts: [], dismissed: [] } as never);
    expect(await storage.readAboutMe()).toEqual({ facts: [], dismissed: [], pending: [] });
    await storage.destroy();
  });

  test("opening a version 1 database keeps its data and adds the saved words store", async (): Promise<void> => {
    const name = `AdaptivePaletteTest-upgrade-${Date.now()}`;
    // 1. Build the database as version 1 left it: no saved words store.
    await new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.open(name, 1);
      request.onupgradeneeded = (): void => {
        const database = request.result;
        database.createObjectStore(MESSAGES_STORE, { keyPath: "id", autoIncrement: true })
          .add({ timestamp: "2026-08-28T00:00:00.000Z", payloads: [{ label: "juice", composition: 1840, modifierInfo: [] }] });
        database.createObjectStore(SETTINGS_STORE).add({ "maxRecalledRecords": 12 }, "overrides");
        database.createObjectStore(ABOUT_ME_STORE);
      };
      request.onsuccess = (): void => {
        request.result.close();
        resolve();
      };
      request.onerror = (): void => reject(new Error("Could not build the version 1 database."));
    });

    // 2. Open it as the app does now.
    const storage = new IndexedDbStorage(name);
    await storage.open();
    expect((await storage.readMessages(10))[0].payloads[0].label).toBe("juice");
    expect(await storage.readSettings()).toEqual({ "maxRecalledRecords": 12 });
    expect(await storage.readSavedWords()).toEqual([]);
    await storage.destroy();
  });

  test("an open blocked by another tab never takes the connection later", async (): Promise<void> => {
    const name = `AdaptivePaletteTest-blocked-${Date.now()}`;
    // 1. Another tab holds version 1 open and does not close it for an upgrade.
    const other = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(name, 1);
      request.onupgradeneeded = (): void => {
        request.result.createObjectStore(SETTINGS_STORE).add({ "maxRecalledRecords": 12 }, "overrides");
      };
      request.onsuccess = (): void => resolve(request.result);
      request.onerror = (): void => reject(new Error("Could not build the version 1 database."));
    });

    // 2. The app's open is blocked.
    const storage = new IndexedDbStorage(name);
    await expect(storage.open()).rejects.toThrow("another tab");

    // 3. The other tab closes, so the pending upgrade goes through. A second open at the new
    //    version queues behind it, so once that one succeeds the first has finished.
    other.close();
    const after = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(name);
      request.onsuccess = (): void => resolve(request.result);
      request.onerror = (): void => reject(new Error("Could not reopen the database."));
    });

    // 4. The blocked session still stores nothing, so it cannot overwrite the saved settings.
    await expect(storage.writeSettings({})).rejects.toThrow("The database is not open.");
    after.close();
    await new Promise<void>((resolve) => {
      const request = window.indexedDB.deleteDatabase(name);
      request.onsuccess = (): void => resolve();
      request.onerror = (): void => resolve();
    });
  });

  test("a call before open rejects rather than throwing", async (): Promise<void> => {
    const unopened = new IndexedDbStorage(`AdaptivePaletteTest-unopened-${Date.now()}`);
    await expect(unopened.readMessages(10)).rejects.toThrow("The database is not open.");
  });
});
