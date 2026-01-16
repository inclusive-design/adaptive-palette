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

  const TEXT_SEARCH_CELL_ID = "bark-uuid-of-some-kind";
  const TEXT_SEARCH_LABEL = "bark: bark";
  const BCI_TREE_BARK = 22311;
  const TEXT_SEARCH_ACTUAL_LABEL = `${BCI_TREE_BARK}: bark`;
  const TEXT_SEARCH_INPUT_ID = `input-${TEXT_SEARCH_CELL_ID}`;
  const TEXT_SEARCH_PROPOSED_GLOSS = " bark";

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

  const BCI_SEARCH_CELL_ID = "bark-uuid-of-some-kind";
  const BCI_SEARCH_LABEL = "22311: bark";
  const BCI_SEARCH_INPUT_ID = `input-${BCI_SEARCH_CELL_ID}`;
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

  test("ActionGlossSearchCell rendering with text search", async (): Promise<void> => {

    render(html`
      <${ActionGlossSearchCell}
        id="${bciSearchCellProps.id}"
        options=${bciSearchCellProps.options}
      />`
    );

    // Check the rendered cell
    const button = await screen.findByRole("button", {name: TEXT_SEARCH_ACTUAL_LABEL});

    // Check that the ActionGlossSearchCell/button is rendered and has the correct
    // attributes and text.
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(TEXT_SEARCH_CELL_ID);
    expect(button.getAttribute("disabled")).toBe(null);

    const divCell = button.parentElement as HTMLElement;
    expect(divCell.getAttribute("class")).toBe("actionGlossSearchCell");

    const inputElement = document.getElementById(TEXT_SEARCH_INPUT_ID) as HTMLInputElement;
    expect(inputElement).toBeVisible();
    expect(inputElement).toBeValid();
    expect(inputElement.value).toEqual(TEXT_SEARCH_PROPOSED_GLOSS);
  });

  test("ActionGlossSearchCell rendering with BCI AV ID search", async (): Promise<void> => {

    render(html`
      <${ActionGlossSearchCell}
        id="${textSearchCellProps.id}"
        options=${textSearchCellProps.options}
      />`
    );

    // Check the rendered cell
    const button = await screen.findByRole("button", {name: BCI_SEARCH_LABEL});

    // Check that the ActionGlossSearchCell/button is rendered and has the correct
    // attributes and text.
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(BCI_SEARCH_CELL_ID);
    expect(button.getAttribute("disabled")).toBe(null);

    const divCell = button.parentElement as HTMLElement;
    expect(divCell.getAttribute("class")).toBe("actionGlossSearchCell");

    const inputElement = document.getElementById(BCI_SEARCH_INPUT_ID) as HTMLInputElement;
    expect(inputElement).toBeVisible();
    expect(inputElement).toBeValid();
    expect(inputElement.value).toEqual(BCI_SEARCH_PROPOSED_GLOSS);
  });

});
