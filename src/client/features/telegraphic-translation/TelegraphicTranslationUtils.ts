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
import { renderTemplate, renderPromptLines, promptsFor } from "../../utils/PromptUtils";
import { queryChat } from "../../core/OllamaApi";
import { attributesPromptText } from "../message-attributes/MessageAttributesState";
import { aboutMePromptText } from "../about-me/AboutMeState";
import { Language, languageSignal, t } from "../../i18n/I18n";
import {
  FUTURE_INDICATOR_ID, IMPERATIVE_INDICATOR_ID, PAST_INDICATOR_ID, PLURAL_INDICATOR_ID
} from "./BlissSentenceUtils";
import type { SentenceSpanType } from "../../index.d";

export type TranslationResultType = {
  sentences: string[],
  model: string,
  language: Language,
  words: Map<string, SentenceSpanType[]>
};

// The tags a word in a words line may carry, and the indicator each one calls for.
const WORD_TAG_INDICATORS: Record<string, number> = {
  past: PAST_INDICATOR_ID,
  future: FUTURE_INDICATOR_ID,
  imperative: IMPERATIVE_INDICATOR_ID,
  plural: PLURAL_INDICATOR_ID
};

// A list number or bullet at the start of a reply line.
const LIST_MARKER = /^(?:\d+[.)]|[-*•])\s*/;

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
    throw new Error(t("noModels"));
  }
  if (models.includes(configuredModel)) {
    return configuredModel;
  }
  console.warn(`Model "${configuredModel}" is not available; using "${models[0]}" instead.`);
  return models[0];
}

/**
 * One reply line without its list number, or `undefined` when it is not a sentence: blank, a
 * preamble ending in a colon, or a words line.
 * @param {string} line - One line of the reply.
 * @returns {string | undefined}
 */
function sentenceLine (line: string): string | undefined {
  const trimmed = line.trim();
  if (trimmed.startsWith(">")) {
    return undefined;
  }
  const sentence = trimmed.replace(LIST_MARKER, "").trim();
  return sentence.length > 0 && !sentence.endsWith(":") ? sentence : undefined;
}

/**
 * Split a model reply into candidate sentences: one per line, blank lines and words lines
 * dropped, and a leading list number ("1.", "2)") stripped. Lines ending in a colon are
 * dropped as preamble ("Sure, here are the sentences:"). A count that differs from the
 * requested one is accepted because usable sentences beat an error message.
 * @param {string} content - The raw reply content.
 * @returns {string[]}
 */
export function parseSentences (content: string): string[] {
  return content.split("\n")
    .map(sentenceLine)
    .filter((sentence): sentence is string => sentence !== undefined);
}

/**
 * Read one words line, such as `> Jag=jag | åt=äta+past | .`. Each part is `text=base`, with
 * an optional `+tag`, or a punctuation mark alone. `undefined` when any part is malformed,
 * so the sentence is offered without a Bliss row rather than with a wrong one.
 * @param {string} line - The line, with its leading `>`.
 * @returns {SentenceSpanType[] | undefined}
 */
export function parseWordsLine (line: string): SentenceSpanType[] | undefined {
  const spans: SentenceSpanType[] = [];
  for (const part of line.trim().replace(/^>\s*/, "").split("|").map((piece) => piece.trim())) {
    if (/^[^\p{L}\p{N}]+$/u.test(part)) {
      spans.push({ text: part, key: part, isPunctuation: true });
      continue;
    }
    const match = /^(.+?)\s*=\s*(.+?)(?:\s*\+\s*(\w+))?$/u.exec(part);
    const tag = match?.[3]?.toLowerCase();
    if (!match || (tag !== undefined && !Object.hasOwn(WORD_TAG_INDICATORS, tag))) {
      return undefined;
    }
    spans.push({
      text: match[1], key: match[2].toLowerCase(),
      indicatorId: tag === undefined ? undefined : WORD_TAG_INDICATORS[tag]
    });
  }
  return spans.length > 0 ? spans : undefined;
}

/**
 * Each sentence's words, from the words line under it. A sentence whose words line is
 * missing or malformed is left out.
 * @param {string} content - The raw reply content.
 * @returns {Map<string, SentenceSpanType[]>}
 */
export function parseSentenceWords (content: string): Map<string, SentenceSpanType[]> {
  const words = new Map<string, SentenceSpanType[]>();
  let sentence: string | undefined;
  for (const line of content.split("\n")) {
    if (line.trim().startsWith(">")) {
      const spans = sentence === undefined ? undefined : parseWordsLine(line);
      if (sentence !== undefined && spans) {
        words.set(sentence, spans);
      }
      sentence = undefined;
      continue;
    }
    sentence = sentenceLine(line) ?? sentence;
  }
  return words;
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
  const language = languageSignal.value;
  const prompts = promptsFor(config, language);
  if (!config || !prompts) {
    throw new Error(t("sentenceNotConfigured"));
  }
  const model = pickModel(config.model);
  const values = {
    numSentences: String(config.numSentences),
    telegraphicMessage,
    attributes: attributesPromptText(),
    aboutMe: aboutMePromptText()
  };

  const response = await queryChat(
    renderPromptLines(prompts.userPrompt, values),
    model,
    false,
    renderTemplate(prompts.systemPrompt, values),
    abortSignal
  );
  const content = "message" in response ? (response.message?.content || "") : "";
  const sentences = parseSentences(content);
  if (sentences.length === 0) {
    throw new Error(t("sentenceNoSentences"));
  }
  return { sentences, model, language, words: parseSentenceWords(content) };
}
