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

import { makeDefaultConfig } from "../core/Config";
import { adaptivePaletteGlobals } from "../state/GlobalData";
import { AdaptivePaletteConfigType } from "../index.d";

/**
 * Set the runtime config to the app defaults, with the sections the test cares about replaced.
 * Sections left out keep their default, so a test only spells out what it exercises.
 *
 * @param {Partial<AdaptivePaletteConfigType>} overrides - The sections to replace.
 */
export function setTestConfig (overrides: Partial<AdaptivePaletteConfigType> = {}): void {
  adaptivePaletteGlobals.config = { ...makeDefaultConfig(), ...overrides };
}
