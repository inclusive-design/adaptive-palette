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
 * A symbol's label, worked out from its parts: the base word, its modifiers in order and its
 * indicator. See docs/LabelLookup.md.
 * 1. `labelFor()` gives the label known now, and marks it pending when a model is to be asked.
 * 2. The watcher, started by `startLabelWatcher()`, asks the model about each pending label and
 *    puts the answers in the message.
 */

import { effect, untracked } from "@preact/signals";
import { adaptivePaletteGlobals, changeEncodingContents, wordBuildSignal } from "../state/GlobalData";
import { editMessage } from "../core/MessageEdit";
import { renderPromptLines, promptsFor } from "./PromptUtils";
import { glossFor } from "./SvgUtils";
import { applyModifiersToLabel } from "./SymbolEncodingUtils";
import { isLocalHost, queryChat } from "../core/OllamaApi";
import { LANGUAGES, Language, languageSignal } from "../i18n/I18n";
import type { SymbolEncodingType } from "../index.d";

export type IndicatorInfoEntry = {
  id: number,
  group: string,
  name: string,
  purpose: string
};

// The pregenerated table for each language. A language whose table is missing falls back
// to the model.
const LABELS_URLS: Record<Language, string> = {
  en: "/data/new_labels_with_indicator.json",
  sv: "/data/new_labels_with_indicator_sv.json"
};
const INDICATORS_URL = "/data/indicators.json";

let indicatorsById = new Map<number, IndicatorInfoEntry>();

/**
 * Load the pregenerated id-keyed label lookup of each language (stored on
 * `adaptivePaletteGlobals.indicatorLabels`, keyed by language) and the indicator metadata table (kept
 * module-private, used only to build Ollama prompts). Called once from
 * `initAdaptivePaletteGlobals()`. Each fetch failure is reported with `console.error`
 * and leaves its data empty, so lookups return undefined rather than throwing.
 * @returns {Promise<void>}
 */
export async function initIndicatorLabels (): Promise<void> {
  adaptivePaletteGlobals.indicatorLabels = {};
  // ponytail: loads every language's table at start-up (3 MB each); load on language change if
  // start-up time matters.
  await Promise.all(LANGUAGES.map(async (language) => {
    try {
      const response = await fetch(LABELS_URLS[language]);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      adaptivePaletteGlobals.indicatorLabels[language] = await response.json() as Record<string, string>;
    } catch (error) {
      console.error(`Error loading ${LABELS_URLS[language]}: ${String(error)}`);
    }
  }));

  try {
    const response = await fetch(INDICATORS_URL);
    const indicators = await response.json() as IndicatorInfoEntry[];
    indicatorsById = new Map(indicators.map(indicator => [indicator.id, indicator]));
  } catch (error) {
    console.error(`Error loading ${INDICATORS_URL}: ${String(error)}`);
    indicatorsById = new Map();
  }
}

/**
 * Strip the "INDICATOR " prefix and lowercase, e.g. "INDICATOR PLURAL" -> "plural".
 * @param {string} name
 * @returns {string}
 */
function toIndicatorName (name: string): string {
  return name.replace(/^INDICATOR\s+/i, "").toLowerCase();
}

/**
 * A symbol's label as `labelFor()` works it out.
 */
export type SymbolLabelType = {
  label: string,
  isAiLabel: boolean,
  // Set when the label waits for a model's answer: the key of that query.
  pendingLabel?: string
};

/**
 * A model query for one symbol state.
 */
type LabelQueryType = { userPrompt: string, systemPrompt: string, model: string };

// The model's answer for each symbol state asked about this session: a label, or `undefined`
// for no answer. Checked with `.has()`, since no answer is stored as `undefined`.
const answers = new Map<string, string | undefined>();

// The query for each symbol state `labelFor()` marked pending. Kept for the session, so a query
// stopped while no symbol waited for it can start again.
const queries = new Map<string, LabelQueryType>();

/**
 * The key for a symbol's state: the language, the symbol id (or the base label when it has
 * none), each modifier with its side, and the indicator. Two symbols in the same state share it.
 * @param {SymbolEncodingType} payload - The symbol.
 * @param {Language} language - The language of the label.
 * @returns {string}
 */
function labelKey (payload: SymbolEncodingType, language: Language): string {
  return JSON.stringify([
    language,
    payload.userSelectedSymbolId ?? payload.baseLabel ?? payload.label,
    (payload.modifierInfo ?? []).map((modifier) => [modifier.modifierId, modifier.isPrepended]),
    payload.indicatorId ?? null
  ]);
}

/**
 * The model query for a symbol's state, or `undefined` when the model cannot be asked: on the
 * public site, with no models, with the setting off, with no prompt for the language, or when
 * the symbol, its indicator or its word is missing from the loaded data.
 * @param {SymbolEncodingType} payload - The symbol.
 * @param {Language} language - The language to ask in.
 * @returns {LabelQueryType | undefined}
 */
function buildQuery (payload: SymbolEncodingType, language: Language): LabelQueryType | undefined {
  const { config, models, symbols } = adaptivePaletteGlobals;
  const lookup = config.labelLookup;
  const prompts = promptsFor(lookup, language);
  if (!isLocalHost() || models.length === 0 || !lookup.useModelQueryFallback || !prompts) {
    return undefined;
  }
  let indicator = { indicator: "", purpose: "" };
  if (payload.indicatorId !== undefined) {
    const entry = indicatorsById.get(payload.indicatorId);
    if (!entry) {
      return undefined;
    }
    indicator = { indicator: toIndicatorName(entry.name), purpose: entry.purpose };
  }
  let word = { word: payload.baseLabel ?? payload.label, pos: "", explanation: "" };
  if (payload.userSelectedSymbolId !== undefined) {
    const symbol = symbols.find((entry) => entry.id === payload.userSelectedSymbolId);
    if (!symbol) {
      return undefined;
    }
    word = { word: glossFor(symbol, language), pos: symbol.pos ?? "", explanation: symbol.explanation ?? "" };
  }
  // No word means no question to ask.
  if (word.word.trim().length === 0) {
    return undefined;
  }
  // For example "opposite of (before), much (after)". An empty list drops the line.
  const modifiers = (payload.modifierInfo ?? [])
    .map((modifier) => `${modifier.modifierGloss} (${modifier.isPrepended ? "before" : "after"})`)
    .join(", ");
  return {
    userPrompt: renderPromptLines(prompts.userPrompt, { ...word, modifiers, ...indicator }),
    systemPrompt: prompts.systemPrompt,
    model: lookup.model || models[0]
  };
}

/**
 * A symbol's label, worked out from its parts. Checked in this order:
 * 1. no modifiers and no indicator: the base label;
 * 2. an indicator alone, in the pregenerated table: the table's label;
 * 3. an answer the model gave this session: that answer, marked as AI;
 * 4. the model cannot be asked, or gave no answer: the fallback;
 * 5. otherwise: the fallback, pending until the model answers.
 *
 * The fallback joins the modifiers' text to the inner label: the table's label or the model's
 * answer for the indicator alone, else the base label.
 * @param {SymbolEncodingType} payload - The symbol, with its parts already changed.
 * @param {Language} language - The language of the label; the UI language by default.
 * @returns {SymbolLabelType}
 */
export function labelFor (payload: SymbolEncodingType, language: Language = languageSignal.value): SymbolLabelType {
  const base = payload.baseLabel ?? payload.label;
  const modifiers = payload.modifierInfo ?? [];
  const { indicatorId, userSelectedSymbolId } = payload;
  if (modifiers.length === 0 && indicatorId === undefined) {
    return { label: base, isAiLabel: false };
  }
  const table = indicatorId === undefined ? undefined : getStaticNewLabel(userSelectedSymbolId, indicatorId, language);
  if (modifiers.length === 0 && table !== undefined) {
    return { label: table, isAiLabel: false };
  }
  const key = labelKey(payload, language);
  const answer = answers.get(key);
  if (answer !== undefined) {
    return { label: answer, isAiLabel: true };
  }
  const indicatorAnswer = table === undefined && indicatorId !== undefined
    ? answers.get(labelKey({ ...payload, modifierInfo: [] }, language))
    : undefined;
  const fallback = {
    label: applyModifiersToLabel(table ?? indicatorAnswer ?? base, modifiers),
    isAiLabel: indicatorAnswer !== undefined
  };
  const query = answers.has(key) ? undefined : buildQuery(payload, language);
  if (!query) {
    return fallback;
  }
  queries.set(key, query);
  return { ...fallback, pendingLabel: key };
}

/**
 * A symbol with its label worked out again after its parts changed. Every cell that changes a
 * symbol's modifiers or indicator publishes this.
 * @param {SymbolEncodingType} payload - The symbol with its new parts.
 * @returns {SymbolEncodingType}
 */
export function relabel (payload: SymbolEncodingType): SymbolEncodingType {
  const parts = { ...payload };
  delete parts.pendingLabel;
  return { ...parts, ...labelFor(parts) };
}

/**
 * Whether any of these symbols waits for a model's label.
 * @param {SymbolEncodingType[]} payloads - The symbols.
 * @returns {boolean}
 */
export function hasPendingLabel (payloads: SymbolEncodingType[]): boolean {
  return payloads.some((payload) => payload.pendingLabel !== undefined);
}

// Each query in flight, by key, with the controller that stops it.
const inFlight = new Map<string, AbortController>();

// Stops the watcher. Set once it has started.
let stopWatcher: (() => void) | undefined;

/**
 * The keys of the labels these symbols wait for.
 * @param {SymbolEncodingType[]} payloads - The symbols.
 * @returns {string[]}
 */
function pendingKeys (payloads: SymbolEncodingType[]): string[] {
  return payloads.flatMap((payload) => payload.pendingLabel === undefined ? [] : [payload.pendingLabel]);
}

/**
 * Put every settled answer into the message, in one edit. No answer keeps the fallback label.
 * @returns {void}
 */
function applyAnswers (): void {
  const { payloads, caretPosition } = changeEncodingContents.peek();
  let settled = false;
  const next = payloads.map((payload) => {
    if (payload.pendingLabel === undefined || !answers.has(payload.pendingLabel)) {
      return payload;
    }
    settled = true;
    const answer = answers.get(payload.pendingLabel);
    const done = answer === undefined ? { ...payload } : { ...payload, label: answer, isAiLabel: true };
    delete done.pendingLabel;
    return done;
  });
  if (settled) {
    editMessage({ payloads: next, caretPosition });
  }
}

/**
 * Ask the model for one key's label. The answer, or no answer after an empty reply or an error,
 * is kept for the session. A stopped query keeps nothing.
 * @param {string} key - The symbol state asked about.
 * @param {LabelQueryType} query - The query.
 * @returns {void}
 */
function startQuery (key: string, query: LabelQueryType): void {
  const controller = new AbortController();
  inFlight.set(key, controller);
  void queryChat(query.userPrompt, query.model, false, query.systemPrompt, controller.signal)
    .then((response) => {
      const content = "message" in response ? (response.message?.content ?? "").trim() : "";
      return content.length > 0 ? content : undefined;
    })
    .catch((error: unknown) => {
      if (!controller.signal.aborted) {
        console.error(`Could not get a label from the model: ${String(error)}`);
      }
      return undefined;
    })
    .then((answer) => {
      if (controller.signal.aborted) {
        return;
      }
      inFlight.delete(key);
      answers.set(key, answer);
      applyAnswers();
    });
}

/**
 * Start the watcher that asks the model about pending labels. Called from
 * `initAdaptivePaletteGlobals()`; a second call does nothing. On every change to the message, or
 * to the message set aside while a word is built, it:
 * 1. collects the keys pending in either message;
 * 2. starts a query for each key with no answer and no query in flight;
 * 3. stops each query in flight that no symbol waits for any more;
 * 4. puts the settled answers into the message.
 * @returns {void}
 */
export function startLabelWatcher (): void {
  stopWatcher ??= effect(() => {
    const needed = new Set([
      ...pendingKeys(changeEncodingContents.value.payloads),
      ...pendingKeys(wordBuildSignal.value?.message.payloads ?? [])
    ]);
    untracked(() => {
      for (const key of needed) {
        if (answers.has(key) || inFlight.has(key)) {
          continue;
        }
        const query = queries.get(key);
        // A pending key `labelFor()` did not make has no query. Count it as no answer, so
        // nothing waits for it forever.
        if (query) {
          startQuery(key, query);
        } else {
          answers.set(key, undefined);
        }
      }
      for (const [key, controller] of inFlight) {
        if (!needed.has(key)) {
          controller.abort();
          inFlight.delete(key);
        }
      }
      applyAnswers();
    });
  });
}

/**
 * Run a task once no symbol in the message waits for its label: at once when none does. Make
 * Sentence and word naming wait like this, so the model gets "hot", not "opposite of cold".
 *
 * ponytail: no timeout, so a query that never settles holds the task. Add one if users report it.
 * @param {Function} task - What to run.
 * @returns {void}
 */
export function whenLabelsSettled (task: () => void): void {
  if (!hasPendingLabel(changeEncodingContents.peek().payloads)) {
    task();
    return;
  }
  // The first run, inside `effect()`, finds a label still waiting, so it never reaches `stop`
  // before `stop` is set.
  const stop = effect(() => {
    if (!hasPendingLabel(changeEncodingContents.value.payloads)) {
      stop();
      untracked(task);
    }
  });
}

/**
 * Stop every query and forget every answer and query. The watcher keeps running. Test-only: a
 * key reused across tests would otherwise be served a stale answer.
 * @returns {void}
 */
export function resetSymbolLabelsForTests (): void {
  inFlight.forEach((controller) => controller.abort());
  inFlight.clear();
  answers.clear();
  queries.clear();
}

/**
 * The pregenerated table's label for a symbol with an indicator alone, in `language`
 * (`"{userSelectedSymbolId}_{indicatorId}"`). Synchronous -- no network/model involved.
 * @param {number | undefined} userSelectedSymbolId - Dictionary id of the originally selected symbol, if any.
 * @param {number} indicatorId - The id of the indicator being applied.
 * @param {Language} language - The language of the table; the UI language by default.
 * @returns {string | undefined}
 */
export function getStaticNewLabel (userSelectedSymbolId: number | undefined, indicatorId: number, language: Language = languageSignal.value): string | undefined {
  if (userSelectedSymbolId === undefined) {
    return undefined;
  }
  return adaptivePaletteGlobals.indicatorLabels[language]?.[`${userSelectedSymbolId}_${indicatorId}`];
}
