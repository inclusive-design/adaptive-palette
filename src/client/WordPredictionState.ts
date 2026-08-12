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
 * Hold runtime state for the model's half of word prediction:
 * 1. the signal the suggestion row appends from
 * 2. the debounced request that produces the words
 * 3. the cancellation of a request the user has moved on from
 * Note: `WordPredictionUtils.ts` holds the side-effect-free utility functions.
 */
import { effect, signal } from "@preact/signals";
import { adaptivePaletteGlobals, changeEncodingContents } from "./GlobalData";
import { isModelTierActive, predictNext, rankModelWords, requestModelWords } from "./WordPredictionUtils";
import type { ModelWordsStateType, SymbolEncodingType } from ".";

/**
 * How long the message must be unchanged before querying a model for word suggestions.
 * Long enough to sit out a quick run of selections, short enough to feel automatic.
 * Each message change restarts the wait.
 */
export const DEBOUNCE_MS = 400;

/**
 * The fewest words to ask for. Words with no Bliss symbol are dropped, so the reply has to
 * be longer than the number of slots it is filling.
 */
export const MIN_WORDS_REQUESTED = 5;

/**
 * Signal carrying the model's contribution to the suggestion row. `idle` adds nothing,
 * `working` is a request in flight, and `ready` carries the words to append.
 */
export const modelWordsSignal = signal<ModelWordsStateType>({ status: "idle" });

/**
 * Whether the suggestion row reports what the model is doing. When "sentence" or "speak"
 * button is pressed meaning the message is finished, it turns the model status report off,
 * but the words already on the row stay where they are.
 */
export const showModelStatusSignal = signal<boolean>(true);

/**
 * The abort handle for the request currently in flight, if any.
 */
let activeAbort: AbortController | null = null;

/**
 * The handle for the debounce timer, if one is running.
 */
let pendingTimer: number | undefined;

/**
 * The message the word suggestions on screen were asked for. Used to keep track of the
 * user message change that will stop a in-flight request.
 */
let previousContextKey = "";

/**
 * The user message extracted from symbol labels. The model reply arrives after the change of the
 * user message will be thrown away.
 * @param {SymbolEncodingType[]} payloads - The symbols in the message being composed.
 * @param {number} caretPosition - The caret's position among them.
 * @returns {string}
 */
export function contextKeyOf (payloads: SymbolEncodingType[], caretPosition: number): string {
  return payloads
    .slice(0, caretPosition + 1)
    .map((payload) => payload.label)
    .filter((label) => label.trim().length > 0)
    .join(" ");
}

/**
 * Throw away any request in flight and any wait about to become one.
 * @returns {void}
 */
export function cancelModelQuery (): void {
  activeAbort?.abort();
  activeAbort = null;
  window.clearTimeout(pendingTimer);
  pendingTimer = undefined;
}

/**
 * Stop reporting the model's progress for the message on screen, and stop any query still
 * working on it. The words already on the row stay where they are: the user is finished with
 * the message, so nothing more needs to be asked or said about it.
 * @returns {void}
 */
export function dismissModelStatus (): void {
  cancelModelQuery();
  showModelStatusSignal.value = false;
}

/**
 * Ask the model for words to fill the slots the history left empty, and publish them to
 * `modelWordsSignal`. Does nothing when the history filled every slot.
 * @param {string} contextKey - The message being asked about.
 * @param {string[]} labels - The labels up to the caret, as `predictNext()` takes them.
 * @returns {Promise<void>}
 */
async function queryModelWords (contextKey: string, labels: string[]): Promise<void> {
  const { maxSuggestions } = adaptivePaletteGlobals.config.wordPrediction;
  const contextLabels = labels.filter((label) => label.trim().length > 0);
  const historySuggestions = predictNext(labels, maxSuggestions);
  const emptySlots = maxSuggestions - historySuggestions.length;
  if (emptySlots <= 0) {
    return;
  }
  const controller = new AbortController();
  activeAbort = controller;
  modelWordsSignal.value = { status: "working", contextKey };
  try {
    const words = await requestModelWords(
      contextKey, Math.max(MIN_WORDS_REQUESTED, 2 * emptySlots), controller.signal
    );
    // Words are only shown while the user message on screen remains unchanged.
    const pending = modelWordsSignal.peek();
    if (controller.signal.aborted || pending.status !== "working" || pending.contextKey !== contextKey) {
      return;
    }
    // Neither a word already in the row nor the word at the caret is suggested again.
    const excluded = [...historySuggestions.map((suggestion) => suggestion.label), ...contextLabels.slice(-1)];
    const payloads = rankModelWords(words, excluded, emptySlots);
    modelWordsSignal.value = payloads.length === 0
      ? { status: "idle" }
      : { status: "ready", contextKey, payloads };
  } catch (error) {
    // The user changing the message aborts the request. That is normal use, not a failure.
    if (!controller.signal.aborted) {
      console.error(`Could not get word suggestions: ${String(error)}`);
    }
    const pending = modelWordsSignal.peek();
    if (pending.status === "working" && pending.contextKey === contextKey) {
      modelWordsSignal.value = { status: "idle" };
    }
  } finally {
    // Forget a finished request, but only if it is still the one on record. A request that
    // settles after a newer one has started must not unregister its successor and leave it
    // uncancellable.
    if (activeAbort === controller) {
      activeAbort = null;
    }
  }
}

// Follow the message being composed. Every change drops the model's words for the message
// that is gone and starts the wait again.
effect((): void => {
  const { payloads, caretPosition } = changeEncodingContents.value;
  const contextKey = contextKeyOf(payloads, caretPosition);
  if (contextKey === previousContextKey) {
    return;
  }
  previousContextKey = contextKey;
  cancelModelQuery();
  modelWordsSignal.value = { status: "idle" };
  showModelStatusSignal.value = true;

  const { show } = adaptivePaletteGlobals.config.wordPrediction;
  // An empty message gives the model nothing to go on, and a hidden row nowhere to put the
  // answer.
  if (!show || !isModelTierActive() || contextKey.length === 0) {
    return;
  }
  const labels = payloads.slice(0, caretPosition + 1).map((payload) => payload.label);
  pendingTimer = window.setTimeout(() => void queryModelWords(contextKey, labels), DEBOUNCE_MS);
});
