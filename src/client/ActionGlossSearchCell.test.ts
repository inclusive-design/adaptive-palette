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
import { ActionGlossSearchCell } from "./ActionGlossSearchCell";

describe("ActionGlossSearchCell render tests", (): void => {

  const BCI_TREE_BARK = 22311;

  // 1. Made ID unique to text search
  const TEXT_SEARCH_CELL_ID = "text-search-uuid"; 
  const TEXT_SEARCH_LABEL = "bark: bark";
  const TEXT_SEARCH_PROPOSED_GLOSS = "bark"; 

  const textSearchCellProps = {
    id: TEXT_SEARCH_CELL_ID,
    options: {
      "label": TEXT_SEARCH_LABEL,
      "rowStart": "3",
      "rowSpan": "2",
      "columnStart": "2",
      "columnSpan": "1",
      "bciAvId": BCI_TREE_BARK
    }
  };

  // 2. Made ID unique to BCI search
  const BCI_SEARCH_CELL_ID = "bci-search-uuid";
  const BCI_SEARCH_LABEL = "22311: bark";
  const BCI_SEARCH_PROPOSED_GLOSS = " bark";

  const bciSearchCellProps = {
    id: BCI_SEARCH_CELL_ID,
    options: {
      "label": BCI_SEARCH_LABEL,
      "rowStart": "3",
      "rowSpan": "2",
      "columnStart": "2",
      "columnSpan": "1",
      "bciAvId": BCI_TREE_BARK
    }
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  test("ActionGlossSearchCell rendering with text search", async(): Promise<void> => {

    render(html`
      <${ActionGlossSearchCell}
        id="${textSearchCellProps.id}"
        options=${textSearchCellProps.options}
      />`
    );

    // Check the rendered cell
    const button = await screen.findByRole("button", { name: TEXT_SEARCH_LABEL });

    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(TEXT_SEARCH_CELL_ID);
    expect(button).not.toBeDisabled();

    // Check parent class using jest-dom
    const divCell = button.parentElement as HTMLElement;
    expect(divCell).toHaveClass("actionGlossSearchCell");

    const inputElement = screen.getByLabelText(/Label:/i) as HTMLInputElement;
    
    expect(inputElement).toBeVisible();
    expect(inputElement).toBeValid();
    expect(inputElement).toHaveValue(TEXT_SEARCH_PROPOSED_GLOSS);
  });

  test("ActionGlossSearchCell rendering with BCI AV ID search", (): void => {

    render(html`
      <${ActionGlossSearchCell}
        id="${bciSearchCellProps.id}"
        options=${bciSearchCellProps.options}
      />`
    );

    const button = screen.getByRole("button", { name: BCI_SEARCH_LABEL });

    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(BCI_SEARCH_CELL_ID);
    expect(button).not.toBeDisabled();

    const divCell = button.parentElement as HTMLElement;
    expect(divCell).toHaveClass("actionGlossSearchCell");

    const inputElement = screen.getByLabelText(/Label:/i) as HTMLInputElement;    
    expect(inputElement).toBeVisible();
    expect(inputElement).toBeValid();
    expect(inputElement).toHaveValue(BCI_SEARCH_PROPOSED_GLOSS);
  });

});
