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
import { render, screen, fireEvent } from "@testing-library/preact";
import "@testing-library/jest-dom";
import { html } from "htm/preact";

import { initAdaptivePaletteGlobals, changeEncodingContents } from "./GlobalData";
import { ActionRemoveModifierCell } from "./ActionRemoveModifierCell";

describe("ActionRemoveModifierCell render tests", (): void => {

  const TEST_CELL_ID = "uuid-remove-modifier-cell";
  const testCell = {
    options: {
      "label": "remove a modifier",
      "rowStart": "3",
      "rowSpan": "2",
      "columnStart": "2",
      "columnSpan": "1",
      "bciAvId": 17448
    }
  };

  // The structure of these objects is what is added to or removed from the
  // `changeEncodingContents` signal value
  const blissWordNoModifier = {
    id: "another-fake-id",
    label: "lonely",
    bciAvId: [ 14164, ";", 8998, "/", 15474, "/", 16161 ],
    modifierInfo: []
  };
  const blissWordWithPreModifier = {
    id: "yet-another-fake-id",
    label: "flame",
    bciAvId: [ 15972, "/", 14183 ],
    modifierInfo: [{
      modifierId: [ 15972 ],
      modifierGloss: "part of",
      isPrepended: true
    }]
  };
  const bciAvIdAfterPreModifierRemoval = [ 14183 ];
  const blissWordPrePostModifiers = {
    id: "still-yet-another-fake-id",
    label: "stupid",
    bciAvId: [ 15927, "/", 15471, ";", 8998, "/", 14947 ],
    modifierInfo: [
      {
        modifierId: [ 15927 ],
        modifierGloss: "opposite of",
        isPrepended: true
      }, {
        modifierId: [ 14947 ],
        modifierGloss: "intensity",
        isPrepended: false
      }
    ]
  };
  const bciAvIdAfterOneModifierRemoved = [ 15927, "/", 15471, ";", 8998 ];
  const bciAvIdAfterBothModifiersRemoved = [ 15471, ";", 8998 ];

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  test("ActionRemoveModifierCell rendering, disabled", async (): Promise<void> => {

    render(html`
      <${ActionRemoveModifierCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );

    // Check the rendered cell
    const removeModifierButton = await screen.findByRole("button", {name: testCell.options.label});

    // Check that the ActionRemoveModifierCell/button is rendered and has the correct
    // attributes and text.
    expect(removeModifierButton).toBeVisible();
    expect(removeModifierButton).toBeValid();
    expect(removeModifierButton.id).toBe(TEST_CELL_ID);
    expect(removeModifierButton.getAttribute("class")).toBe("actionIndicatorCell");
    expect(removeModifierButton.textContent).toBe(testCell.options.label);

    // Check the grid cell styles.
    expect(removeModifierButton.style["grid-column"]).toBe("2 / span 1");
    expect(removeModifierButton.style["grid-row"]).toBe("3 / span 2");

    // Check disabled state.  `changeEncodingContents` is initialized
    // with an empty array, hence there should be a `disabled` attribute.
    expect(removeModifierButton.getAttribute("disabled")).toBeDefined();
  });

  test("ActionRemoveModifierCell rendering, still disabled", async (): Promise<void> => {

    // Put a symbol into the `changeEncodingContents` that has no
    // modifier.  The rendered `ActionRemoveModifierCell` should remain
    // disabled since there is no modifier to remove.
    changeEncodingContents.value = {
      payloads: [blissWordNoModifier],
      caretPosition: 0
    };
    render(html`
      <${ActionRemoveModifierCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );
    const removeModifierButton = await screen.findByRole("button", {name: testCell.options.label});
    expect(removeModifierButton).toBeVisible();
    expect(removeModifierButton).toBeValid();
    expect(removeModifierButton.id).toBe(TEST_CELL_ID);
    expect(removeModifierButton.getAttribute("disabled")).toBeDefined();
  });

  test("ActionRemoveModifierCell rendering, enabled (prepended modifier)", async (): Promise<void> => {

    // Add a symbol *with* a prepended modifier and render the ActionRemoveModifierCell.
    const newContents = changeEncodingContents.value.payloads;
    newContents.push(blissWordWithPreModifier);
    changeEncodingContents.value = {
      payloads: newContents,
      caretPosition: newContents.length - 1
    };
    render(html`
      <${ActionRemoveModifierCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );
    // Check that the ActionRemoveModifierCell/button is now enabled
    // since the last symbol in the encoding array has a modifier.
    const removeModifierButton = await screen.findByRole("button", {name: testCell.options.label});
    expect(removeModifierButton).toBeVisible();
    expect(removeModifierButton).toBeValid();
    expect(removeModifierButton.id).toBe(TEST_CELL_ID);
    expect(removeModifierButton.getAttribute("disabled")).toBeNull();
  });

  test("ActionRemoveModifierCell rendering, enabled then disabled after removing prepended modifier", async (): Promise<void> => {

    // Add two symbols, the last one with a modifier and render the
    // ActionRemoveModifierCell.
    const newContents = changeEncodingContents.value.payloads;
    newContents.push(blissWordNoModifier);
    newContents.push(blissWordWithPreModifier);
    changeEncodingContents.value = {
      payloads: newContents,
      caretPosition: newContents.length - 1
    };
    render(html`
      <${ActionRemoveModifierCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );
    // Check that the ActionRemoveModifierCell/button is now enabled since the last
    // symbol in the encoding array has a modifier.
    const removeModifierButton = await screen.findByRole("button", {name: testCell.options.label});
    expect(removeModifierButton.getAttribute("disabled")).toBeNull();

    // Remove the modifier from the last bliss-word and check that the
    // `ActionRemoveModifierCell` is now disabled, and that the last symbol no longer
    // has a modifier.
    fireEvent.click(removeModifierButton);
    expect(removeModifierButton.getAttribute("disabled")).toBeDefined();
    const lastSymbol = changeEncodingContents.value.payloads[changeEncodingContents.value.payloads.length-1];
    expect(lastSymbol.bciAvId).toStrictEqual(bciAvIdAfterPreModifierRemoval);
  });

  test("ActionRemoveModifierCell rendering, enabled then disabled after removing prepended and appended modifiers", async (): Promise<void> => {

    // Add two symbols, the last one with a modifier and render the
    // ActionRemoveModifierCell.
    const newContents = changeEncodingContents.value.payloads;
    newContents.push(blissWordNoModifier);
    newContents.push(blissWordPrePostModifiers);
    changeEncodingContents.value = {
      payloads: newContents,
      caretPosition: newContents.length - 1
    };
    render(html`
      <${ActionRemoveModifierCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );
    // Check that the ActionRemoveModifierCell/button is now enabled since the last
    // symbol in the encoding array has a modifier.
    const removeModifierButton = await screen.findByRole("button", {name: testCell.options.label});
    expect(removeModifierButton.getAttribute("disabled")).toBeNull();

    // Remove one modifier from the last bliss-word and check that the
    // `ActionRemoveModifierCell` is still enabled since the symbol still has a
    // modifier.
    fireEvent.click(removeModifierButton);
    expect(removeModifierButton.getAttribute("disabled")).toBeNull();
    let lastSymbol = changeEncodingContents.value.payloads[changeEncodingContents.value.payloads.length-1];
    expect(lastSymbol.bciAvId).toStrictEqual(bciAvIdAfterOneModifierRemoved);

    // Remove the last modifier.  Now the `ActionRemoveModifierCell` should be
    // disabled.  Check that the symbol itself no longer has any modifiers.
    fireEvent.click(removeModifierButton);
    expect(removeModifierButton.getAttribute("disabled")).toBeDefined();
    lastSymbol = changeEncodingContents.value.payloads[changeEncodingContents.value.payloads.length-1];
    expect(lastSymbol.bciAvId).toStrictEqual(bciAvIdAfterBothModifiersRemoved);
  });
});

