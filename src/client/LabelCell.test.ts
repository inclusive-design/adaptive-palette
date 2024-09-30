/*
 * Copyright 2024 Inclusive Design Research Centre, OCAD University
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
import { LabelCell } from "./LabelCell";

describe("LabelCell render tests", (): void => {

  const LABEL_CELL_ID = "uuid-of-label-element";
  const testLabelCell = {
    options: {
      "label": "Verbs",
      "rowStart": "3",
      "rowSpan": "2",
      "columnStart": "2",
      "columnSpan": "1",
      "bciAvId": [ 12335, ";", 9011 ]   // Verb with plural indicator
    }
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  test("Label cell rendering", async (): Promise<void> => {

    render(html`
      <${LabelCell}
        id=${LABEL_CELL_ID}
        options=${testLabelCell.options}
      />`
    );

    // Check the rendered cell
    const labelElement = await screen.findByText(testLabelCell.options.label);

    // Check that the LabelCell/labelElement is rendered and has the correct
    // attributes and text.
    expect(labelElement).toBeVisible();
    expect(labelElement).toBeValid();
    expect(labelElement.id).toBe(LABEL_CELL_ID);
    expect(labelElement.getAttribute("class")).toBe("labelCell");

    // Check the grid cell styles.
    expect(labelElement.style["grid-column"]).toBe("2 / span 1");
    expect(labelElement.style["grid-row"]).toBe("3 / span 2");
  });
});
