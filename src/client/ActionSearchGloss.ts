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
import { useState, useRef } from "preact/hooks";
import { html } from "htm/preact";

import { MatchType, SymbolEncodingType } from "./index.d";
import { findSymbolByGloss } from "./BciAvUtils";
import { changeEncodingContents } from "./GlobalData";
import { speak, insertWordAtCaret } from "./GlobalUtils";
import { GlossSearchResults } from "./GlossSearchResults";
import { MessagePreview } from "./MessagePreview";
import "./ActionSearchGloss.scss";

export const GLOSS_ENTRY_FIELD_ID = "glossSearchField";
export const LABEL_FIELD_ID = "glossSearchLabelField";
export const SEARCH_FIELD_LABEL = "Find a word:";
export const LABEL_FIELD_LABEL = "Label:";
export const SUBMIT_LABEL = "Search";
export const CLEAR_LABEL = "Clear";
export const ADD_LABEL = "Add to message";
export const CLOSE_LABEL = "Close";

type ActionSearchGlossProps = {
  onRequestClose: () => void
};

/**
 * The body of the "Add symbol to message" dialog: search the Bliss vocabulary, pick one
 * result, adjust its label, and add it to the message.
 *
 * The dialog stays open after an add. Reopening it is expensive for a switch or eye-gaze
 * user, and multi-symbol messages are the normal case, so closing after every add would
 * multiply that cost.
 * @param {ActionSearchGlossProps} props - Callback asking the dialog to dismiss.
 * @returns {VNode}
 */
export function ActionSearchGloss (props: ActionSearchGlossProps): VNode {
  const { onRequestClose } = props;
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [matches, setMatches] = useState<MatchType[]>([]);
  const [selected, setSelected] = useState<MatchType | null>(null);
  const [labelDraft, setLabelDraft] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchGloss = (event: Event) => {
    event.preventDefault();

    const text = searchTerm.trim();
    const found: MatchType[] = text.length > 0 ? findSymbolByGloss(text) : [];

    setMatches(found);
    setSelected(null);
    setLabelDraft("");
    setStatus(
      found.length === 0
        ? `No symbols found for "${text}"`
        : `${found.length} symbol${found.length === 1 ? "" : "s"} found for "${text}"`
    );
  };

  const clearResults = () => {
    setSearchTerm("");
    setMatches([]);
    setSelected(null);
    setLabelDraft("");
    setStatus("");
  };

  const selectMatch = (match: MatchType) => {
    setSelected(match);
    setLabelDraft(match.label);
  };

  const addToMessage = () => {
    // The button stays focusable via `aria-disabled`, so the unavailable case is
    // rejected here rather than by the browser.
    if (!selected) {
      return;
    }

    const payload: SymbolEncodingType = {
      label: labelDraft,
      composition: selected.composition ?? selected.id,
      userSelectedSymbolId: selected.id,
      modifierInfo: []
    };
    changeEncodingContents.value = insertWordAtCaret(
      payload,
      changeEncodingContents.value.payloads,
      changeEncodingContents.value.caretPosition
    );

    speak(labelDraft);
    setStatus(`${labelDraft} added to message`);
    // `selected` and `labelDraft` are a pair: every reset path clears both, or the label
    // field is left editable with no selection behind it.
    setSelected(null);
    setLabelDraft("");
    searchInputRef.current?.focus();
  };

  const onSearchInput = (event: Event) => {
    setSearchTerm((event.target as HTMLInputElement).value);
  };

  const onLabelInput = (event: Event) => {
    setLabelDraft((event.target as HTMLInputElement).value);
  };

  return html`
    <div class="actionSearchGloss">
      <form onSubmit=${searchGloss} class="glossSearchForm">
        <label for=${GLOSS_ENTRY_FIELD_ID}>${SEARCH_FIELD_LABEL}</label>
        <input
          ref=${searchInputRef}
          id=${GLOSS_ENTRY_FIELD_ID}
          name=${GLOSS_ENTRY_FIELD_ID}
          type="text"
          value=${searchTerm}
          onInput=${onSearchInput}
          placeholder="Search by gloss"
          size="25"
          autofocus
        />
        <input type="submit" value=${SUBMIT_LABEL} />
        <input type="button" value=${CLEAR_LABEL} onClick=${clearResults} />
      </form>

      <!-- One region carries both the result count and the add confirmation, so two
           announcements cannot race each other after an add. -->
      <p role="status" class="glossSearchStatus">${status}</p>

      <${GlossSearchResults}
        matches=${matches}
        selectedId=${selected ? selected.id : null}
        onSelect=${selectMatch}
      />

      <${MessagePreview} />

      <div class="dialogFooter">
        <label for=${LABEL_FIELD_ID}>${LABEL_FIELD_LABEL}</label>
        <input
          id=${LABEL_FIELD_ID}
          type="text"
          value=${labelDraft}
          onInput=${onLabelInput}
          size="20"
        />
        <button
          type="button"
          class="btn-addToMessage"
          aria-disabled=${selected === null}
          onClick=${addToMessage}>${ADD_LABEL}</button>
        <button type="button" onClick=${onRequestClose}>${CLOSE_LABEL}</button>
      </div>
    </div>
  `;
}
