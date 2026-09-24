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
 * Ask a model which facts about the user their messages show. The model only suggests: a
 * fact is added to About Me only after the user accepts it in the About Me dialog.
 */
import { adaptivePaletteGlobals } from "../../state/GlobalData";
import { renderTemplate, renderPromptLines } from "../../utils/PromptUtils";
import { queryChat } from "../../core/OllamaApi";
import { isMessageRecord, recordMessageText } from "../../core/MessageLog";
import { getStorage, StoredMessage } from "../../core/StorageBackend";
import { pickModel } from "../telegraphic-translation/TelegraphicTranslationUtils";
import {
  FACT_CATEGORIES, FactSuggestionType, isKnownText, aboutMePromptText, aboutMeSignal, recordLearning
} from "./AboutMeState";
import type { AboutMeConfigType } from "../../index.d";

export const NOT_CONFIGURED_MESSAGE = "About Me suggestions are not configured. Check the aboutMe section of config.json.";

/**
 * Split a model reply into suggested facts, one per `Category: text` line. List numbering
 * is stripped. A line whose category is not one of `FACT_CATEGORIES` is filed under
 * "Other" with the whole line as its text, so what the model called it is kept. Lines with
 * no colon or no text after it (preamble such as "Here is what I found:") are dropped.
 * @param {string} content - The raw reply content.
 * @returns {FactSuggestionType[]}
 */
export function parseFactSuggestions (content: string): FactSuggestionType[] {
  const suggestions: FactSuggestionType[] = [];
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim().replace(/^(?:\d+[.)]|[-*•])\s*/, "").trim();
    const colon = line.indexOf(":");
    const text = line.slice(colon + 1).trim();
    if (colon <= 0 || text.length === 0) {
      continue;
    }
    const named = line.slice(0, colon).trim().toLowerCase();
    const category = FACT_CATEGORIES.find((candidate) => candidate.toLowerCase() === named);
    suggestions.push(category ? { category, text } : { category: "Other", text: line });
  }
  return suggestions;
}

/*
 * What a "Suggest updates" run did. `found` is how many new suggestions it added to the
 * pending list; `hasMore` is whether the batch was full, so more messages are probably waiting.
 */
export type LearningResultType =
  | { status: "upToDate" }
  | { status: "learnt", found: number, hasMore: boolean };

/**
 * The messages, one per line. A message the user turned into a sentence is sent as that
 * sentence, which shows more and is how the user actually phrased it. Other messages are
 * sent as their symbol labels. Malformed records are left out.
 * @param {StoredMessage[]} records - The messages, oldest first.
 * @returns {string}
 */
function messageLines (records: StoredMessage[]): string {
  return records
    .filter(isMessageRecord)
    .map((record) => record.translation?.sentence || recordMessageText(record))
    .filter((line) => line.trim().length > 0)
    .join("\n");
}

// The run in progress, if any. Held here rather than in the dialog, which is unmounted when it
// closes: reopening it must not start a second run over the same messages.
let running: Promise<LearningResultType> | undefined;

/**
 * Ask the model which facts the messages not read yet show, a batch of `messagesPerRun` at a
 * time, oldest first. New suggestions are added to the About Me pending list and the
 * watermark moves to the last message read, in one save. When the model fails, nothing is
 * saved, so the same messages are read next time.
 *
 * Suggestions already in About Me, already dismissed, already pending, or repeated in the
 * reply are dropped, because a small model does not always follow the prompt.
 *
 * A call made while a run is in progress gets that run's result rather than starting another.
 * @returns {Promise<LearningResultType>}
 */
export function requestFactSuggestions (): Promise<LearningResultType> {
  running ??= learn().finally(() => {
    running = undefined;
  });
  return running;
}

/**
 * One run of `requestFactSuggestions()`.
 * @returns {Promise<LearningResultType>}
 */
async function learn (): Promise<LearningResultType> {
  const config = adaptivePaletteGlobals.config.aboutMe;
  if (!config) {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  }
  const aboutMe = aboutMeSignal.peek();
  const records = await getStorage().readMessagesAfter(aboutMe.learntUpTo?.id, config.messagesPerRun);
  if (records.length === 0) {
    return { status: "upToDate" };
  }
  const messages = messageLines(records);
  const suggestions = messages.length === 0 ? [] : await askModel(config, messages);
  // Past every record read, malformed ones too, so none of them is read again.
  const last = records[records.length - 1];
  await recordLearning(suggestions, { id: last.id, timestamp: last.timestamp });
  return { status: "learnt", found: suggestions.length, hasMore: records.length === config.messagesPerRun };
}

/**
 * Ask the model for facts in these messages that About Me does not hold yet.
 * @param {AboutMeConfigType} config - The `aboutMe` config section.
 * @param {string} messages - The messages, one per line.
 * @returns {Promise<FactSuggestionType[]>}
 */
async function askModel (config: AboutMeConfigType, messages: string): Promise<FactSuggestionType[]> {
  const model = pickModel(config.model);
  const values = {
    messages,
    facts: aboutMePromptText(),
    dismissed: aboutMeSignal.peek().dismissed.map((entry) => entry.text).join("; ")
  };
  const response = await queryChat(
    // Line-per-field: with no facts or no dismissals, that line is dropped.
    renderPromptLines(config.userPrompt, values),
    model,
    false,
    renderTemplate(config.systemPrompt, values)
  );
  const content = "message" in response ? (response.message?.content || "") : "";
  const seen = new Set<string>();
  return parseFactSuggestions(content).filter(({ text }) => {
    const key = text.toLowerCase();
    if (isKnownText(text) || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
