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

import { AdaptivePaletteStorage, getStorage, setStorage } from "./StorageBackend";

describe("storage backend registry", (): void => {

  const backend = (): AdaptivePaletteStorage => ({
    open: (): Promise<void> => Promise.resolve(),
    readSettings: (): Promise<Record<string, unknown>> => Promise.resolve({}),
    writeSettings: (): Promise<void> => Promise.resolve(),
    readMessages: () => Promise.resolve([]),
    addMessage: (record) => Promise.resolve({ ...record, id: 1 }),
    updateMessage: (): Promise<void> => Promise.resolve(),
    clearAll: (): Promise<void> => Promise.resolve(),
    destroy: (): Promise<void> => Promise.resolve()
  });

  // First in the file deliberately: the registry is module state, so this is the only point
  // at which nothing has been installed yet.
  test("asking for a backend before one is installed throws", (): void => {
    expect(() => getStorage()).toThrow("No storage backend has been installed.");
  });

  test("the installed backend is the one handed back", (): void => {
    const installed = backend();
    setStorage(installed);
    expect(getStorage()).toBe(installed);
  });

  test("installing a second backend replaces the first", (): void => {
    const first = backend();
    const second = backend();
    setStorage(first);
    setStorage(second);
    expect(getStorage()).toBe(second);
  });
});
