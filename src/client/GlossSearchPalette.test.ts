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

import { render, screen } from "@testing-library/preact";
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

  const NO_MATCHES: MatchType[] = [];
  const BARK = "bark";
  const PALETTE_SELECTOR = `[data-palettename='${GLOSS_MATCHES_PALETTE}']`;

  const emptyMatchPalette = {
    name: GLOSS_MATCHES_PALETTE,
    cells: {}
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  // Case 1: no search term; expect nothing rendered.
  test("Render GlossSearchPalette, no search term", () => {
    const { container } = render(html`
      <${GlossSearchPalette}
        matches=${testMatches}
        noSearchTerm=${true}
        searchTerm="" 
      />
    `);
    expect(container).toBeEmptyDOMElement();
  });

  // Case 2: no matches; expect error message rendered.
  test("Render GlossSearchPalette, no matches", () => {
    render(html`
      <${GlossSearchPalette}
        matches=${NO_MATCHES}
        noSearchTerm=${false}
        searchTerm="" 
      />
    `);

    const statusMessage = screen.getByRole("status");
    expect(statusMessage).toBeInTheDocument();
    expect(statusMessage).toHaveTextContent("No matches found");
  });

  // Case 3: there are matches, expect palette rendered
  test("Render GlossSearchPalette with matches", () => {
    const { container } = render(html`
      <${GlossSearchPalette}
        matches=${testMatches}
        noSearchTerm=${false}
        searchTerm=${BARK} 
      />
    `);

    const resultsPalette = container.querySelector(PALETTE_SELECTOR);
    expect(resultsPalette).toBeInTheDocument();
    
    // Ensure the "No matches" text is NOT present
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  // Test makeMatchesPalette()
  test("makeMatchesPalette(), empty matches array", () => {
    const matchesPalette = makeMatchesPalette([], BARK, 1, 1);
    expect(matchesPalette).toEqual(emptyMatchPalette);
  });

  test("makeMatchesPalette(), searching for 'bark'", () => {
    interface ExpectedCellShape {
      type: string;
      options: {
        label: string;
        bciAvId: number;
        rowStart: number;
        rowSpan: 1,
        columnStart: number;
        columnSpan: 1
      }
    };

    const matchesPalette = makeMatchesPalette(testMatches, BARK, 1, 1);
    
    expect(matchesPalette).not.toBeNull();
    expect(matchesPalette.name).toEqual(GLOSS_MATCHES_PALETTE);

    const cellKeys = Object.keys(matchesPalette.cells);
    expect(cellKeys.length).toBe(testMatches.length);
    
    // Validate first cell
    const firstCell = matchesPalette.cells[cellKeys[0]] as ExpectedCellShape; 
    
    expect(cellKeys[0].startsWith(BARK)).toBe(true);
    expect(firstCell.type).toEqual("ActionGlossSearchCell");
    expect(firstCell.options.label).toEqual(`${BARK}: ${testMatches[0].label}`);
    
    // Validate positioning logic (startRow: 1, startCol: 1)
    expect(firstCell.options.rowStart).toBe(1);
    expect(firstCell.options.columnStart).toBe(1);

    // Validate second cell increments column correctly
    const secondCell = matchesPalette.cells[cellKeys[1]] as ExpectedCellShape;
    expect(secondCell.options.rowStart).toBe(1);
    expect(secondCell.options.columnStart).toBe(2);
  });
});
