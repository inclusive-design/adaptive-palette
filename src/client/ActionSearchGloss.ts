/*
 * Copyright 2025-2026 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { VNode } from "preact";
import { useState } from "preact/hooks";
import { html } from "htm/preact";

import { MatchType } from "./index.d";
import { findBciAvId, findCompositionsUsingId } from "./BciAvUtils";
import { GlossSearchPalette } from "./GlossSearchPalette";

export const GLOSS_ENTRY_FIELD_ID = "glossSearchField";
export const SUBMIT_LABEL = "Search";
export const CLEAR_LABEL = "Clear";

export function ActionSearchGloss(): VNode {
  // Use state to track the input and the results
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [matches, setMatches] = useState<MatchType[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const searchGloss = (event: Event) => {
    event.preventDefault();
    
    const text = searchTerm.trim();
    let currentMatches: MatchType[] = [];

    if (text.length > 0) {
      const numberId = Number(text);
      if (isNaN(numberId)) {
        currentMatches = findBciAvId(text);
      } else {
        currentMatches = findCompositionsUsingId(numberId);
      }
    }

    console.debug(`Search term? ${text.length === 0}, found ${currentMatches.length} matches`);
    
    // Update state
    setMatches(currentMatches);
    setHasSearched(true);
  };

  const clearResults = () => {
    // Resetting state automatically updates the UI
    setSearchTerm("");
    setMatches([]);
    setHasSearched(false);
  };

  const onInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    setSearchTerm(target.value);
  };

  return html`
    <div class="searchGlossContainer">
      <form onSubmit=${searchGloss} class="actionSearchGloss">
        <label for=${GLOSS_ENTRY_FIELD_ID}>Search vocabulary: </label>
        <input
          id=${GLOSS_ENTRY_FIELD_ID}
          name=${GLOSS_ENTRY_FIELD_ID}
          type="text"
          value=${searchTerm}
          onInput=${onInput}
          placeholder="Search by gloss or by BCI identifier"
          size="25"
        />
        <input type="submit" value=${SUBMIT_LABEL} />
        <input type="button" value=${CLEAR_LABEL} onClick=${clearResults} />
      </form>

      <!-- 2. Conditionally render the results based on state -->
      ${hasSearched && html`
        <div id="searchGlossResults">
          <${GlossSearchPalette} 
            matches=${matches} 
            noSearchTerm=${searchTerm.trim().length === 0} 
            searchTerm=${searchTerm.trim()} 
          />
        </div>
      `}
    </div>
  `;
}
