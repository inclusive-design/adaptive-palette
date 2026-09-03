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
 * What the first-run modal needs to decide what to show: which models the configuration
 * asks for, and which of them Ollama has.
 *
 * All of it is derived. Nothing about "first run" is stored, so a tester who deletes a
 * model is offered it again, and one who never wants the modal simply dismisses it.
 * (`reloadPage()` below is the one exception: a thin wrapper the modal calls, not a
 * derivation.)
 */
import { signal, Signal } from "@preact/signals";
import { AdaptivePaletteConfigType } from "../../index.d";

export type SetupStatusType = "ready" | "noOllama" | "missingModels";

/**
 * Dismissed for this session only. Not persisted: a stored flag would hide a real problem
 * from the tester the next time they open the app.
 */
export const setupDismissedSignal: Signal<boolean> = signal(false);

/**
 * The models the configuration asks for, each named once.
 *
 * An empty `model` is not a model: `Config.ts` reads it as "whichever model Ollama reports
 * first", which is a request that no download can satisfy.
 * @param {AdaptivePaletteConfigType} config - The configuration in force.
 * @returns {string[]} - Model names, in the order the sections are read.
 */
export function requiredModels (config: AdaptivePaletteConfigType): string[] {
  const named = [
    config.indicatorLabelLookup.model,
    config.telegraphicTranslation?.model ?? "",
    config.wordPrediction.model
  ];
  return [...new Set(named.filter((name) => name !== ""))];
}

/**
 * Whether Ollama has a model.
 *
 * Ollama reports every model with a tag, and gives an untagged pull the tag `latest`, so a
 * configuration that names `gemma4` is satisfied by `gemma4:latest`.
 * @param {string[]} available - The model names Ollama reports.
 * @param {string} wanted - The name the configuration asks for.
 * @returns {boolean}
 */
export function hasModel (available: string[], wanted: string): boolean {
  const withTag = wanted.includes(":") ? wanted : `${wanted}:latest`;
  return available.some((candidate) => candidate === wanted || candidate === withTag);
}

/**
 * The models the configuration asks for that Ollama has not got.
 * @param {AdaptivePaletteConfigType} config - The configuration in force.
 * @param {string[]} available - The model names Ollama reports.
 * @returns {string[]}
 */
export function missingModels (
  config: AdaptivePaletteConfigType, available: string[]
): string[] {
  return requiredModels(config).filter((name) => !hasModel(available, name));
}

/**
 * What the modal should be showing.
 *
 * An empty model list is read as Ollama not answering, which is how the rest of the app
 * already reads it: `getModelNames()` returns an empty array both when Ollama is down and
 * when it holds no models, and either way there is nothing to query.
 * @param {AdaptivePaletteConfigType} config - The configuration in force.
 * @param {string[]} available - The model names Ollama reports.
 * @returns {SetupStatusType}
 */
export function setupStatus (
  config: AdaptivePaletteConfigType, available: string[]
): SetupStatusType {
  // Nothing is asked for, so there is nothing to set up. A `config.json` that fails to
  // parse falls back to defaults naming no model and no AI feature on: without this the
  // tester would be asked, on every load, to download a model nothing would use.
  if (requiredModels(config).length === 0) {
    return "ready";
  }
  if (available.length === 0) {
    return "noOllama";
  }
  return missingModels(config, available).length > 0 ? "missingModels" : "ready";
}

/**
 * Reload the page. Broken out on its own so a test can replace it: `window.location` is not
 * configurable in every browser engine, so a test cannot stub `reload()` on it directly.
 * @returns {void}
 */
export function reloadPage (): void {
  window.location.reload();
}
