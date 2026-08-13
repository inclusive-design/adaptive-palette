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
 */
import { adaptivePaletteGlobals } from "../state/GlobalData";
import { loadConfig } from "./Config";
import { getModelNames } from "./OllamaApi";
import { initIndicatorLabels } from "../utils/IndicatorLabelsUtils";
import { initSvgCompositeDefinitions } from "../utils/SvgUtils";

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
  initSvgCompositeDefinitions();
  adaptivePaletteGlobals.mainPaletteContainerId = mainPaletteContainerId || "";
  const [ models, config ] = await Promise.all([
    getModelNames(),
    loadConfig(),
    initIndicatorLabels()
  ]);
  adaptivePaletteGlobals.models = models;
  adaptivePaletteGlobals.config = config;

  // Clean up the system prompts left in local storage by earlier builds.
  window.localStorage.removeItem("Telegraphic System Prompts");
}
