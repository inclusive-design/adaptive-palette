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
 * Start-up orchestration for the globals in `GlobalData.ts`.
 *
 * This lives above `GlobalData` rather than inside it.  Initialization has to reach down into
 * `SvgUtils`, `IndicatorLabelsUtils` and `OllamaApi`, and each of those reads the globals back,
 * so holding this function in `GlobalData` made that module part of a cycle with all three.
 *
 * For the same reason, `GlobalData` must NOT re-export `initAdaptivePaletteGlobals`.  A value
 * re-export is a real import and would rebuild the cycle.
 *
 * It is also where telegraphic translation's edit guard is registered.  Registering it at that
 * feature's own module scope would fire on any import of the module, including from tests that
 * import it directly and need to decide for themselves whether a guard is in play.
 *
 * It also installs the storage backend and reads the saved data in.  The backend is installed
 * here, not at module scope, so a test can put its own in place instead.
 */
import { adaptivePaletteGlobals } from "../state/GlobalData";
import { loadConfig } from "./Config";
import { getModelNames } from "./OllamaApi";
import { initIndicatorLabels } from "../utils/IndicatorLabelsUtils";
import { initSvgCompositeDefinitions } from "../utils/SvgUtils";
import { applyStoredSettings } from "../features/settings/SettingsSchema";
import { setEditGuard } from "./MessageEdit";
import { guardEdit } from "../features/telegraphic-translation/TelegraphicTranslationState";
import { IndexedDbStorage } from "./IndexedDbStorage";
import { setStorage } from "./StorageBackend";
import { hydrateMessageLog } from "./MessageLog";

/**
 * Initialize the `adaptivePaletteGlobals` structure.
 * @param {HTMLElement} mainPaletteContainerId  - Optional argument specifying
 *                                                the id of a container element,
 *                                                e.g., a `<div>` element, to
 *                                                use for rendering the the
 *                                                main paletted Defaults to the
 *                                                empty string which denotes
 *                                                the `<body>delement.
 */
export async function initAdaptivePaletteGlobals (mainPaletteContainerId?:string): Promise<void> {
  // Registered before anything renders, so no edit can reach the message unguarded. Every
  // edit is offered to telegraphic translation, which holds the ones that would throw away a
  // request or the sentences on screen until the user agrees to them.
  setEditGuard(guardEdit);
  initSvgCompositeDefinitions();
  adaptivePaletteGlobals.mainPaletteContainerId = mainPaletteContainerId || "";

  // Installed before it is opened, so a browser that refuses a database still leaves every
  // later call with somewhere to fail: the calls reject and are logged, and the app runs for
  // the session with nothing persisted.
  const storage = new IndexedDbStorage();
  setStorage(storage);

  const [ models, config ] = await Promise.all([
    getModelNames(),
    loadConfig(),
    initIndicatorLabels(),
    storage.open().catch((error: unknown) => {
      console.error(`Could not open the saved data: ${String(error)}`);
    })
  ]);
  adaptivePaletteGlobals.models = models;
  adaptivePaletteGlobals.fileConfig = config;
  // The user's saved settings are applied.
  adaptivePaletteGlobals.config = await applyStoredSettings(config);

  // After the settings, because how much of the log is read back is one of them.
  await hydrateMessageLog();

  // Clean up what earlier builds left in local storage. Nothing writes to it any more, and
  // the app owns its origin.
  window.localStorage.clear();
}
