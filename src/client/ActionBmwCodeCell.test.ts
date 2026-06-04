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

import { render, screen } from "@testing-library/preact";
import { html } from "htm/preact";

import { initAdaptivePaletteGlobals } from "./GlobalData";
import { ActionBmwCodeCell } from "./ActionBmwCodeCell";

describe("ActionBmwCodeDell render tests", (): void => {

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

  test("Single ActionBmwCodeCell rendering", async (): Promise<void> => {

    render(html`
      <${ActionBmwCodeCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );

    // Check the rendered cell
    const button = await screen.findByRole("button", {name: testCell.options.label});

    // Check that the ActionBmwCodeCell/button is rendered and has the correct
    // attributes and text.
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(TEST_CELL_ID);
    expect(button.getAttribute("class")).toBe("actionBmwCodeCell");
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

});
