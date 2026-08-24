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
import { batch, signal } from "@preact/signals";
import { adaptivePaletteGlobals, changeEncodingContents } from "../../state/GlobalData";
import { requestSentences, pickModel } from "./TelegraphicTranslationUtils";
import { findLatestTranslation, messageText } from "../../core/MessageLog";
import type { ContentSignalDataType, SentenceCompletionsStateType } from "../../index.d";

/**
 * Nothing to show. Shared rather than rewritten at each use so the idle shape stays in one
 * place. It is never mutated.
 */
export const IDLE_SENTENCE_STATE: SentenceCompletionsStateType = {
  status: "idle", sentences: [], recalledSentence: null, model: "", telegraphicMessage: ""
};

/**
 * Signal driving the sentence-translation area below the input palette. `status` decides what
 * is rendered; the message and model that produced the sentences travel with them.
 */
export const sentenceCompletionsSignal = signal<SentenceCompletionsStateType>(IDLE_SENTENCE_STATE);

/**
 * Asked before an edit throws away a request that is still running.
 */
export const WORKING_DISCARD_PROMPT = "Still making a sentence. Changing your message will stop it. Change anyway?";

/**
 * Asked before an edit throws away sentences that are already on screen.
 */
export const READY_DISCARD_PROMPT = "Changing your message will remove the sentences. Change anyway?";

/**
 * The question the discard dialog is showing, or `null` when nothing is being asked.
 * `SentenceChoices` renders the dialog from this; the answer arrives through
 * `confirmDiscardEdit` or `cancelDiscardEdit`.
 */
export const discardEditPromptSignal = signal<string | null>(null);

/**
 * The abort handle for the sentence request currently in flight, if any.
 */
let activeSentenceAbort: AbortController | null = null;

/**
 * Stop a sentence request the user has moved past, without disturbing what is on screen.
 *
 * Speaking a sentence, speaking typed text, and Done all end the user's interest in more
 * sentences. `working` drops to `ready` so the progress line stops claiming a query is
 * running; anything already shown stays shown.
 * @returns {void}
 */
export function abortActiveSentenceRequest (): void {
  activeSentenceAbort?.abort();
  activeSentenceAbort = null;
  const state = sentenceCompletionsSignal.peek();
  if (state.status === "working") {
    sentenceCompletionsSignal.value = { ...state, status: "ready" };
  }
}

/**
 * Discard the message in the input area together with any sentences made from it, aborting
 * a request in flight first.
 * The sentence state is cleared first, and the message is then written past `editMessage()`:
 * going through the gate with the state still `working` or `ready` would ask the user to
 * confirm a discard they have just asked for.
 * @returns {void}
 */
export function clearMessageAndChoices (): void {
  abortActiveSentenceRequest();
  sentenceCompletionsSignal.value = IDLE_SENTENCE_STATE;
  changeEncodingContents.value = { payloads: [], caretPosition: -1 };
}

/**
 * The message currently in the input area, as text.
 * @returns {string}
 */
export function currentTelegraphicMessage (): string {
  return messageText(changeEncodingContents.value.payloads);
}

/**
 * Ask the model for sentences and publish the outcome to `sentenceCompletionsSignal`. Does
 * nothing when a request is already in flight or the message is empty.
 *
 * A sentence already approved for this message is recalled from the message log and shown
 * first. With one sentence asked for in the setting, that is the whole answer and the model
 * is not queried; otherwise the model fills the rest of the list below it. Nothing is spoken
 * or logged here: that waits for the user to pick a sentence.
 * @param {string} telegraphicMessage - The message to translate, as shown in the input area.
 * @returns {Promise<void>}
 */
export async function makeSentences (telegraphicMessage: string): Promise<void> {
  if (sentenceCompletionsSignal.peek().status === "working" ||
      telegraphicMessage.trim().length === 0) {
    return;
  }
  const config = adaptivePaletteGlobals.config.telegraphicTranslation;
  const numSentences = config?.numSentences ?? 1;
  const recalled = findLatestTranslation(telegraphicMessage);

  // One sentence asked for and one already approved for this message: show it, and ask the
  // model nothing.
  if (recalled && numSentences === 1) {
    sentenceCompletionsSignal.value = {
      status: "ready", sentences: [recalled.sentence], recalledSentence: recalled.sentence,
      model: recalled.model, telegraphicMessage
    };
    return;
  }

  const recalledSentences = recalled ? [recalled.sentence] : [];
  const controller = new AbortController();
  activeSentenceAbort = controller;
  try {
    // The model is picked here as well as inside `requestSentences`. if a sentence is typed
    // while the query is running, it needs to be saved under the model that the query was sent to.
    const model = pickModel(config?.model ?? "");
    sentenceCompletionsSignal.value = {
      status: "working", sentences: recalledSentences,
      recalledSentence: recalled?.sentence ?? null, model, telegraphicMessage
    };
    const result = await requestSentences(telegraphicMessage, controller.signal);
    // Sentences are only displayed if the user has not changed the message or moved on since
    // the request was made.
    const pending = sentenceCompletionsSignal.peek();
    if (controller.signal.aborted || pending.status !== "working" ||
        pending.telegraphicMessage !== telegraphicMessage) {
      return;
    }
    // A recalled sentence keeps its place at the top, and the fill tops the list up to
    // `numSentences` without repeating it.
    const sentences = recalled
      ? [recalled.sentence, ...result.sentences
        .filter((sentence) => sentence !== recalled.sentence)
        .slice(0, numSentences - 1)]
      : result.sentences;
    sentenceCompletionsSignal.value = {
      status: "ready", sentences, recalledSentence: recalled?.sentence ?? null,
      model: result.model, telegraphicMessage
    };
  } catch (error) {
    // The user editing the message aborts the request. That is normal use, not a failure,
    // so it must not reach the console or turn the display red.
    if (controller.signal.aborted) {
      return;
    }
    console.error(`Could not make sentences: ${String(error)}`);
    const pending = sentenceCompletionsSignal.peek();
    if (pending.status === "working" && pending.telegraphicMessage === telegraphicMessage) {
      // Keeps a recalled sentence and the model query: the user can still speak, and what they
      // type is still recorded against the message.
      sentenceCompletionsSignal.value = { ...pending, status: "error" };
    } else if (pending.status === "idle") {
      // Picking the model failed, before the state ever went `working`. Without this the user
      // is left with no error line at all.
      sentenceCompletionsSignal.value = {
        status: "error", sentences: recalledSentences,
        recalledSentence: recalled?.sentence ?? null, model: "", telegraphicMessage
      };
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
 * The edit the user is being asked about, held back until they answer. Applying it while
 * the question is on screen would start word prediction on a message the user may be about
 * to abandon, and leave two model queries running against different messages.
 */
let pendingContents: ContentSignalDataType | null = null;

/**
 * Decide whether an edit to the message may be published. Registered with `setEditGuard()`
 * from `core/InitGlobals.ts`, so every edit is offered here before it reaches the signal.
 * Returning `true` holds the edit; the answer to the question applies or drops it.
 * @param {ContentSignalDataType} next - The message as it would be after the edit.
 * @returns {boolean} - `true` when the edit is held back.
 */
export function guardEdit (next: ContentSignalDataType): boolean {
  // A question is already up. Clicks cannot reach here -- the page is `inert` behind the
  // dialog -- so this is `ActionIndicatorCell`'s resolved label arriving. It was built from
  // the message as it stood before the held edit, so it is stale either way: drop it.
  if (discardEditPromptSignal.peek() !== null) {
    return true;
  }
  const state = sentenceCompletionsSignal.peek();
  // A failed fill can leave a recalled sentence on screen. It is as tappable as any other,
  // so losing it to an edit is worth a question, exactly like a full set of sentences.
  // A finished state can also hold no sentences at all -- a failed request, or one the user
  // moved past by speaking before it landed -- and there is nothing there to discard.
  const finished = state.status === "ready" || state.status === "error";
  const showsSentences = finished && state.sentences.length > 0;
  if ((state.status === "working" || showsSentences) &&
      state.telegraphicMessage !== messageText(next.payloads)) {
    // The edit is held for as long as the question is up, and published only if the user
    // confirms. Publishing it would show a message the user has not agreed to, and start
    // word prediction on it.
    pendingContents = next;
    discardEditPromptSignal.value =
      state.status === "working" ? WORKING_DISCARD_PROMPT : READY_DISCARD_PROMPT;
    return true;
  }
  if (finished && state.sentences.length === 0) {
    // Nothing left of the old message but the error line or an empty typing area: it goes
    // without asking the user.
    sentenceCompletionsSignal.value = IDLE_SENTENCE_STATE;
  }
  return false;
}

/**
 * The user chose to lose the sentence work: stop the request, clear the sentence area, and
 * apply the edit that was held back. The edit becomes the new baseline, so a later edit is
 * not measured against a message the user has already abandoned.
 * @returns {void}
 */
export function confirmDiscardEdit (): void {
  if (!discardEditPromptSignal.peek()) {
    return;
  }
  activeSentenceAbort?.abort();
  const edit = pendingContents;
  pendingContents = null;
  // Batched so the dialog closing, the sentences going and the edit arriving are one render
  // rather than three.
  batch((): void => {
    discardEditPromptSignal.value = null;
    sentenceCompletionsSignal.value = IDLE_SENTENCE_STATE;
    if (edit) {
      // Raw: the edit was frozen on its way in, and the guard has already ruled on it.
      changeEncodingContents.value = edit;
    }
  });
}

/**
 * The user chose to keep the sentence work: drop the held edit and leave the request and the
 * sentences alone. The message was never changed, so nothing is restored here, and word
 * prediction's row is still showing the message that stayed.
 *
 * Guarded so it can be called twice. Both dialog buttons close the dialog, and the
 * `close` event then reports the cancel a second time.
 * @returns {void}
 */
export function cancelDiscardEdit (): void {
  if (!discardEditPromptSignal.peek()) {
    return;
  }
  pendingContents = null;
  discardEditPromptSignal.value = null;
}
