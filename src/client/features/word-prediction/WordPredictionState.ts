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
import { adaptivePaletteGlobals, changeEncodingContents, finishedMessageSignal } from "../../state/GlobalData";
import { messageText } from "../../core/MessageLog";
import { isModelTierActive, predictNext, rankModelWords, requestModelWords } from "./WordPredictionUtils";
import { attributesPromptText } from "../message-attributes/MessageAttributesState";
import type { ModelWordsStateType, SymbolEncodingType } from "../../index.d";

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
 * The abort handle for the request currently in flight, if any.
 */
let activeAbort: AbortController | null = null;

/**
 * The handle for the debounce timer, if one is running.
 */
let pendingTimer: number | undefined;

/**
 * The message the word suggestions on screen were asked for, so an unchanged message is not
 * asked about twice. Every branch of the effect keeps it in step with what is on screen, the
 * ones that ask for nothing included: a message the effect declined to act on is still the
 * message the row is showing.
 */
let previousContextKey = "";

/**
 * The message text up to the caret, built from symbol labels: what the model is asked about.
 * Not the key a reply is matched against -- see `queryContextKeyOf()` for that.
 * @param {SymbolEncodingType[]} payloads - The symbols in the message being composed.
 * @param {number} caretPosition - The caret's position among them.
 * @returns {string}
 */
export function messageUpToCaret (payloads: SymbolEncodingType[], caretPosition: number): string {
  return payloads
    .slice(0, caretPosition + 1)
    .map((payload) => payload.label)
    .filter((label) => label.trim().length > 0)
    .join(" ");
}

/**
 * What a set of word suggestions answered: the message text and the attributes set on it. A
 * reply is only shown while both still match, so setting an attribute asks again rather than
 * leaving suggestions made without it.
 *
 * Kept apart from `messageUpToCaret()` because that one's result is the message sent to the
 * model. The attributes reach the prompt as a line of their own, so folding them in here would
 * say them twice, and once inside the message.
 * @param {string} messageSoFar - The message text, from `messageUpToCaret()`.
 * @returns {string}
 */
export function queryContextKeyOf (messageSoFar: string): string {
  const attributes = attributesPromptText();
  return attributes.length === 0 ? messageSoFar : `${messageSoFar} ${attributes}`;
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
 * Ask the model for words to fill the slots the history left empty, and publish them to
 * `modelWordsSignal`. Does nothing when the history filled every slot.
 * @param {string} contextKey - The message and attributes the words are being asked for.
 * @param {string} messageSoFar - The message text to ask the model about.
 * @param {string[]} labels - The labels up to the caret, as `predictNext()` takes them.
 * @returns {Promise<void>}
 */
async function queryModelWords (
  contextKey: string, messageSoFar: string, labels: string[]
): Promise<void> {
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
      messageSoFar, Math.max(MIN_WORDS_REQUESTED, 2 * emptySlots), controller.signal
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

// Follow the message being composed. A message the user has agreed to and not yet finished
// starts the wait for a query; anything else is left alone.
effect((): void => {
  const { payloads, caretPosition } = changeEncodingContents.value;
  const messageSoFar = messageUpToCaret(payloads, caretPosition);
  // Read before any early return, so the effect stays subscribed to the attributes however
  // this run ends.
  const contextKey = queryContextKeyOf(messageSoFar);
  // The user has finished this message. Stop any query still working on it; the words already
  // on the row stay usable -- restamped with the current key so an attribute change afterward
  // does not make `PredictedWords` stop recognizing them as an answer to this message.
  //
  // `finishedMessage.length > 0` excludes the empty message: an emptied message and an
  // untouched `finishedMessageSignal` are both "", which would otherwise read as finished and
  // restamp suggestions for a message that no longer exists (e.g. "Delete all").
  const finishedMessage = finishedMessageSignal.value;
  if (finishedMessage.length > 0 && messageText(payloads) === finishedMessage) {
    previousContextKey = contextKey;
    cancelModelQuery();
    const shown = modelWordsSignal.peek();
    // Only when the key actually changed, so an unrelated re-run of this branch (another
    // message-unrelated signal changing while finished) does not wake `PredictedWords` for
    // nothing.
    if (shown.status === "ready" && shown.contextKey !== contextKey) {
      modelWordsSignal.value = { ...shown, contextKey };
    }
    return;
  }
  if (contextKey === previousContextKey) {
    return;
  }
  previousContextKey = contextKey;
  cancelModelQuery();
  // The words on the row answered the message that is gone.
  modelWordsSignal.value = { status: "idle" };
  // An agreed change: the message is being composed again, so a message finished earlier is no
  // longer finished.
  finishedMessageSignal.value = "";

  const { show } = adaptivePaletteGlobals.config.wordPrediction;
  // An empty message gives the model nothing to go on, and a hidden row nowhere to put the
  // answer.
  if (!show || !isModelTierActive() || messageSoFar.length === 0) {
    return;
  }
  const labels = payloads.slice(0, caretPosition + 1).map((payload) => payload.label);
  pendingTimer = window.setTimeout(
    () => void queryModelWords(contextKey, messageSoFar, labels), DEBOUNCE_MS
  );
});
