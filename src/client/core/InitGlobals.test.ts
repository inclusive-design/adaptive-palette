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
import { initAdaptivePaletteGlobals, installStorage } from "./InitGlobals";
import { adaptivePaletteGlobals } from "../state/GlobalData";
import { languageSignal } from "../i18n/I18n";
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

describe("initAdaptivePaletteGlobals language", (): void => {

  afterEach((): void => {
    history.replaceState(null, "", window.location.pathname);
    languageSignal.value = "en";
  });

  test("`?lang=` in the page URL picks the language", async (): Promise<void> => {
    history.replaceState(null, "", "?lang=sv");
    await initAdaptivePaletteGlobals();
    expect(languageSignal.value).toBe("sv");
    expect(adaptivePaletteGlobals.config.language).toBe("en");
  });

  test("a saved language beats the file, and `?lang=` beats the saved language", async (): Promise<void> => {
    // `initAdaptivePaletteGlobals()` installs and opens the same database, so seed it first.
    const seed = installStorage(true);
    await seed.open();
    await seed.writeSettings({ language: "sv" });
    try {
      await initAdaptivePaletteGlobals();
      expect(languageSignal.value).toBe("sv");

      history.replaceState(null, "", "?lang=en");
      await initAdaptivePaletteGlobals();
      expect(languageSignal.value).toBe("en");
    } finally {
      await getStorage().writeSettings({});
    }
  });

  test("an unsupported `?lang=` leaves the configured language", async (): Promise<void> => {
    history.replaceState(null, "", "?lang=xx");
    await initAdaptivePaletteGlobals();
    expect(languageSignal.value).toBe("en");
  });
});
