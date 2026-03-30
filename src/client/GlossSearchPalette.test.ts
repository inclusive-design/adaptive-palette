/*
 * Copyright 2026 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { render } from "@testing-library/preact";
import "@testing-library/jest-dom";
import { html } from "htm/preact";

import { initAdaptivePaletteGlobals } from "./GlobalData";
import { MatchType } from "./index.d";
import {
  GlossSearchPalette, GLOSS_MATCHES_PALETTE, makeMatchesPalette
} from "./GlossSearchPalette";

describe("GlossSearchPalette tests", (): void => {

  const testMatches: MatchType[] = [
    {
      bciAvId: 22311,
      label: "bark",
      composition: [16420, "/", 17783 ],
      fullComposition: undefined
    }, {
      bciAvId: 24020,
      label: "bark-(to)",
      composition: [15666, ";", 8993, "/", 12380 ],
      fullComposition: undefined
    }
  ];
  const SEARCH_GLOSS_ID = "searchGlossResults";
  const NO_MATCHES: MatchType[] = [];
  const HAS_NO_SEARCH_TERM: boolean = true;
  const EMPTY_SEARCH_TEXT = "";
  const BARK = "bark";
  const PALETTE_SELECTOR = `[data-palettename='${GLOSS_MATCHES_PALETTE}']`;

  const emptyMatchPalette = {
    "name": GLOSS_MATCHES_PALETTE,
    "cells": {}
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  // Case 1: no search term; expect nothing rendered.
  test("Render GlossSearchPalette, no search term", async (): Promise<void> => {
    render(html`
      <div id="${SEARCH_GLOSS_ID}">
        <${GlossSearchPalette}
          matches=${testMatches}
          noSearchTerm=${HAS_NO_SEARCH_TERM}
          searchTerm=${EMPTY_SEARCH_TEXT} />
      </div>
    `);
    const resultsDiv = document.getElementById(SEARCH_GLOSS_ID) as HTMLElement;
    expect(resultsDiv).toBeInTheDocument();
    const resultsPalette = document.querySelector(PALETTE_SELECTOR) as HTMLElement;
    expect(resultsPalette).not.toBeInTheDocument();
  });

  // Case 2: no matches; expect error message paragraph (how to test?)
  test("Render GlossSearchPalette, no matches", async (): Promise<void> => {
    render(html`
      <div id="${SEARCH_GLOSS_ID}">
        <${GlossSearchPalette}
          matches=${NO_MATCHES}
          noSearchTerm=${!HAS_NO_SEARCH_TERM}
          searchTerm=${EMPTY_SEARCH_TEXT} />
      </div>
    `);
    const resultsDiv = document.getElementById(SEARCH_GLOSS_ID) as HTMLElement;
    expect(resultsDiv).toBeInTheDocument();

    const resultsPalette = document.querySelector(PALETTE_SELECTOR) as HTMLElement;
    expect(resultsPalette).not.toBeInTheDocument();

    expect(resultsDiv.children.length).toBe(1);
    const errorMsgParagraph = resultsDiv.children.item(0) as HTMLElement;
    expect(errorMsgParagraph).toBeInTheDocument();
    expect(errorMsgParagraph.tagName).toBe("P");
  });

  // Case 3: there are matches, expect palette rendered (how to test?)
  test("Render GlossSearchPalette with matches", async (): Promise<void> => {

    render(html`
      <div id="${SEARCH_GLOSS_ID}">
        <${GlossSearchPalette}
          matches=${testMatches}
          noSearchTerm=${!HAS_NO_SEARCH_TERM}
          searchTerm=${BARK} />
      </div>
    `);
    const resultsDiv = document.getElementById(SEARCH_GLOSS_ID) as HTMLElement;
    expect(resultsDiv).toBeInTheDocument();
    const resultsPalette = document.querySelector(PALETTE_SELECTOR) as HTMLElement;
    expect(resultsPalette).toBeInTheDocument();
  });

  // Test makeMatchesPalette()
  test ("makeMatchesPalette(), empty matches array", async(): Promise<void> => {
    const matchesPalette = makeMatchesPalette([], BARK, 1, 1);
    expect(matchesPalette).toEqual(emptyMatchPalette);
  });

  test ("makeMatchesPalette(), searching for 'bark'", async(): Promise<void> =>{
    const matchesPalette = makeMatchesPalette(testMatches, BARK, 1, 1);
    expect(matchesPalette).not.toBeNull();
    expect(matchesPalette.name).toEqual(GLOSS_MATCHES_PALETTE);

    const cellKeys = Object.keys(matchesPalette.cells);
    expect(cellKeys).not.toBeNull();
    expect(cellKeys.length).toBe(testMatches.length);
    cellKeys.forEach( (key) => {
      expect(key.startsWith(BARK)).toBe(true);
      const theCell = matchesPalette.cells[key];
      expect(theCell.type).toEqual("ActionGlossSearchCell");
    });
  });
});
