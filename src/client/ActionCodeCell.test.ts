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

import { render, screen, fireEvent } from "@testing-library/preact";
import { html } from "htm/preact";

import { initAdaptivePaletteGlobals, changeEncodingContents } from "./GlobalData";
import { ActionCodeCell } from "./ActionCodeCell";

describe("ActionCodeCell render tests", (): void => {

  const TEST_CELL_ID = "uuid-of-some-kind";
  const testCell = {
    options: {
      "label": "Bliss Language",
      "rowStart": "3",
      "rowSpan": "2",
      "columnStart": "2",
      "columnSpan": "1",
      "composition": [ 106, "/", 12 ]   // VERB+EN (IDs for bciAvIds 12335, 8499)
    }
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  test("Single ActionCodeCell rendering", async (): Promise<void> => {

    render(html`
      <${ActionCodeCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );

    // Check the rendered cell
    const button = await screen.findByRole("button", {name: testCell.options.label});

    // Check that the ActionCodeCell/button is rendered and has the correct
    // attributes and text.
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(TEST_CELL_ID);
    expect(button.getAttribute("class")).toBe("ActionCodeCell");
    expect(button.textContent).toBe(testCell.options.label);

    // Check the grid cell styles.
    expect(button.style.getPropertyValue("grid-column")).toBe("2 / span 1");
    expect(button.style.getPropertyValue("grid-row")).toBe("3 / span 2");

    // Check disabled state (should be enabled)
    expect(button.getAttribute("disabled")).toBe(null);

    // Check that SVG is rendered (composition field must be set; bciAvId would leave it undefined)
    const svgElement = button.querySelector("svg");
    expect(svgElement).not.toBe(null);
  });

  test("Clicking an ActionCodeCell with a numeric composition sets userSelectedSymbolId", async (): Promise<void> => {
    const numericTestCell = {
      options: {
        "label": "percent",
        "composition": 2
      }
    };
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };

    render(html`
      <${ActionCodeCell}
        id="numeric-cell-uuid"
        options=${numericTestCell.options}
      />`
    );
    const button = await screen.findByRole("button", {name: numericTestCell.options.label});
    fireEvent.click(button);

    expect(changeEncodingContents.value.payloads[0].userSelectedSymbolId).toBe(2);
  });

  test("Clicking an ActionCodeCell with an array composition leaves userSelectedSymbolId undefined", async (): Promise<void> => {
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };

    render(html`
      <${ActionCodeCell}
        id="array-cell-uuid"
        options=${testCell.options}
      />`
    );
    const button = await screen.findByRole("button", {name: testCell.options.label});
    fireEvent.click(button);

    expect(changeEncodingContents.value.payloads[0].userSelectedSymbolId).toBeUndefined();
  });

  test("Clicking an ActionCodeCell with a single-number array composition sets userSelectedSymbolId", async (): Promise<void> => {
    const singleElementArrayTestCell = {
      options: {
        "label": "percent",
        "composition": [ 2 ]
      }
    };
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };

    render(html`
      <${ActionCodeCell}
        id="single-element-array-cell-uuid"
        options=${singleElementArrayTestCell.options}
      />`
    );
    const button = await screen.findByRole("button", {name: singleElementArrayTestCell.options.label});
    fireEvent.click(button);

    expect(changeEncodingContents.value.payloads[0].userSelectedSymbolId).toBe(2);
  });

});
