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
 * What the app knows about the user: short facts the user typed in or accepted from a
 * model's suggestions. They are passed to the sentence and word prompts through
 * `aboutMePromptText()`.
 *
 * Unlike the message attributes, About Me lasts: it is saved through the storage layer
 * and read back at start-up by `hydrateAboutMe()`.
 */
import { signal } from "@preact/signals";
import { getStorage } from "../../core/StorageBackend";
import type {
  DismissedFactType, FactCategoryType, LearntUpToType, AboutMeFactType, AboutMeType
} from "../../index.d";

// The order categories are shown in, in the dialog and in the prompt.
export const FACT_CATEGORIES: readonly FactCategoryType[] = [
  "Family", "Background", "Preferences", "Communication style", "Other"
];

// A fact the model suggested that the user has not accepted or rejected yet. The same shape
// as a dismissed one, because rejecting a suggestion is what makes one.
export type FactSuggestionType = DismissedFactType;

const emptyAboutMe = (): AboutMeType => ({ facts: [], dismissed: [], pending: [] });

/**
 * The About Me data. Read freely; write through the functions below, which also save it.
 */
export const aboutMeSignal = signal<AboutMeType>(emptyAboutMe());

/**
 * Whether a stored entry is a fact. The store can be edited by hand in the browser's
 * developer tools, so this check runs on everything read back from it.
 * @param {unknown} entry - The stored entry.
 * @returns {boolean}
 */
function isFact (entry: unknown): entry is AboutMeFactType {
  const fact = entry as AboutMeFactType;
  return fact !== null && typeof fact === "object" && typeof fact.id === "string" &&
    FACT_CATEGORIES.includes(fact.category) && typeof fact.text === "string" &&
    (fact.source === "manual" || fact.source === "suggested");
}

/**
 * Whether a stored entry is a dismissed suggestion. Checked for the same reason as `isFact()`.
 * @param {unknown} entry - The stored entry.
 * @returns {boolean}
 */
function isDismissed (entry: unknown): entry is DismissedFactType {
  const dismissed = entry as DismissedFactType;
  return dismissed !== null && typeof dismissed === "object" &&
    FACT_CATEGORIES.includes(dismissed.category) && typeof dismissed.text === "string";
}

/**
 * Whether a stored watermark can be read after. Only the id is checked: the timestamp is
 * shown, never used, and the dialog shows nothing for an unusable one.
 * @param {unknown} entry - The stored watermark.
 * @returns {boolean}
 */
function isWatermark (entry: unknown): entry is LearntUpToType {
  const id = (entry as LearntUpToType | null)?.id;
  return entry !== null && typeof entry === "object" && Number.isInteger(id) && (id as number) >= 0;
}

/**
 * Read the saved About Me facts into `aboutMeSignal`. Called once from
 * `initAdaptivePaletteGlobals()`, and by tests. If the store cannot be read, About Me
 * starts empty.
 * @returns {Promise<void>}
 */
export async function hydrateAboutMe (): Promise<void> {
  try {
    const stored = await getStorage().readAboutMe();
    aboutMeSignal.value = {
      facts: stored.facts.filter(isFact),
      dismissed: stored.dismissed.filter(isDismissed),
      pending: stored.pending.filter(isDismissed),
      ...(isWatermark(stored.learntUpTo) ? { learntUpTo: stored.learntUpTo } : {})
    };
  } catch (error) {
    aboutMeSignal.value = emptyAboutMe();
    console.error(`Could not read the saved About Me facts: ${String(error)}`);
  }
}

/**
 * Publish changed About Me facts and save it. If the save fails, it is logged and the change
 * still applies for this session.
 * @param {AboutMeType} aboutMe - All the new About Me data.
 * @returns {Promise<void>}
 */
async function update (aboutMe: AboutMeType): Promise<void> {
  aboutMeSignal.value = aboutMe;
  try {
    await getStorage().writeAboutMe(aboutMe);
  } catch (error) {
    console.error(`Could not save About Me: ${String(error)}`);
  }
}

/**
 * A new fact.
 * @param {FactCategoryType} category - What it is about.
 * @param {string} text - The fact.
 * @param {AboutMeFactType["source"]} source - Whether it was typed or accepted.
 * @returns {AboutMeFactType}
 */
function newFact (category: FactCategoryType, text: string, source: AboutMeFactType["source"]): AboutMeFactType {
  return { id: crypto.randomUUID(), category, text: text.trim(), source, addedAt: new Date().toISOString() };
}

/**
 * Add a fact the user typed in.
 * @param {FactCategoryType} category - What it is about.
 * @param {string} text - The fact.
 * @returns {Promise<void>}
 */
export function addFact (category: FactCategoryType, text: string): Promise<void> {
  const aboutMe = aboutMeSignal.peek();
  return update({ ...aboutMe, facts: [...aboutMe.facts, newFact(category, text, "manual")] });
}

/**
 * Change a fact's category and text.
 * @param {string} id - The fact to change.
 * @param {FactCategoryType} category - Its new category.
 * @param {string} text - Its new text.
 * @returns {Promise<void>}
 */
export function editFact (id: string, category: FactCategoryType, text: string): Promise<void> {
  const aboutMe = aboutMeSignal.peek();
  return update({
    ...aboutMe,
    facts: aboutMe.facts.map((fact) => fact.id === id ? { ...fact, category, text: text.trim() } : fact)
  });
}

/**
 * Delete a fact. A deleted suggested fact is also dismissed, so the model does not suggest
 * it again.
 * @param {string} id - The fact to delete.
 * @returns {Promise<void>}
 */
export function removeFact (id: string): Promise<void> {
  const aboutMe = aboutMeSignal.peek();
  const { facts, dismissed } = aboutMe;
  const removed = facts.find((fact) => fact.id === id);
  return update({
    ...aboutMe,
    facts: facts.filter((fact) => fact.id !== id),
    dismissed: removed?.source === "suggested"
      ? [...dismissed, { category: removed.category, text: removed.text }]
      : dismissed
  });
}

/**
 * Keep a suggested fact.
 * @param {FactSuggestionType} suggestion - The suggestion the user accepted, as it is held in
 * the About Me pending list.
 * @returns {Promise<void>}
 */
export function acceptSuggestion (suggestion: FactSuggestionType): Promise<void> {
  const aboutMe = aboutMeSignal.peek();
  return update({
    ...aboutMe,
    facts: [...aboutMe.facts, newFact(suggestion.category, suggestion.text, "suggested")],
    pending: aboutMe.pending.filter((item) => item !== suggestion)
  });
}

/**
 * Refuse a suggested fact, so it is not suggested again.
 * @param {FactSuggestionType} suggestion - The suggestion the user rejected, as it is held in
 * the About Me pending list.
 * @returns {Promise<void>}
 */
export function rejectSuggestion (suggestion: FactSuggestionType): Promise<void> {
  const aboutMe = aboutMeSignal.peek();
  return update({
    ...aboutMe,
    dismissed: [...aboutMe.dismissed, { category: suggestion.category, text: suggestion.text.trim() }],
    pending: aboutMe.pending.filter((item) => item !== suggestion)
  });
}

/**
 * Keep what a "Suggest updates" run found, and move past the messages it read, in one save.
 * @param {FactSuggestionType[]} suggestions - New suggestions, for the user to accept or reject.
 * @param {LearntUpToType} learntUpTo - The last message the run read.
 * @returns {Promise<void>}
 */
export function recordLearning (suggestions: FactSuggestionType[], learntUpTo: LearntUpToType): Promise<void> {
  const aboutMe = aboutMeSignal.peek();
  return update({ ...aboutMe, pending: [...aboutMe.pending, ...suggestions], learntUpTo });
}

/**
 * Put a dismissed suggestion back among the facts. It is dropped from the dismissed list, so
 * the model may suggest it again if the user deletes it once more.
 * @param {DismissedFactType} entry - The dismissed suggestion, as it is held in About Me.
 * @returns {Promise<void>}
 */
export function restoreDismissed (entry: DismissedFactType): Promise<void> {
  const aboutMe = aboutMeSignal.peek();
  const { facts, dismissed } = aboutMe;
  return update({
    ...aboutMe,
    facts: [...facts, newFact(entry.category, entry.text, "suggested")],
    dismissed: dismissed.filter((item) => item !== entry)
  });
}

/**
 * Whether About Me already holds this text, as a fact, a dismissed suggestion or a pending
 * one. Case and surrounding spaces are ignored.
 * @param {string} text - The text to look for.
 * @returns {boolean}
 */
export function isKnownText (text: string): boolean {
  const wanted = text.trim().toLowerCase();
  const { facts, dismissed, pending } = aboutMeSignal.peek();
  return [...facts.map((fact) => fact.text), ...[...dismissed, ...pending].map((entry) => entry.text)]
    .some((known) => known.trim().toLowerCase() === wanted);
}

/**
 * The facts as one line for a prompt: `Category: text` per fact, in category order,
 * separated by semicolons. For example `Family: sister Ana; Preferences: likes tea`. Empty
 * when there are no facts, so `renderPromptLines()` drops the line.
 *
 * Reads the signal rather than peeking at it, so an effect that calls this subscribes to it.
 * @returns {string}
 */
export function aboutMePromptText (): string {
  const { facts } = aboutMeSignal.value;
  return FACT_CATEGORIES
    .flatMap((category) => facts
      .filter((fact) => fact.category === category)
      .map((fact) => `${category}: ${fact.text}`))
    .join("; ");
}
