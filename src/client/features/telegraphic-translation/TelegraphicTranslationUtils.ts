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

import { adaptivePaletteGlobals } from "../../state/GlobalData";
import { renderTemplate, renderPromptLines } from "../../utils/PromptUtils";
import { queryChat, NO_MODELS_MESSAGE } from "../../core/OllamaApi";
import { attributesPromptText } from "../message-attributes/MessageAttributesState";

export const NOT_CONFIGURED_MESSAGE = "Sentence translation is not configured. Check the telegraphicTranslation section of config.json.";
export const NO_SENTENCES_MESSAGE = "The model returned no usable sentences.";

export type TranslationResultType = {
  sentences: string[],
  model: string
};

/**
 * Choose the model to query: the configured one when Ollama reports it as available,
 * otherwise the first available model.
 * @param {string} configuredModel - The model name from the config, possibly empty.
 * @returns {string}
 * @throws {Error} When no models are available.
 */
export function pickModel (configuredModel: string): string {
  const { models } = adaptivePaletteGlobals;
  if (models.length === 0) {
    throw new Error(NO_MODELS_MESSAGE);
  }
  if (models.includes(configuredModel)) {
    return configuredModel;
  }
  console.warn(`Model "${configuredModel}" is not available; using "${models[0]}" instead.`);
  return models[0];
}

/**
 * Split a model reply into candidate sentences: one per line, blank lines dropped, and a
 * leading list number ("1.", "2)") stripped. Lines ending in a colon are dropped as preamble
 * ("Sure, here are the sentences:"). A count that differs from the requested one is accepted
 * because usable sentences beat an error message.
 * @param {string} content - The raw reply content.
 * @returns {string[]}
 */
export function parseSentences (content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.trim().replace(/^(?:\d+[.)]|[-*•])\s*/, "").trim())
    .filter((line) => line.length > 0 && !line.endsWith(":"));
}

/**
 * Ask the model to turn a telegraphic message into complete sentences.
 * @param {string} telegraphicMessage - The labels from the input area, space separated.
 * @param {AbortSignal} abortSignal - Optional signal to cancel the request when the user
 *                                edits the message the sentences were asked for.
 * @returns {Promise<TranslationResultType>}
 */
export async function requestSentences (telegraphicMessage: string, abortSignal?: AbortSignal): Promise<TranslationResultType> {
  const config = adaptivePaletteGlobals.config.telegraphicTranslation;
  if (!config) {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  }
  const model = pickModel(config.model);
  const values = {
    numSentences: String(config.numSentences),
    telegraphicMessage,
    attributes: attributesPromptText()
  };

  const response = await queryChat(
    renderPromptLines(config.userPrompt, values),
    model,
    false,
    renderTemplate(config.systemPrompt, values),
    abortSignal
  );
  const content = "message" in response ? (response.message?.content || "") : "";
  const sentences = parseSentences(content);
  if (sentences.length === 0) {
    throw new Error(NO_SENTENCES_MESSAGE);
  }
  return { sentences, model };
}
