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

import { VNode } from "preact";
import { html } from "htm/preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";

import {
  sentenceCompletionsSignal, clearMessageAndChoices, abortActiveSentenceRequest, closeSentences,
  discardEditPromptSignal, typedSentenceSignal, focusedMessageSignal, sentencePaletteSignal
} from "./TelegraphicTranslationState";
import { announceIfEnabled, speak, speakUnavailable } from "../../utils/SpeechUtils";
import { saveTranslation, SentenceSourceType } from "../../core/MessageLog";
import { MAX_NUM_SENTENCES } from "../../core/Config";
import { generateGridStyle } from "../../utils/GridUtils";
import { firstOwnControl } from "../../utils/FocusUtils";
import { ContentSentenceChoicesType } from "../../index.d";
import { adaptivePaletteGlobals, settingsSavedCount } from "../../state/GlobalData";
import { AiBadge, aiSuggestionLabel } from "../../components/AiBadge";
import { BlissSentence, BLISS_SENTENCE_CLASS } from "./BlissSentence";
import { PARSE_LANGUAGE } from "./BlissSentenceUtils";
import { languageSignal, t } from "../../i18n/I18n";
import "./SentenceChoices.scss";

type SentenceChoicesPropsType = {
  id: string,
  options: ContentSentenceChoicesType
};

/**
 * Whether a sentence's Bliss row fits inside its button.
 * @param {HTMLElement} button - The sentence button.
 * @returns {boolean} - `true` when it fits, or when the button has no row.
 */
function rowFits (button: HTMLElement): boolean {
  const row = button.querySelector(`.${BLISS_SENTENCE_CLASS}`);
  if (!row) {
    return true;
  }
  const box = button.getBoundingClientRect();
  const rowBox = row.getBoundingClientRect();
  return rowBox.top >= box.top - 1 && rowBox.bottom <= box.bottom + 1 && rowBox.right <= box.right + 1;
}

/**
 * The sentence area, the `ContentSentenceChoices` cell. The screen palette draws it over its
 * vocabulary rows (see `Palette.ts`). It is open while `sentenceCompletionsSignal` is not
 * `idle` and the user is on the palette where Make Sentences was pressed:
 * 1. Closed, it holds only the live region, and takes no space.
 * 2. Open, it is the sentence layer: a header with the status line and Edit message, one slot
 *    per sentence, and the typing area -- a text box, Speak and Done. Typing need not wait for
 *    the model. The cells under it are inert.
 * 3. `working` says sentences are being made, or that more are when one is already there.
 * 4. `error` says sentences could not be made, keeping any sentence on screen.
 *
 * The live region is always in the document to announce the state.
 * @param {SentenceChoicesPropsType} props - The cell id and its layout options.
 * @returns {VNode}
 */
export function SentenceChoices (props: SentenceChoicesPropsType): VNode {
  // Read so this draws again after a save. See `settingsSavedCount`.
  void settingsSavedCount.value;
  const state = sentenceCompletionsSignal.value;
  const discardPrompt = discardEditPromptSignal.value;
  const { columnStart, columnSpan, rowStart, rowSpan } = props.options;
  const typedSentence = typedSentenceSignal.value;
  const paletteName = adaptivePaletteGlobals.navigationStack.currentPalette?.name ?? null;
  // Open only on the palette Make Sentences was pressed on. Elsewhere the sentences wait in the
  // state, and the layer opens again when the user comes back.
  const isOpen = state.status !== "idle" && sentencePaletteSignal.value === paletteName;
  const choicesRef = useRef<HTMLDivElement>(null);
  const wasAskingRef = useRef(false);
  // The sentences shown as text only, because their Bliss rows do not fit their slots.
  const [textOnly, setTextOnly] = useState<ReadonlySet<string>>(new Set());

  const firstChoice = (): HTMLButtonElement | null =>
    choicesRef.current?.querySelector<HTMLButtonElement>(".sentenceChoice") ?? null;

  // Clicking the trigger leaves focus on it (it goes `aria-disabled`, not `disabled`).
  // Move focus onto the first choice when it arrives, so reaching the sentences does not
  // mean re-scanning the page. Once per message: a recalled sentence arrives before the
  // rest, and pulling focus back when the rest land would undo the user's scanning, or
  // interrupt them mid-sentence in the text box.
  useEffect((): void => {
    const wasAsking = wasAskingRef.current;
    wasAskingRef.current = discardPrompt !== null;
    if (state.status === "idle") {
      focusedMessageSignal.value = null;
      return;
    }
    // On another palette the sentences wait. Focus moves once the user is back.
    if (!isOpen) {
      return;
    }
    // The discard dialog holds the page `inert`, so focusing a sentence behind it does nothing;
    // and on the pass that closes the dialog, `DiscardEditDialog`'s focus restore is what decides
    // where focus goes. Standing aside on both leaves the one-shot move unspent for whichever of
    // them can land it.
    if (discardPrompt !== null || wasAsking) {
      return;
    }
    const textBox = choicesRef.current?.querySelector(".sentenceTypeYourOwn input");
    if (state.sentences.length === 0 ||
        focusedMessageSignal.peek() === state.telegraphicMessage ||
        document.activeElement === textBox) {
      return;
    }
    focusedMessageSignal.value = state.telegraphicMessage;
    firstChoice()?.focus();
  }, [state, discardPrompt, isOpen]);

  // While open, the cells under the layer are inert: out of the Tab order, the pointer and the
  // accessibility tree, with their layout untouched. A cell is under it when it starts no higher
  // than the layer does.
  useLayoutEffect(() => {
    const layer = choicesRef.current;
    if (!isOpen || !layer?.parentElement) {
      return;
    }
    const top = layer.getBoundingClientRect().top;
    const covered = Array.from(layer.parentElement.children).filter((cell) =>
      cell !== layer && cell.getBoundingClientRect().top >= top - 1);
    covered.forEach((cell) => cell.setAttribute("inert", ""));
    return (): void => {
      covered.forEach((cell) => cell.removeAttribute("inert"));
      // The button that had focus went with the layer: focus the first cell it uncovered.
      const focusLost = !document.activeElement || document.activeElement === document.body;
      if (focusLost && paletteName !== null) {
        firstOwnControl(paletteName)?.focus();
      }
    };
  }, [isOpen, paletteName]);

  // One slot per sentence asked for, so a sentence that arrives late fills a slot held for it.
  // A sentence already on screen keeps its slot when the setting goes down.
  const numSentences = adaptivePaletteGlobals.config.telegraphicTranslation?.numSentences ?? 1;
  const numSlots = Math.min(MAX_NUM_SENTENCES, Math.max(numSentences, state.sentences.length));

  // The slots change size when the layer closes, their number changes or a new message arrives,
  // so every Bliss row gets another try. Runs before the measuring below.
  useLayoutEffect(() => {
    setTextOnly((previous) => previous.size === 0 ? previous : new Set());
  }, [isOpen, numSlots, state.telegraphicMessage]);

  // A sentence whose Bliss row does not fit its slot shows its text only. Measured after every
  // render; a text-only sentence has no row, so this settles.
  useLayoutEffect((): void => {
    if (!isOpen) {
      return;
    }
    const overflowing = Array.from(choicesRef.current?.querySelectorAll<HTMLElement>(".sentenceChoice") ?? [])
      .filter((button) => !rowFits(button))
      .map((button) => button.dataset.sentence ?? "");
    if (overflowing.length > 0) {
      setTextOnly((previous) => new Set([...previous, ...overflowing]));
    }
  });

  // The slots change size with the window, so every Bliss row gets another try.
  useEffect(() => {
    const layer = choicesRef.current;
    if (!isOpen || !layer) {
      return;
    }
    const observer = new ResizeObserver(() => {
      setTextOnly((previous) => previous.size === 0 ? previous : new Set());
    });
    observer.observe(layer);
    return (): void => observer.disconnect();
  }, [isOpen]);

  // The sentences' language: the one they were asked for in.
  const sentenceLanguage = state.language ?? languageSignal.value;

  const logAndSpeak = (sentence: string, source: SentenceSourceType): void => {
    abortActiveSentenceRequest();
    const language = source === "typed" ? languageSignal.value : sentenceLanguage;
    speak(sentence, language);
    saveTranslation(state.telegraphicMessage, {
      model: state.model,
      candidates: state.sentences,
      sentence,
      source,
      language
    });
  };

  const submitTypedSentence = (event: Event): void => {
    event.preventDefault();
    const sentence = typedSentence.trim();
    if (sentence.length === 0) {
      speakUnavailable(t("sentenceSpeak"));
      return;
    }
    // The text stays in the box on purpose, so it can be spoken again or edited into a
    // second attempt without retyping it.
    logAndSpeak(sentence, "typed");
  };

  // "Done" button clears up the input area and sentences.
  const finish = (): void => {
    announceIfEnabled(t("sentenceDoneSpoken"));
    clearMessageAndChoices();
    typedSentenceSignal.value = "";
  };

  // "Edit message" closes the layer and keeps the message, for the user to change.
  const backToMessage = (): void => {
    announceIfEnabled(t("sentenceEditMessage"));
    closeSentences();
  };

  // Marked unavailable rather than `disabled` because a disabled control loses focus.
  const nothingTyped = typedSentence.trim().length === 0;

  // Read per render rather than at module load: the settings dialog can turn this off while
  // sentences are on screen.
  const showBlissSentence =
    adaptivePaletteGlobals.config.telegraphicTranslation?.showBlissSentence === true;
  const markAiSuggestions = adaptivePaletteGlobals.config.markAiSuggestions;

  const sentenceButton = (sentence: string, index: number): VNode => {
    // Everything but the sentence recalled from the log came from the model.
    const isMarked = markAiSuggestions && sentence !== state.recalledSentence;
    const words = state.words?.get(sentence);
    // `compromise` reads English only, so a sentence in another language has a Bliss row only
    // when the model gave its words.
    const hasRow = showBlissSentence && (words !== undefined || sentenceLanguage === PARSE_LANGUAGE);
    // A marked sentence says so first. An unmarked one keeps the name it had: the sentence
    // itself when the Bliss row would otherwise be all a screen reader found. A sentence shown
    // as text only keeps it too, so the whole sentence is read even when the text is cut off.
    const ariaLabel = isMarked ? aiSuggestionLabel(sentence)
      : hasRow ? sentence : undefined;
    const content = hasRow && !textOnly.has(sentence)
      ? html`<${BlissSentence} sentence=${sentence} words=${words} language=${sentenceLanguage} />`
      : html`<span class="sentenceText">${sentence}</span>`;
    return html`
      <button
        key=${index}
        lang=${sentenceLanguage}
        class=${isMarked ? "sentenceChoice aiSuggestion" : "sentenceChoice"}
        aria-label=${ariaLabel}
        data-sentence=${sentence}
        onClick=${() => logAndSpeak(sentence, "chosen")}>
        ${isMarked ? html`<${AiBadge} />` : null}
        ${content}
      </button>
    `;
  };

  const shownSentences = state.sentences.slice(0, numSlots);
  const emptySlots = Array.from({ length: numSlots - shownSentences.length }, (unused, index) => html`
    <div key=${`empty-${index}`} class="sentenceSlotEmpty" aria-hidden="true"></div>
  `);

  // The status line comes first in both states, so it stays the same element: a live region
  // that is replaced may not announce what arrives in it.
  const titleId = `${props.id}-title`;
  const layer = isOpen ? html`
    <span id=${titleId} class="sentenceLayerTitle" lang=${languageSignal.value}>${t("sentenceChoose")}</span>
    <button
      type="button"
      class="btn-command sentenceEditMessage"
      lang=${languageSignal.value}
      onClick=${backToMessage}>
      ${t("sentenceEditMessage")}
    </button>
    ${shownSentences.map(sentenceButton)}
    ${emptySlots}
    <form class="sentenceTypeYourOwn" lang=${languageSignal.value} onSubmit=${submitTypedSentence}>
      <input
        type="text"
        aria-label=${t("sentenceTypeYours")}
        placeholder=${t("sentenceTypeYours")}
        value=${typedSentence}
        onInput=${(event: Event) => { typedSentenceSignal.value = (event.target as HTMLInputElement).value; }}
      />
      <button type="submit" aria-disabled=${nothingTyped}>${t("sentenceSpeak")}</button>
      <button type="button" class="sentenceDone" onClick=${finish}>${t("sentenceDone")}</button>
    </form>
  ` : null;

  const statusText = !isOpen ? ""
    : state.status === "working"
      ? (state.sentences.length > 0 ? t("sentenceMakingMore") : t("sentenceWorking"))
      : state.status === "error" ? t("sentenceCannotComplete") : "";

  // The header, one row per slot, and the form.
  const rowsStyle = isOpen ? `grid-template-rows: 44px repeat(${numSlots}, minmax(0, 1fr)) 56px;` : "";

  return html`
    <div
      id="${props.id}"
      class=${isOpen ? "sentenceChoices sentenceLayer" : "sentenceChoices"}
      role=${isOpen ? "group" : undefined}
      aria-labelledby=${isOpen ? titleId : undefined}
      style="${generateGridStyle(columnStart, columnSpan, rowStart, rowSpan)}${rowsStyle}"
      ref=${choicesRef}>
      <p class=${state.status === "error" ? "statusMessage sentenceError" : "statusMessage"} lang=${languageSignal.value} role="status">${statusText}</p>
      ${layer}
    </div>
  `;
}
