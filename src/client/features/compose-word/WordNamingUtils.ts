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
 * The model's names for a new word, from its parts, asked for as the naming dialog opens.
 * Desktop version only.
 */
import { adaptivePaletteGlobals } from "../../state/GlobalData";
import { isLocalHost, queryChat } from "../../core/OllamaApi";
import { languageSignal } from "../../i18n/I18n";
import { promptsFor, renderTemplate, replyLine } from "../../utils/PromptUtils";
import { pickModel } from "../telegraphic-translation/TelegraphicTranslationUtils";

export const MAX_SUGGESTED_NAMES = 3;

/**
 * Whether the model is asked for names: on the desktop version, with a model, and the `wordNaming`
 * section configured for the UI language.
 * @returns {boolean}
 */
export function canSuggestNames (): boolean {
  const { config, models } = adaptivePaletteGlobals;
  return isLocalHost() && models.length > 0 && promptsFor(config.wordNaming, languageSignal.value) !== undefined;
}

/**
 * The names in a model's reply, one per line, without list markers or quotes. A line ending in a
 * colon is preamble ("Here are 3 names:"). A name met before, in any case, and the name already
 * offered are left out.
 * @param {string} content - The reply.
 * @param {string} offeredName - The name the dialog offers already.
 * @returns {string[]} - At most `MAX_SUGGESTED_NAMES`.
 */
export function parseNames (content: string, offeredName: string): string[] {
  const seen = new Set([offeredName.toLowerCase()]);
  const names: string[] = [];
  for (const line of content.split("\n")) {
    const name = replyLine(line).replace(/^["']|["']$/g, "").trim();
    if (name && !name.endsWith(":") && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      names.push(name);
    }
  }
  return names.slice(0, MAX_SUGGESTED_NAMES);
}

/**
 * Ask the model for names for a new word.
 * @param {string[]} partLabels - The labels of the word's words, in order.
 * @param {string} offeredName - The name the dialog offers already.
 * @param {AbortSignal} abortSignal - Stops the request.
 * @returns {Promise<string[]>} - Rejects when the model cannot be reached or the request is stopped.
 */
export async function requestNameSuggestions (
  partLabels: string[], offeredName: string, abortSignal?: AbortSignal
): Promise<string[]> {
  const config = adaptivePaletteGlobals.config.wordNaming;
  const prompts = promptsFor(config, languageSignal.peek());
  if (!config || !prompts) {
    return [];
  }
  const values = { parts: partLabels.join(" + "), numNames: String(MAX_SUGGESTED_NAMES) };
  const response = await queryChat(
    renderTemplate(prompts.userPrompt, values), pickModel(config.model), false,
    renderTemplate(prompts.systemPrompt, values), abortSignal
  );
  const content = "message" in response ? (response.message?.content || "") : "";
  return parseNames(content, offeredName);
}
