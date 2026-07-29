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
 * Hold runtime state for turning a telegraphic message into full sentences:
 * 1. the signal the sentence area renders from
 * 2. the request that produces the sentences
 * 3. the cancellation of a request the user has moved on from
 * `telegraphicTranslationUtils.ts` holds the side-effect-free utility functions.
 */
import { effect, signal } from "@preact/signals";
import { adaptivePaletteGlobals, changeEncodingContents } from "./GlobalData";
import { requestSentences } from "./TelegraphicTranslationUtils";
import { saveSentenceRecord } from "./sentenceLog";
import { speak } from "./GlobalUtils";
import type { SentenceCompletionsStateType } from ".";

/**
 * Signal driving the sentence-translation area below the input palette:
 * 1. `idle` renders nothing;
 * 2. `working` and `error` render a single message;
 * 3. `ready` renders the choices, and carries the message and model that produced them.
 */
export const sentenceCompletionsSignal = signal<SentenceCompletionsStateType>({ status: "idle" });

/**
 * Asked before an edit throws away a request that is still running.
 */
export const WORKING_DISCARD_PROMPT = "Still making a sentence. Changing your message will stop it. Change anyway?";

/**
 * Asked before an edit throws away sentences that are already on screen.
 */
export const READY_DISCARD_PROMPT = "Changing your message will remove the sentences below. Change anyway?";

/**
 * The abort handle for the sentence request currently in flight, if any.
 */
let activeSentenceAbort: AbortController | null = null;

/**
 * Discard the message in the input area together with any sentences made from it.
 * The sentence state is cleared first: emptying the input area while the state is still
 * `working` or `ready` would look like an edit to the effect below and ask the user to
 * confirm a discard they have just asked for.
 * @returns {void}
 */
export function clearMessageAndChoices (): void {
  sentenceCompletionsSignal.value = { status: "idle" };
  changeEncodingContents.value = { payloads: [], caretPosition: -1 };
}

/**
 * The message currently in the input area: the labels of its symbols, space separated.
 * @returns {string}
 */
export function currentTelegraphicMessage (): string {
  return changeEncodingContents.value.payloads.map((payload) => payload.label).join(" ");
}

/**
 * Ask the model for sentences and publish the outcome to `sentenceCompletionsSignal`. Does
 * nothing when a request is already in flight or the message is empty.
 * @param {string} telegraphicMessage - The message to translate, as shown in the input area.
 * @returns {Promise<void>}
 */
export async function makeSentences (telegraphicMessage: string): Promise<void> {
  if (sentenceCompletionsSignal.peek().status === "working" ||
      telegraphicMessage.trim().length === 0) {
    return;
  }
  const controller = new AbortController();
  activeSentenceAbort = controller;
  sentenceCompletionsSignal.value = { status: "working", telegraphicMessage };
  try {
    const { sentences, model } = await requestSentences(telegraphicMessage, controller.signal);
    // Senteneces are only displayed if the user has not changed the message since the request was made.
    const pending = sentenceCompletionsSignal.peek();
    if (controller.signal.aborted || pending.status !== "working" ||
        pending.telegraphicMessage !== telegraphicMessage) {
      return;
    }
    sentenceCompletionsSignal.value = { status: "ready", sentences, model, telegraphicMessage };

    // Single-sentence mode: speak right away when the sentence arrives.
    if (adaptivePaletteGlobals.config.telegraphicTranslation?.numSentences === 1) {
      speak(sentences[0]);
      saveSentenceRecord({
        telegraphicMessage,
        model,
        candidates: sentences,
        sentence: sentences[0],
        source: "auto"
      });
    }
  } catch (error) {
    // The user editing the message aborts the request. That is normal use, not a failure,
    // so it must not reach the console or turn the display red.
    if (controller.signal.aborted) {
      return;
    }
    console.error(`Could not make sentences: ${String(error)}`);
    const pending = sentenceCompletionsSignal.peek();
    if (pending.status === "working" && pending.telegraphicMessage === telegraphicMessage) {
      sentenceCompletionsSignal.value = { status: "error" };
    }
  } finally {
    // Forget a finished request, but only if it is still the one on record. A request that
    // settles after a newer one has started must not unregister its successor and leave it
    // uncancellable.
    if (activeSentenceAbort === controller) {
      activeSentenceAbort = null;
    }
  }
}

/**
 * Keep track of the message in the input area. When the user doesn't want to discard a request
 * or its sentences, put the old message back.
 */
let previousContents = changeEncodingContents.peek();

// Warn the user if they edit a message while its sentences are currently 
// generating or on screen, as this will discard the current progress.
// - If they cancel: Revert the edit and continue the original generation.
// - If they confirm: Abort the current request as stale and apply the edit.
effect((): void => {
  const contents = changeEncodingContents.value;
  const message = currentTelegraphicMessage();
  const state = sentenceCompletionsSignal.peek();
  if ((state.status === "working" || state.status === "ready") &&
      state.telegraphicMessage !== message) {
    const prompt = state.status === "working" ? WORKING_DISCARD_PROMPT : READY_DISCARD_PROMPT;
    if (!window.confirm(prompt)) {
      // cancelled scenario: Revert the edit
      changeEncodingContents.value = previousContents;
      return;
    }
    activeSentenceAbort?.abort();
    sentenceCompletionsSignal.value = { status: "idle" };
  }
  previousContents = contents;
});
