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

import { adaptivePaletteGlobals, NO_MODELS_MESSAGE } from "./GlobalData";
import { queryChat } from "./ollamaApi";

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
 */
export function pickModel (configuredModel: string): string {
  const { LLMs } = adaptivePaletteGlobals;
  if (LLMs.includes(configuredModel)) {
    return configuredModel;
  }
  console.warn(`Model "${configuredModel}" is not available; using "${LLMs[0]}" instead.`);
  return LLMs[0];
}

/**
 * Substitute `{{name}}` placeholders in a prompt template. Placeholders with no matching
 * value are left in place.
 * @param {string} template - The template text.
 * @param {Record<string, string>} values - Placeholder values by name.
 * @returns {string}
 */
export function renderTemplate (template: string, values: Record<string, string>): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (placeholder, name: string) => (name in values ? values[name] : placeholder)
  );
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
    .map((line) => line.trim().replace(/^\d+[.)]\s*/, "").trim())
    .filter((line) => line.length > 0 && !line.endsWith(":"));
}

/**
 * Ask the model to turn a telegraphic message into complete sentences.
 * @param {string} telegraphicMessage - The labels from the input area, space separated.
 * @returns {Promise<TranslationResultType>}
 */
export async function requestSentences (telegraphicMessage: string): Promise<TranslationResultType> {
  const config= adaptivePaletteGlobals.config.telegraphicTranslation;
  if (!config) {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  }
  if (adaptivePaletteGlobals.LLMs.length === 0) {
    throw new Error(NO_MODELS_MESSAGE);
  }
  const model = pickModel(config.model);
  const values = {
    numSentences: String(config.numSentences),
    telegraphicMessage
  };

  const response = await queryChat(
    renderTemplate(config.userPrompt, values),
    model,
    false,
    renderTemplate(config.systemPrompt, values)
  );
  const content = "message" in response ? (response.message?.content || "") : "";
  const sentences = parseSentences(content);
  if (sentences.length === 0) {
    throw new Error(NO_SENTENCES_MESSAGE);
  }
  return { sentences, model };
}
