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
import { ActionPostModifierCell } from "./ActionPostModifierCell";

describe("ActionPostModifierCell render tests", (): void => {

  const TEST_CELL_ID = "uuid-for-premodifier-cell";
  const testCell = {
    options: {
      "label": "intensity",
      "rowStart": "3",
      "rowSpan": "2",
      "columnStart": "2",
      "columnSpan": "1",
      "composition": 401
    }
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  test("Single ActionPostModifierCell rendering, disabled", async (): Promise<void> => {

    render(html`
      <${ActionPostModifierCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );

    // Check the rendered cell
    const button = await screen.findByRole("button", {name: testCell.options.label});

    // Check that the ActionPostModifierCell/button is rendered and has the correct
    // attributes and text.
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(TEST_CELL_ID);
    expect(button.getAttribute("class")).toBe("actionModifierCell");
    expect(button.textContent).toBe(testCell.options.label);

    // Check the grid cell styles.
    expect(button.style.getPropertyValue("grid-column")).toBe("2 / span 1");
    expect(button.style.getPropertyValue("grid-row")).toBe("3 / span 2");

    // Check disabled state. `changeEncodingContents` is initialized
    // with an empty array, hence there should be an `aria-disabled` attribute.
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  test("Single ActionPostModifierCell rendering, enabled", async (): Promise<void> => {

    // Put a symbol into the `changeEncodingContents` (the value of the symbol
    // entry area in the palette display) so the modifier cells will not be
    // disabled when rendered.  All the other properties are tested to make sure
    // that an enabled ActionPostModifierCell otherwise has the same output.
    changeEncodingContents.value = {
      payloads: [{
        label: "speak",
        composition: [ 457, ";", 81 ],
      }],
      caretPosition: 0
    };
    render(html`
      <${ActionPostModifierCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );

    // Check the rendered cell
    let button = await screen.findByRole("button", {name: testCell.options.label});

    // Check that the ActionPostModifierCell/button is rendered and has the correct
    // attributes and text.
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(TEST_CELL_ID);
    expect(button.getAttribute("class")).toBe("actionModifierCell");
    expect(button.textContent).toBe(testCell.options.label);

    // Check the grid cell styles.
    expect(button.style.getPropertyValue("grid-column")).toBe("2 / span 1");
    expect(button.style.getPropertyValue("grid-row")).toBe("3 / span 2");

    // Check disabled state.  `changeEncodingContents` is initialized
    // with a symbol, hence there should be an `aria-disabled` attribute.
    expect(button).toHaveAttribute("aria-disabled", "false");

    // Move the caret to the beginning of th input.  The ActionPostModifierCell
    // should become disabled.
    changeEncodingContents.value = { ...changeEncodingContents.value, caretPosition: -1 };
    button = await screen.findByRole("button", {name: testCell.options.label});
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  test("Applying a post modifier appends its text to the label, not prepends", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [{
        label: "speak",
        composition: 457
      }],
      caretPosition: 0
    };
    render(html`
      <${ActionPostModifierCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );
    const button = await screen.findByRole("button", {name: testCell.options.label});
    fireEvent.click(button);

    expect(changeEncodingContents.value.payloads[0].label).toBe("speak intensity");
  });

});
