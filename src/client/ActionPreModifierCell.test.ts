/*
 * Copyright 2025 Inclusive Design Research Centre, OCAD University
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

import { initAdaptivePaletteGlobals, changeEncodingContents } from "./GlobalData";
import { ActionPreModifierCell } from "./ActionPreModifierCell";

describe("ActionPreModifierCell render tests", (): void => {

  const TEST_CELL_ID = "uuid-for-premodifier-cell";
  const testCell = {
    options: {
      "label": "oppposite of",
      "rowStart": "3",
      "rowSpan": "2",
      "columnStart": "2",
      "columnSpan": "1",
      "bciAvId": 15927
    }
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  test("Single ActionPreModifierCell rendering, disabled", async (): Promise<void> => {

    render(html`
      <${ActionPreModifierCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );

    // Check the rendered cell
    const button = await screen.findByRole("button", {name: testCell.options.label});

    // Check that the ActionPreModifierCell/button is rendered and has the correct
    // attributes and text.
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(TEST_CELL_ID);
    expect(button.getAttribute("class")).toBe("actionModifierCell");
    expect(button.textContent).toBe(testCell.options.label);

    // Check the grid cell styles.
    expect(button.style["grid-column"]).toBe("2 / span 1");
    expect(button.style["grid-row"]).toBe("3 / span 2");

    // Check disabled state.  `changeEncodingContents.value` is initialized
    // with an empty array, hence there should be a `disabled` attribute.
    expect(button.getAttribute("disabled")).toBeDefined();
  });

  test("Single ActionPreModifierCell rendering, enabled", async (): Promise<void> => {

    // Put a symbol into the `changeEncodingContents` (the value of the symbol
    // entry area in the palette display) so the modifier cells will not be
    // disabled when rendered.  All the other properties are tested to make sure
    // that an enabled ActionPreModifierCell otherwise has the same output.
    changeEncodingContents.value = [{
      id: "fake-id",
      label: "building",
      bciAvId: 14905
    }];

    render(html`
      <${ActionPreModifierCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );

    // Check the rendered cell
    const button = await screen.findByRole("button", {name: testCell.options.label});

    // Check that the ActionPreModifierCell/button is rendered and has the correct
    // attributes and text.
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(TEST_CELL_ID);
    expect(button.getAttribute("class")).toBe("actionModifierCell");
    expect(button.textContent).toBe(testCell.options.label);

    // Check the grid cell styles.
    expect(button.style["grid-column"]).toBe("2 / span 1");
    expect(button.style["grid-row"]).toBe("3 / span 2");

    // Check disabled state.  `changeEncodingContents.value` is initialized
    // with an empty array, hence there should be a `disabled` attribute.
    expect(button.getAttribute("disabled")).toBeNull();
  });

});
