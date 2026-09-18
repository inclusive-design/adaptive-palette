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
 * The backend choice, and the deletion of a database left by a visit from before the hosted
 * site stopped saving anything.
 *
 * `installStorage()` takes the answer rather than reading the hostname, because under the test
 * runner the hostname is always `localhost` and the hosted branch could never be reached.
 */
import { installStorage, removeLegacyDatabase } from "./InitGlobals";
import { IndexedDbStorage } from "./IndexedDbStorage";
import { MemoryStorage } from "./MemoryStorage";
import { getStorage } from "./StorageBackend";

describe("installStorage", (): void => {

  test("a page served from this computer stores in IndexedDB", (): void => {
    const storage = installStorage(true);
    expect(storage).toBeInstanceOf(IndexedDbStorage);
    expect(getStorage()).toBe(storage);
  });

  test("a hosted page stores in memory", (): void => {
    // This also fires the deletion of the app's own database at the test runner's origin,
    // which is a different origin from the dev server's, so nothing a developer is using
    // is touched.
    const storage = installStorage(false);
    expect(storage).toBeInstanceOf(MemoryStorage);
    expect(getStorage()).toBe(storage);
  });
});

describe("removeLegacyDatabase", (): void => {

  test("erases the database it names", async (): Promise<void> => {
    const name = `AdaptivePaletteTest-legacy-${Date.now()}`;

    const before = new IndexedDbStorage(name);
    await before.open();
    await before.addMessage({
      timestamp: "2026-09-17T00:00:00.000Z",
      payloads: [{ label: "juice", composition: 1840, modifierInfo: [] }]
    });
    // Asserted before the delete as well as after it: without this the test would pass just
    // as happily if the message had never been written.
    expect(await before.readMessages(10)).toHaveLength(1);
    // Awaited: the delete below is blocked by a connection that is not yet released, and in
    // WebKit that is still the case a moment after a write.
    await before.close();

    await removeLegacyDatabase(name);

    const after = new IndexedDbStorage(name);
    await after.open();
    expect(await after.readMessages(10)).toEqual([]);
    await after.close();
    // Opening it again re-created it. Deleting it a second time leaves nothing behind for the
    // next run, and shows that deleting a database twice is harmless.
    await removeLegacyDatabase(name);
  });
});
