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
 * The only test that touches a real IndexedDB. Everything else uses `FakeStorage`.
 */
import { IndexedDbStorage } from "./IndexedDbStorage";
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
    first.close();

    const second = new IndexedDbStorage(name);
    await second.open();
    const messages = await second.readMessages(10);
    expect(messages).toHaveLength(1);
    expect(messages[0].payloads[0].label).toBe("juice");
    expect(await second.readSettings()).toEqual({ "maxRecalledRecords": 12 });
    second.close();
  });

  test("a call before open rejects rather than throwing", async (): Promise<void> => {
    const unopened = new IndexedDbStorage(`AdaptivePaletteTest-unopened-${Date.now()}`);
    await expect(unopened.readMessages(10)).rejects.toThrow("The database is not open.");
  });
});
