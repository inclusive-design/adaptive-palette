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
import { normalizeComposition } from "./GlobalUtils";
import { SymbolCompositionType, SymbolEncodingType } from ".";

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
  // A record can hold a translation without the message it came from, which has no words to
  // predict from.
  const messages = readMessageLog()
    .map((record) => record.payloads.filter((payload) => hasLabel(payload.label)))
    .filter((payloads) => payloads.length > 0);
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

  const tiers = contextLabels.length === 0
    ? [tallyFollowers(labelsPerMessage, [])]
    : [
      ...CONTEXT_LENGTHS
        .filter((length) => length <= contextLabels.length)
        .map((length) => tallyFollowers(labelsPerMessage, contextLabels.slice(-length))),
      tallyAll(labelsPerMessage)
    ];

  // Suggesting the word that is already there wastes a slot the user cannot use.
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
