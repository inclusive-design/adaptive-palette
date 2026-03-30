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

import { render, VNode } from "preact";
import { html } from "htm/preact";

import { findBciAvId, findCompositionsUsingId } from "./BciAvUtils";
import { GlossSearchPalette } from "./GlossSearchPalette";

export const GLOSS_ENTRY_FIELD_ID = "glossSearchField";
export const SUBMIT_LABEL = "Search";
export const CLEAR_LABEL = "Clear";

export function ActionSearchGloss (): VNode {

  const searchGloss = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const searchText = (formData.get(GLOSS_ENTRY_FIELD_ID) as string).trim();
    let noSearchTerm;
    let matches;
    if (searchText.length === 0) {
      noSearchTerm = true;
      matches = [];
    }
    else {
      noSearchTerm = false;
      const numberId = Number(searchText);
      if (isNaN(numberId)) {
        matches = findBciAvId(searchText);
      }
      else {
        matches = findCompositionsUsingId(numberId);
      }
    }
    console.debug(`Search term? ${noSearchTerm}, found ${matches.length} matches`);
    render(
      html`<${GlossSearchPalette} matches=${matches} noSearchTerm=${noSearchTerm} searchTerm=${searchText} />`,
      document.getElementById("searchGlossResults")
    );
  };

  const clearResults = (event) => {
    event.preventDefault();
    const matches = [];
    const noSearchTerm = true;
    const searchText = "";
    render(
      html`<${GlossSearchPalette} matches=${matches} noSearchTerm=${noSearchTerm} searchTerm=${searchText} />`,
      document.getElementById("searchGlossResults")
    );
    const searchTextEntry = document.getElementById(GLOSS_ENTRY_FIELD_ID) as HTMLInputElement;
    searchTextEntry.value = "";
  };

  return html`
    <form onSubmit=${searchGloss} class="actionSearchGloss">
      <label for=${GLOSS_ENTRY_FIELD_ID}>Search vocabulary: </label>
      <input
        id=${GLOSS_ENTRY_FIELD_ID}
        name=${GLOSS_ENTRY_FIELD_ID}
        type="text"
        placeholder="Search by gloss or by BCI identifier"
        size="25"
      />
      <input type="submit" value=${SUBMIT_LABEL} />
      <input type="button" value=${CLEAR_LABEL} onClick=${clearResults} />
    </form>
  `;
}
