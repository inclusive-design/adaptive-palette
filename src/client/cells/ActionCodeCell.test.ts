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

import { changeEncodingContents } from "../state/GlobalData";
import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { ActionCodeCell } from "./ActionCodeCell";
import { expectCellRendered } from "../testUtils/CellAssertions";

describe("ActionCodeCell", (): void => {

  const TEST_CELL_ID = "uuid-of-some-kind";
  const testCell = {
    options: {
      "label": "Bliss Language",
      "rowStart": 3,
      "rowSpan": 2,
      "columnStart": 2,
      "columnSpan": 1,
      "composition": [ 106, "/", 12 ]   // VERB+EN (IDs for bciAvIds 12335, 8499)
    }
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  test("renders at its grid position", async (): Promise<void> => {

    render(html`
      <${ActionCodeCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );

    const button = await expectCellRendered(TEST_CELL_ID, testCell.options, "ActionCodeCell");

    // Check disabled state (should be enabled)
    expect(button.getAttribute("disabled")).toBe(null);

    // Check that SVG is rendered (composition field must be set; bciAvId would leave it undefined)
    const svgElement = button.querySelector("svg");
    expect(svgElement).not.toBe(null);
  });

  test("a numeric composition sets userSelectedSymbolId on click", async (): Promise<void> => {
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

  test("an array composition leaves userSelectedSymbolId undefined on click", async (): Promise<void> => {
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

  test("a single-number array composition sets userSelectedSymbolId on click", async (): Promise<void> => {
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
