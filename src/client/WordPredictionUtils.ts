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

import { adaptivePaletteGlobals } from "./GlobalData";
import { readMessageLog } from "./MessageLog";
import { findSymbolByGloss } from "./BciAvUtils";
import { normalizeComposition, renderTemplate } from "./GlobalUtils";
import { pickModel } from "./TelegraphicTranslationUtils";
import { queryChat } from "./OllamaApi";
import { ResolutionRungType, SymbolCompositionType, SymbolEncodingType } from ".";

/*
 * Common sentence starters, offered for the first word until the user has saved a message of
 * their own. A composition is either a Bliss dictionary id or one built from parts, the same
 * as in a palette JSON file.
 */
export const SEED_STARTERS: { label: string, composition: SymbolCompositionType }[] = [
  { label: "yes", composition: 2776 },
  { label: "don't know", composition: [412, ";", 81, "/", 449, "/", 401] },
  { label: "help", composition: 1802 },
  { label: "want", composition: 2705 },
  { label: "I", composition: 1840 },
  { label: "you", composition: 2785 },
  { label: "stop", composition: 2491 },
  { label: "go", composition: 1177 },
  { label: "more", composition: 2029 },
  { label: "no", composition: 2088 }
];

// How much of the message before the caret is matched against history, widest context first.
const CONTEXT_LENGTHS = [2, 1];

// How much a word's overall use in the user's history counts against the model's own ranking
// of it. The two weights sum to 1.
export const W_HISTORY = 0.4;
export const W_MODEL = 1 - W_HISTORY;

// How fast a model word's score falls with its position in the reply: 1st = 1.0, 2nd = 0.9,
// and so on to a floor of 0. A plain chat reply carries no probabilities, so rank stands in
// for them.
const MODEL_RANK_DECAY = 0.1;

export const NOT_CONFIGURED_MESSAGE = "Model-backed word prediction is not configured. Check the wordPrediction section of config.json.";

/*
 * How often a label was used, and the position of its most recent use. Recency breaks ties
 * between labels used the same number of times.
 */
type LabelTally = { count: number, lastUsedAt: number };

/**
 * Whether a symbol has a label. A symbol may be saved without one, and a word with no label
 * cannot be shown, announced or spoken, so it is no use either as a suggestion or as context.
 * @param {string} label - The label to check.
 * @returns {boolean}
 */
function hasLabel (label: string): boolean {
  return label.trim().length > 0;
}

/**
 * Build the payload for a seeded word the same way a palette cell does. A composition that is
 * a single number is a dictionary id, so the entry's own composition is used when it has one.
 * A composition built from parts is used as it stands and belongs to no dictionary entry.
 * @param {SymbolCompositionType} composition - The composition, as listed in `SEED_STARTERS`.
 * @param {string} label - The label to show.
 * @returns {SymbolEncodingType}
 */
function seedPayload (composition: SymbolCompositionType, label: string): SymbolEncodingType {
  const symbolId = normalizeComposition(composition);
  const symbol = typeof symbolId === "number"
    ? adaptivePaletteGlobals.symbols.find((entry) => entry.id === symbolId)
    : undefined;
  return {
    label,
    composition: symbol?.composition ?? composition,
    userSelectedSymbolId: typeof symbolId === "number" ? symbolId : undefined,
    modifierInfo: []
  };
}

/**
 * Tally the labels that came next in past messages.
 *
 * With an empty `context` the tally is of the first label of each message. Otherwise it is of
 * every label that directly followed that run of labels, wherever it occurred in a message.
 * @param {string[][]} messages - The labels of each past message, oldest first.
 * @param {string[]} context - The labels that must precede the counted label.
 * @returns {Map<string, LabelTally>}
 */
function tallyFollowers (messages: string[][], context: string[]): Map<string, LabelTally> {
  const tallies = new Map<string, LabelTally>();
  const record = (label: string, messageIndex: number): void => {
    const tally = tallies.get(label);
    tallies.set(label, { count: (tally?.count ?? 0) + 1, lastUsedAt: messageIndex });
  };

  messages.forEach((labels, messageIndex) => {
    if (context.length === 0) {
      if (labels.length > 0) {
        record(labels[0], messageIndex);
      }
      return;
    }
    for (let index = context.length; index < labels.length; index++) {
      const precedingLabels = labels.slice(index - context.length, index);
      if (precedingLabels.every((label, offset) => label === context[offset])) {
        record(labels[index], messageIndex);
      }
    }
  });
  return tallies;
}

/**
 * Tally every label used in past messages, regardless of what came before it.
 * @param {string[][]} messages - The labels of each past message, oldest first.
 * @returns {Map<string, LabelTally>}
 */
function tallyAll (messages: string[][]): Map<string, LabelTally> {
  const tallies = new Map<string, LabelTally>();
  messages.forEach((labels, messageIndex) => {
    labels.forEach((label) => {
      const tally = tallies.get(label);
      tallies.set(label, { count: (tally?.count ?? 0) + 1, lastUsedAt: messageIndex });
    });
  });
  return tallies;
}

/**
 * Order a tally, most used first and most recently used among equals.
 * A tally contains { count, lastUsedAt }. Sort using two-step criteria:
 * 1. Highest count first. Words that followed the context most often win.
 * 2. If two words have the exact same count, it looks at lastUsedAt. The word that was
 * used in the most recent message wins.
 * @param {Map<string, LabelTally>} tallies - The tallied labels.
 * @returns {string[]}
 */
function rankLabels (tallies: Map<string, LabelTally>): string[] {
  return [...tallies.entries()]
    .sort(([, first], [, second]) => second.count - first.count || second.lastUsedAt - first.lastUsedAt)
    .map(([label]) => label);
}

/**
 * The past messages worth predicting from: those with at least one labelled symbol, oldest
 * first. A record can hold a translation without the message it came from, which has no words
 * to predict from.
 * @returns {SymbolEncodingType[][]}
 */
function loggedMessages (): SymbolEncodingType[][] {
  return readMessageLog()
    .map((record) => record.payloads.filter((payload) => hasLabel(payload.label)))
    .filter((payloads) => payloads.length > 0);
}

/**
 * Whether query model for word suggestions. Return true when both of these are true:
 * 1. `enableModelQuery` is enabled.
 * 2. There is at least one model available.
 * @returns {boolean}
 */
export function isModelTierActive (): boolean {
  return adaptivePaletteGlobals.config.wordPrediction.enableModelQuery &&
    adaptivePaletteGlobals.models.length > 0;
}

/**
 * Predict the words most likely to come next in the message being composed.
 *
 * The ranking widens until it has enough suggestions: labels that followed the last two
 * labels of the message, then those that followed the last one, then the labels used most
 * often overall. An empty message is answered with the words the user usually opens with, or
 * with the seeded starters while no message has been saved yet.
 *
 * Each suggestion is returned in the form it was last used, so a symbol saved with an
 * indicator or a modifier is predicted with them applied.
 * @param {string[]} currentLabels - The labels in the message so far, up to the caret.
 * @param {number} maxSuggestions - The most suggestions to return.
 * @returns {SymbolEncodingType[]} - The suggestions, most likely first. May be empty.
 */
export function predictNext (currentLabels: string[], maxSuggestions: number): SymbolEncodingType[] {
  if (maxSuggestions <= 0) {
    return [];
  }
  const messages = loggedMessages();
  const contextLabels = currentLabels.filter(hasLabel);

  if (messages.length === 0) {
    return contextLabels.length === 0
      ? SEED_STARTERS.slice(0, maxSuggestions).map(({ label, composition }) => seedPayload(composition, label))
      : [];
  }

  // The most recent payload for a label carries the indicators and modifiers it was last
  // used with, which is the form to predict it in.
  const payloadByLabel = new Map<string, SymbolEncodingType>();
  messages.forEach((payloads) => payloads.forEach((payload) => payloadByLabel.set(payload.label, payload)));
  const labelsPerMessage = messages.map((payloads) => payloads.map((payload) => payload.label));

  // With a model suggestions count, the tier 3 (the words used most often) stops filling slots.
  const frequencyTier = isModelTierActive() ? [] : [tallyAll(labelsPerMessage)];
  const tiers = contextLabels.length === 0
    ? [tallyFollowers(labelsPerMessage, [])]
    : [
      ...CONTEXT_LENGTHS
        .filter((length) => length <= contextLabels.length)
        .map((length) => tallyFollowers(labelsPerMessage, contextLabels.slice(-length))),
      ...frequencyTier
    ];

  // Don't suggest the word that is already there.
  const alreadySuggested = new Set<string>(contextLabels.slice(-1));
  const suggestions: SymbolEncodingType[] = [];
  for (const tier of tiers) {
    for (const label of rankLabels(tier)) {
      if (suggestions.length === maxSuggestions) {
        return suggestions;
      }
      const payload = payloadByLabel.get(label);
      if (payload && !alreadySuggested.has(label)) {
        alreadySuggested.add(label);
        suggestions.push(payload);
      }
    }
  }
  return suggestions;
}

/**
 * How often words suggested by the model found a matched symbol and how often they are dropped over
 * a session. A high drop rate is the evidence for adding a cleverer way of matching a word to a symbol.
 */
export const wordPredictionStats = {
  returned: 0,
  resolved: 0,
  byRung: { history: 0, exactGloss: 0, wordInGloss: 0, dropped: 0 } as Record<ResolutionRungType, number>,
  reset (): void {
    wordPredictionStats.returned = 0;
    wordPredictionStats.resolved = 0;
    wordPredictionStats.byRung = { history: 0, exactGloss: 0, wordInGloss: 0, dropped: 0 };
  }
};

/**
 * Read the words out of a model reply: one per line, list markers and surrounding punctuation
 * stripped, lowercased, and duplicates dropped. A line ending in a colon is preamble ("Here
 * are the words:"), and a line of more than two words is not a word.
 * @param {string} content - The raw reply content.
 * @returns {string[]}
 */
export function parseModelWords (content: string): string[] {
  const words: string[] = [];
  const seen = new Set<string>();
  content.split("\n").forEach((line) => {
    const withoutMarker = line.trim().replace(/^(?:\d+[.)]|[-*•])\s*/, "").trim();
    if (withoutMarker.endsWith(":")) {
      return;
    }
    const word = withoutMarker.replace(/^["'`]+|["'`.,!?;]+$/g, "").trim().toLowerCase();
    if (word.length === 0 || word.split(/\s+/).length > 2 || seen.has(word)) {
      return;
    }
    seen.add(word);
    words.push(word);
  });
  return words;
}

/**
 * Build a payload for a symbol found in the Bliss vocabulary, labelled with the word that was
 * looked up rather than the whole gloss: "drink" is what the user asked for, where the gloss
 * may read "drink,beverage".
 * @param {number} symbolId - The id of the matching entry.
 * @param {SymbolCompositionType | undefined} composition - The entry's composition, if it has one.
 * @param {string} word - The word to label the symbol with.
 * @returns {SymbolEncodingType}
 */
function glossPayload (symbolId: number, composition: SymbolCompositionType | undefined, word: string): SymbolEncodingType {
  return {
    label: word,
    composition: composition ?? symbolId,
    userSelectedSymbolId: symbolId,
    modifierInfo: []
  };
}

/**
 * Find a symbol to show a model-suggested word with, and report which step found it.
 *
 * The steps, first hit winning:
 * 1. the user's own history, whose payload carries the indicators, modifiers and symbol they
 *    chose for that word themselves;
 * 2. a Bliss entry whose whole gloss is the word;
 * 3. a Bliss entry with the word inside a longer gloss, the shortest gloss first. A common
 *    word such as "to" appears in hundreds of glosses, so the shortest one keeps this from
 *    picking an arbitrary symbol, and the lowest id settles a tie.
 *
 * A word none of them matches is dropped: a suggestion with no symbol cannot be shown.
 * @param {string} word - The word, lowercased.
 * @param {Map<string, SymbolEncodingType>} payloadByLabel - Past payloads by lowercased label.
 * @returns {{ payload?: SymbolEncodingType, rung: ResolutionRungType }}
 */
export function resolveWordPayload (word: string, payloadByLabel: Map<string, SymbolEncodingType>): { payload?: SymbolEncodingType, rung: ResolutionRungType } {
  const fromHistory = payloadByLabel.get(word);
  if (fromHistory) {
    return { payload: { ...fromHistory }, rung: "history" };
  }
  const exactEntry = adaptivePaletteGlobals.symbols.find((entry) => entry.gloss.toLowerCase() === word);
  if (exactEntry) {
    return { payload: glossPayload(exactEntry.id, exactEntry.composition, word), rung: "exactGloss" };
  }
  const matches = findSymbolByGloss(word);
  if (matches.length > 0) {
    const best = matches.reduce((shortest, match) =>
      match.label.length < shortest.label.length ||
      (match.label.length === shortest.label.length && match.id < shortest.id)
        ? match
        : shortest
    );
    return { payload: glossPayload(best.id, best.composition, word), rung: "wordInGloss" };
  }
  return { rung: "dropped" };
}

/**
 * Report how the words from one reply were resolved, and how they add up over the session.
 * @param {string[]} candidates - The words the ladder was run over.
 * @param {Record<ResolutionRungType, number>} rungs - How many words each step accounted for.
 * @param {string[]} dropped - The words no step matched.
 * @returns {void}
 */
function reportResolution (candidates: string[], rungs: Record<ResolutionRungType, number>, dropped: string[]): void {
  const resolved = candidates.length - dropped.length;
  wordPredictionStats.returned += candidates.length;
  wordPredictionStats.resolved += resolved;
  (Object.keys(rungs) as ResolutionRungType[]).forEach((rung) => {
    wordPredictionStats.byRung[rung] += rungs[rung];
  });
  const { returned: sessionReturned, resolved: sessionResolved } = wordPredictionStats;
  const sessionRate = sessionReturned === 0 ? 0 : Math.round((sessionResolved / sessionReturned) * 100);
  console.info(
    `word prediction: ${candidates.length} returned, ${resolved} resolved\n` +
    `  history ${rungs.history} | exact gloss ${rungs.exactGloss} | word in gloss ${rungs.wordInGloss}\n` +
    `  dropped: ${dropped.length === 0 ? "none" : dropped.join(", ")}\n` +
    `  session: ${sessionReturned} returned, ${sessionResolved} resolved (${sessionRate}%)`
  );
}

/**
 * Order the model's words and turn them into symbols to append to the suggestion row.
 *
 * A word already on screen is dropped rather than scored. What is left is scored by how far up
 * the model's reply it came and by how much the user uses that word in history, so a word the
 * user uses often outranks one the model merely liked better. Words with no symbol drop out.
 * @param {string[]} words - The words from the reply, most likely first.
 * @param {string[]} excludedLabels - The labels not to suggest: those already in the suggestion
 *                                   row, and the last word at the caret.
 * @param {number} limit - The most payloads to return.
 * @returns {SymbolEncodingType[]} - The payloads, best first. May be empty.
 */
export function rankModelWords (words: string[], excludedLabels: string[], limit: number): SymbolEncodingType[] {
  const messages = loggedMessages();
  const payloadByLabel = new Map<string, SymbolEncodingType>();
  const counts = new Map<string, number>();
  messages.forEach((payloads) => payloads.forEach((payload) => {
    const label = payload.label.toLowerCase();
    payloadByLabel.set(label, payload);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }));

  const excluded = new Set(excludedLabels.map((label) => label.toLowerCase()));
  const candidates = words.filter((word) => !excluded.has(word));
  // Normalizing over the candidates alone is what makes `P_history` comparable with the
  // model's rank score.
  const historyTotal = candidates.reduce((total, word) => total + (counts.get(word) ?? 0), 0);

  const scored = candidates.map((word, index) => ({
    word,
    index,
    score: W_HISTORY * (historyTotal === 0 ? 0 : (counts.get(word) ?? 0) / historyTotal) +
      W_MODEL * Math.max(0, 1 - MODEL_RANK_DECAY * index)
  }));
  // Words far enough down the reply all score 0 from the model, so the reply's own order
  // settles the ties between them.
  scored.sort((first, second) => second.score - first.score || first.index - second.index);

  const rungs: Record<ResolutionRungType, number> = { history: 0, exactGloss: 0, wordInGloss: 0, dropped: 0 };
  const dropped: string[] = [];
  const payloads: SymbolEncodingType[] = [];
  // Resolving a word scans the whole Bliss vocabulary, so the words past the last slot are
  // thrown away.
  const attempted: string[] = [];
  for (const { word } of scored) {
    if (payloads.length === limit) {
      break;
    }
    attempted.push(word);
    const { payload, rung } = resolveWordPayload(word, payloadByLabel);
    rungs[rung] += 1;
    if (payload) {
      payloads.push(payload);
    } else {
      dropped.push(word);
    }
  }
  reportResolution(attempted, rungs, dropped);
  return payloads;
}

/**
 * Ask the model which words are most likely to come next.
 * @param {string} message - The message so far, as shown in the input area.
 * @param {number} numWords - How many words to ask for.
 * @param {AbortSignal} abortSignal - Optional signal to cancel the request when the user
 *                                changes the message the words were asked for.
 * @returns {Promise<string[]>} - The parsed words, most likely first. May be empty.
 */
export async function requestModelWords (message: string, numWords: number, abortSignal?: AbortSignal): Promise<string[]> {
  const config = adaptivePaletteGlobals.config.wordPrediction;
  if (!config.enableModelQuery) {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  }
  const model = pickModel(config.model);
  const values = { message, numWords: String(numWords) };
  const response = await queryChat(
    renderTemplate(config.userPrompt, values),
    model,
    false,
    renderTemplate(config.systemPrompt, values),
    abortSignal
  );
  const content = "message" in response ? (response.message?.content || "") : "";
  return parseModelWords(content);
}
