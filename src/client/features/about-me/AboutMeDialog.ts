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

import { Fragment, VNode } from "preact";
import { html } from "htm/preact";
import { useEffect, useRef, useState } from "preact/hooks";

import { adaptivePaletteGlobals } from "../../state/GlobalData";
import { speakUnavailable } from "../../utils/SpeechUtils";
import type { DismissedFactType, FactCategoryType, AboutMeFactType } from "../../index.d";
import {
  FACT_CATEGORIES, FactSuggestionType, aboutMeSignal,
  addFact, editFact, removeFact, acceptSuggestion, rejectSuggestion, restoreDismissed
} from "./AboutMeState";
import { requestFactSuggestions, LearningResultType } from "./AboutMeExtractionUtils";
import "./AboutMeDialog.scss";

export const NOTES_HEADING = "Your notes";
export const LEARNT_HEADING = "What the system has learnt";
export const DISMISSED_HEADING = "Suggestions you turned down";
export const SUGGEST_LABEL = "Suggest updates";
export const CATEGORY_LABEL = "Category";
export const NOTE_LABEL = "Note";
export const ADD_LABEL = "Add note";
export const EDIT_LABEL = "Edit";
export const EDIT_CATEGORY_LABEL = "Change category";
export const EDIT_NOTE_LABEL = "Change note";
export const DELETE_LABEL = "Delete";
export const SAVE_LABEL = "Save";
export const CANCEL_LABEL = "Cancel";
export const ACCEPT_LABEL = "Accept";
export const REJECT_LABEL = "Reject";
export const RESTORE_LABEL = "Add back";
export const CLOSE_LABEL = "Close";
export const SUBTITLE_TEXT = "What Adaptive Palette knows about you.";
export const ADDED_LABEL = "Added";
export const NO_NOTES_TEXT = "No notes yet.";
export const NOTHING_LEARNT_TEXT = "Nothing learnt yet.";
export const NOTHING_DISMISSED_TEXT = "Nothing turned down yet.";
export const WORKING_TEXT = "Reading your messages…";
export const NOTHING_NEW_TEXT = "Nothing new to suggest.";
export const LEARNT_UP_TO_TEXT = "Learnt from your messages up to";
export const MORE_WAITING_TEXT = "More messages are waiting. Choose Suggest updates again.";
export const NO_NEW_MESSAGES_TEXT = "There are no new messages to learn from.";

type AboutMeDialogProps = {
  onRequestClose: () => void
};

type SuggestStateType =
  | { status: "idle" }
  | { status: "working" }
  | { status: "done", result: LearningResultType }
  | { status: "error", message: string };

type EditingType = { id: string, category: FactCategoryType, text: string };

/**
 * What the status line says once suggestions have been asked for. Arriving suggestions need
 * their own line: the live region would otherwise fall silent just as a list of Accept and
 * Reject buttons appears, leaving a screen-reader or switch user nothing to go on.
 * @param {number} count - How many suggestions arrived.
 * @returns {string}
 */
export function suggestionsReadyText (count: number): string {
  return count === 0 ? NOTHING_NEW_TEXT
    : count === 1 ? "1 suggestion to review." : `${count} suggestions to review.`;
}

/**
 * The date on a card, as a short local date. Facts read back from storage are not guaranteed
 * to carry `addedAt` -- `isFact()` in `AboutMeState.ts` does not check it, and the store can
 * be edited by hand in the browser's developer tools -- so anything at all can arrive here.
 * Typed `unknown` rather than `string` for that reason: `null` is the likeliest junk value, and
 * `new Date(null)` is a *valid* date, the epoch, which would show as "Added Jan 1, 1970".
 * @param {unknown} addedAt - What the stored fact carries as its ISO timestamp.
 * @returns {string} The formatted date, or "" when there is none to show.
 */
export function factDateText (addedAt: unknown): string {
  if (typeof addedAt !== "string" || addedAt === "") {
    return "";
  }
  const date = new Date(addedAt);
  return Number.isNaN(date.getTime()) ? ""
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * How far "Suggest updates" has read, as a sentence. Typed `unknown` for the same reason as
 * `factDateText()`: `hydrateAboutMe()` does not check the timestamp.
 * @param {unknown} timestamp - The ISO timestamp of the last message read.
 * @returns {string} The sentence, or "" when there is no usable timestamp.
 */
export function learntUpToText (timestamp: unknown): string {
  if (typeof timestamp !== "string" || timestamp === "") {
    return "";
  }
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "" : `${LEARNT_UP_TO_TEXT} ${date.toLocaleString()}.`;
}

/**
 * The item beside this one in a list: the one after it, or the one before it when it is last.
 * Where focus goes when the item itself is removed.
 * @param {T[]} list - The list as it is shown.
 * @param {T} item - The item being removed.
 * @returns {T | undefined}
 */
function neighbourOf<T> (list: T[], item: T): T | undefined {
  const index = list.indexOf(item);
  return index < 0 ? undefined : list[index + 1] ?? list[index - 1];
}

/**
 * The body of the "About Me" dialog: the notes the user typed in, the facts they accepted
 * from the model's suggestions, and the suggestions they turned down.
 *
 * Suggestions come only when the user asks for them. Nothing is added until the user accepts
 * it, and nothing turned down is thrown away: what stopped being true once may be true again,
 * so it is listed with a way to add it back.
 *
 * The whole dialog is desktop-only -- `SymbolEntryToolbar` does not offer it on the hosted
 * site, where there is no model for About Me to reach.
 * @param {AboutMeDialogProps} props - How to close the dialog around this body.
 * @returns {VNode}
 */
export function AboutMeDialog (props: AboutMeDialogProps): VNode {
  const { facts, dismissed, pending, learntUpTo } = aboutMeSignal.value;
  const notes = facts.filter((fact) => fact.source === "manual");
  const learnt = facts.filter((fact) => fact.source === "suggested");
  // The same facts in the order `byCategory()` draws them, so focus can move to the next one.
  const inCategoryOrder = (list: AboutMeFactType[]): AboutMeFactType[] =>
    FACT_CATEGORIES.flatMap((category) => list.filter((fact) => fact.category === category));
  const orderedNotes = inCategoryOrder(notes);
  const orderedLearnt = inCategoryOrder(learnt);
  const canSuggest = adaptivePaletteGlobals.config.aboutMe !== undefined;

  const [newCategory, setNewCategory] = useState<FactCategoryType>(FACT_CATEGORIES[0]);
  const [newText, setNewText] = useState("");
  const [editing, setEditing] = useState<EditingType | null>(null);
  const [suggest, setSuggest] = useState<SuggestStateType>({ status: "idle" });
  const bodyRef = useRef<HTMLDivElement>(null);
  // Held in a ref rather than in `suggest`: a second activation landing before Preact
  // re-renders reads the same stale state, and two taps must not mean two model requests.
  const isAskingRef = useRef(false);
  // Where focus goes once Preact has re-rendered, set as the action is handled. Every action
  // here unmounts the control that had focus, and focus would then fall to `<body>`, making a
  // switch or eye-gaze user restart their scan from the top of the dialog.
  const focusAfterRenderRef = useRef<(() => HTMLElement | null) | null>(null);

  // Effects are flushed after the render, but a flush left over from an earlier render can
  // run first, before the awaited result is on screen. So the request is kept until it finds
  // its target rather than being spent on a DOM that does not hold it yet.
  useEffect((): void => {
    const target = focusAfterRenderRef.current?.();
    if (target) {
      focusAfterRenderRef.current = null;
      target.focus();
    }
  });

  const focusAfterRender = (find: () => HTMLElement | null): void => {
    focusAfterRenderRef.current = find;
  };

  const inBody = (selector: string): HTMLElement | null =>
    bodyRef.current?.querySelector<HTMLElement>(selector) ?? null;

  const allInBody = (selector: string): HTMLElement[] =>
    Array.from(bodyRef.current?.querySelectorAll<HTMLElement>(selector) ?? []);

  /**
   * Hand focus on when the item at `index` of a list leaves it: to whichever button takes its
   * place, or to `fallbackSelector` when that item was the last of them.
   * @param {string} selector - The button each item in the list carries.
   * @param {number} index - Where in the list the item being removed is.
   * @param {string} fallbackSelector - What to focus when the list empties.
   */
  const focusAfterRemoval = (selector: string, index: number, fallbackSelector: string): void => {
    const countBefore = allInBody(selector).length;
    focusAfterRender(() => {
      const remaining = allInBody(selector);
      // Nothing to move to until the render that takes the item off the list.
      return remaining.length >= countBefore ? null
        : remaining[Math.min(index, remaining.length - 1)] ?? inBody(fallbackSelector);
    });
  };

  const add = (event: Event): void => {
    event.preventDefault();
    if (newText.trim().length > 0) {
      void addFact(newCategory, newText);
      setNewText("");
    }
  };

  const startEdit = (fact: AboutMeFactType): void => {
    focusAfterRender(() => inBody("#about-me-edit-text"));
    setEditing({ id: fact.id, category: fact.category, text: fact.text });
  };

  // The form replaces the Edit button that was focused, so leaving edit puts focus back on it.
  const leaveEdit = (id: string): void => {
    focusAfterRender(() => inBody(`[data-edit-fact="${id}"]`));
    setEditing(null);
  };

  const saveEdit = (event: Event): void => {
    event.preventDefault();
    if (editing && editing.text.trim().length > 0) {
      void editFact(editing.id, editing.category, editing.text);
      leaveEdit(editing.id);
    }
  };

  const askForSuggestions = async (): Promise<void> => {
    if (isAskingRef.current) {
      speakUnavailable(SUGGEST_LABEL);
      return;
    }
    isAskingRef.current = true;
    setSuggest({ status: "working" });
    try {
      const result = await requestFactSuggestions();
      // Reaching the suggestions should not mean scanning the dialog again. New ones are added
      // after any already pending, so the first is `found` from the end. Counted after the
      // run, because pending ones can be accepted or rejected while it is in progress.
      if (result.status === "learnt" && result.found > 0) {
        const firstNew = aboutMeSignal.peek().pending.length - result.found;
        focusAfterRender(() => allInBody(".aboutMeAccept")[firstNew] ?? null);
      }
      setSuggest({ status: "done", result });
    } catch (error) {
      setSuggest({ status: "error", message: error instanceof Error ? error.message : String(error) });
    } finally {
      isAskingRef.current = false;
    }
  };

  // Accepting or rejecting a suggestion takes it off the pending list. Focus follows to
  // whichever Accept button takes its place, or to the trigger when none is left.
  const settle = (
    suggestion: FactSuggestionType,
    index: number,
    action: (suggestion: FactSuggestionType) => Promise<void>
  ): void => {
    focusAfterRemoval(".aboutMeAccept", index, ".aboutMeSuggest");
    void action(suggestion);
  };

  const categorySelect = (id: string, value: FactCategoryType, onChange: (category: FactCategoryType) => void): VNode => html`
    <select
      id=${id}
      value=${value}
      onChange=${(event: Event) => onChange((event.currentTarget as HTMLSelectElement).value as FactCategoryType)}>
      ${FACT_CATEGORIES.map((category) => html`<option key=${category} value=${category}>${category}</option>`)}
    </select>
  `;

  /**
   * The date line on a card, left out entirely when the fact carries no usable date. Always
   * labelled: read aloud, a bare date under a category heading says nothing about what it is.
   * @param {AboutMeFactType} fact - The fact the card is for.
   * @returns {VNode | null}
   */
  const dateLine = (fact: AboutMeFactType): VNode | null => {
    const text = factDateText(fact.addedAt);
    return text === "" ? null : html`<p class="aboutMeFactMeta">${ADDED_LABEL} ${text}</p>`;
  };

  /**
   * Facts under a heading for each category that has any, in category order.
   * @param {AboutMeFactType[]} list - The facts to show.
   * @param {Function} renderFact - Draws one fact as a list item.
   * @returns {VNode[]}
   */
  const byCategory = (list: AboutMeFactType[], renderFact: (fact: AboutMeFactType) => VNode): VNode[] =>
    FACT_CATEGORIES
      .filter((category) => list.some((fact) => fact.category === category))
      .map((category) => html`
        <${Fragment} key=${category}>
          <h4>${category}</h4>
          <ul class="aboutMeFactList" role="list">${list.filter((fact) => fact.category === category).map(renderFact)}</ul>
        <//>
      `);

  /**
   * A Delete button that hands focus on to the list it leaves behind.
   * @param {AboutMeFactType} fact - The fact this button deletes.
   * @param {AboutMeFactType[]} siblings - The facts in the same list, in the order shown.
   * @param {string} fallbackSelector - What to focus when that list empties.
   * @returns {VNode}
   */
  const deleteButton = (fact: AboutMeFactType, siblings: AboutMeFactType[], fallbackSelector: string): VNode => {
    const remove = (): void => {
      const neighbour = neighbourOf(siblings, fact);
      focusAfterRender(() =>
        (neighbour && inBody(`[data-delete-fact="${neighbour.id}"]`)) ?? inBody(fallbackSelector));
      void removeFact(fact.id);
    };
    return html`
      <button
        type="button"
        data-delete-fact=${fact.id}
        aria-label=${`${DELETE_LABEL}: ${fact.text}`}
        onClick=${remove}>${DELETE_LABEL}</button>
    `;
  };

  const renderNote = (fact: AboutMeFactType): VNode => editing?.id === fact.id
    ? html`
      <li key=${fact.id} class="aboutMeCard">
        <form class="aboutMeFactForm" onSubmit=${saveEdit}>
          <label for="about-me-edit-category">${EDIT_CATEGORY_LABEL}</label>
          ${categorySelect("about-me-edit-category", editing.category, (category) => setEditing({ ...editing, category }))}
          <label for="about-me-edit-text">${EDIT_NOTE_LABEL}</label>
          <input
            id="about-me-edit-text"
            type="text"
            required
            value=${editing.text}
            onInput=${(event: Event) => setEditing({ ...editing, text: (event.currentTarget as HTMLInputElement).value })} />
          <button type="submit">${SAVE_LABEL}</button>
          <button type="button" onClick=${() => leaveEdit(fact.id)}>${CANCEL_LABEL}</button>
        </form>
      </li>
    `
    : html`
      <li key=${fact.id} class="aboutMeCard">
        <div class="aboutMeFactBody">
          <p class="aboutMeFactText">${fact.text}</p>
          ${dateLine(fact)}
        </div>
        <div class="aboutMeFactActions">
          <button
            type="button"
            data-edit-fact=${fact.id}
            aria-label=${`${EDIT_LABEL}: ${fact.text}`}
            onClick=${() => startEdit(fact)}>${EDIT_LABEL}</button>
          ${deleteButton(fact, orderedNotes, ".aboutMeAddNote")}
        </div>
      </li>
    `;

  /**
   * A suggestion the user turned down, with the button that adds it back.
   * @param {DismissedFactType} entry - The dismissed suggestion.
   * @param {number} index - Where it is in the dismissed list.
   * @returns {VNode}
   */
  const renderDismissed = (entry: DismissedFactType, index: number): VNode => {
    const restore = (): void => {
      focusAfterRemoval(".aboutMeRestore", index, ".aboutMeAddNote");
      void restoreDismissed(entry);
    };
    return html`
      <li key=${`${entry.category}:${entry.text}`} class="aboutMeCard">
        <div class="aboutMeFactBody">
          <p class="aboutMeFactText">${entry.text}</p>
          <p class="aboutMeFactMeta">${entry.category}</p>
        </div>
        <div class="aboutMeFactActions">
          <button
            type="button"
            class="aboutMeRestore"
            aria-label=${`${RESTORE_LABEL}: ${entry.text}`}
            onClick=${restore}>${RESTORE_LABEL}</button>
        </div>
      </li>
    `;
  };

  const renderLearnt = (fact: AboutMeFactType): VNode => html`
    <li key=${fact.id} class="aboutMeCard">
      <div class="aboutMeFactBody">
        <p class="aboutMeFactText">${fact.text}</p>
        ${dateLine(fact)}
      </div>
      <div class="aboutMeFactActions">
        ${deleteButton(fact, orderedLearnt, ".aboutMeSuggest")}
      </div>
    </li>
  `;

  const statusText = suggest.status === "working" ? WORKING_TEXT
    : suggest.status === "error" ? suggest.message
      : suggest.status === "done" && suggest.result.status === "learnt"
        ? suggestionsReadyText(suggest.result.found)
        : "";

  // Only after a run in this dialog session: reopening the dialog shows the date line alone.
  const progressText = suggest.status !== "done" ? ""
    : suggest.result.status === "learnt" && suggest.result.hasMore ? MORE_WAITING_TEXT
      : NO_NEW_MESSAGES_TEXT;

  const learntUpToLine = learntUpToText(learntUpTo?.timestamp);

  const pendingList = pending.length > 0 && html`
    <div class="aboutMeReviewPanel">
      <ul class="aboutMeFactList aboutMeSuggestions" role="list">
        ${pending.map((suggestion, index) => html`
          <li key=${`${suggestion.category}:${suggestion.text}`} class="aboutMeCard">
            <div class="aboutMeFactBody">
              <p class="aboutMeFactText">${suggestion.text}</p>
              <p class="aboutMeFactMeta">${suggestion.category}</p>
            </div>
            <div class="aboutMeFactActions">
              <button
                type="button"
                class="aboutMeAccept"
                aria-label=${`${ACCEPT_LABEL}: ${suggestion.text}`}
                onClick=${() => settle(suggestion, index, acceptSuggestion)}>${ACCEPT_LABEL}</button>
              <button
                type="button"
                aria-label=${`${REJECT_LABEL}: ${suggestion.text}`}
                onClick=${() => settle(suggestion, index, rejectSuggestion)}>${REJECT_LABEL}</button>
            </div>
          </li>
        `)}
      </ul>
    </div>
  `;

  return html`
    <${Fragment}>
      <div class="aboutMeBody" ref=${bodyRef}>
        <p class="aboutMeSubtitle">${SUBTITLE_TEXT}</p>
        <section class="aboutMeSection" aria-labelledby="about-me-notes-heading">
          <h3 id="about-me-notes-heading">${NOTES_HEADING}</h3>
          <form class="aboutMeFactForm aboutMeFormCard" onSubmit=${add}>
            <label for="about-me-add-category">${CATEGORY_LABEL}</label>
            ${categorySelect("about-me-add-category", newCategory, setNewCategory)}
            <label for="about-me-add-text">${NOTE_LABEL}</label>
            <input
              id="about-me-add-text"
              type="text"
              required
              value=${newText}
              onInput=${(event: Event) => setNewText((event.currentTarget as HTMLInputElement).value)} />
            <button type="submit" class="aboutMeAddNote">${ADD_LABEL}</button>
          </form>
          ${notes.length === 0 ? html`<p>${NO_NOTES_TEXT}</p>` : byCategory(notes, renderNote)}
        </section>

        <section class="aboutMeSection" aria-labelledby="about-me-learnt-heading">
          <h3 id="about-me-learnt-heading">${LEARNT_HEADING}</h3>
          ${canSuggest && html`
            <button
              type="button"
              class="aboutMeSuggest"
              aria-disabled=${suggest.status === "working" ? "true" : undefined}
              onClick=${() => void askForSuggestions()}>${SUGGEST_LABEL}</button>
            ${learntUpToLine !== "" && html`<p class="aboutMeFactMeta">${learntUpToLine}</p>`}
            <p class="statusMessage" role="status">${statusText}</p>
            <p class="statusMessage" role="status">${progressText}</p>
            ${pendingList}
          `}
          ${learnt.length === 0 ? html`<p>${NOTHING_LEARNT_TEXT}</p>` : byCategory(learnt, renderLearnt)}
        </section>

        <section class="aboutMeSection" aria-labelledby="about-me-dismissed-heading">
          <h3 id="about-me-dismissed-heading">${DISMISSED_HEADING}</h3>
          ${dismissed.length === 0 ? html`<p>${NOTHING_DISMISSED_TEXT}</p>`
    : html`<ul class="aboutMeFactList" role="list">${dismissed.map(renderDismissed)}</ul>`}
        </section>
      </div>
      <div class="dialogFooter">
        <button type="button" onClick=${props.onRequestClose}>${CLOSE_LABEL}</button>
      </div>
    <//>
  `;
}
