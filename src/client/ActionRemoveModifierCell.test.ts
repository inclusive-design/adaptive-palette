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
      "composition": 2505
    }
  };

  // The structure of these objects is what is added to or removed from the
  // `changeEncodingContents` signal value
  const blissWordNoModifier = {
    label: "lonely",
    composition: [ 313, ";", 86, "/", 449, "/", 513 ],
    modifierInfo: []
  };
  const blissWordWithPreModifier = {
    label: "flame",
    composition: [ 15972, "/", 319 ],
    modifierInfo: [{
      modifierId: [ 15972 ],
      modifierGloss: "part of",
      isPrepended: true
    }]
  };
  const compositionAfterPreModifierRemoval = [ 319 ];
  const blissWordPrePostModifiers = {
    label: "angry",
    composition: [ 368, "/", 313, ";", 86, "/", 487 ],
    modifierInfo: [
      {
        modifierId: [368 ],
        modifierGloss: "group of",
        isPrepended: true
      }, {
        modifierId: [ 487 ],
        modifierGloss: "opposition",
        isPrepended: false
      }
    ]
  };
  const compositionAfterOneModifierRemoved = [368, "/", 313, ";", 86 ];
  const compositionAfterBothModifiersRemoved = [313, ";", 86 ];
  const blissWordModifierThenIndicator = {
    label: "big walked",
    baseLabel: "big walk",
    baseModifierCount: 1,
    composition: [ 368, "/", 382, ";", 97 ],
    indicatorId: 97,
    modifierInfo: [{ modifierId: [368], modifierGloss: "big", isPrepended: true }],
    userSelectedSymbolId: 382
  };
  const blissWordIndicatorThenModifier = {
    label: "big walked",
    baseLabel: "walk",
    baseModifierCount: 0,
    composition: [ 368, "/", 382, ";", 97 ],
    indicatorId: 97,
    modifierInfo: [{ modifierId: [368], modifierGloss: "big", isPrepended: true }],
    userSelectedSymbolId: 382
  };

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
    expect(removeModifierButton.style.getPropertyValue("grid-column")).toBe("2 / span 1");
    expect(removeModifierButton.style.getPropertyValue("grid-row")).toBe("3 / span 2");

    // Check disabled state.  `changeEncodingContents` is initialized
    // with an empty array, hence there should be an `aria-disabled` attribute.
    expect(removeModifierButton).toHaveAttribute("aria-disabled", "true");
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
    expect(removeModifierButton).toHaveAttribute("aria-disabled", "true");
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
    expect(removeModifierButton).toHaveAttribute("aria-disabled", "false");
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
    expect(removeModifierButton).toHaveAttribute("aria-disabled", "false");

    // Remove the modifier from the last bliss-word and check that the
    // `ActionRemoveModifierCell` is now disabled, and that the last symbol no longer
    // has a modifier.
    fireEvent.click(removeModifierButton);
    expect(removeModifierButton).toHaveAttribute("aria-disabled", "true");
    const lastSymbol = changeEncodingContents.value.payloads[changeEncodingContents.value.payloads.length-1];
    expect(lastSymbol.composition).toStrictEqual(compositionAfterPreModifierRemoval);
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
    expect(removeModifierButton).toHaveAttribute("aria-disabled", "false");

    // Remove one modifier from the last bliss-word and check that the
    // `ActionRemoveModifierCell` is still enabled since the symbol still has a
    // modifier.
    fireEvent.click(removeModifierButton);
    expect(removeModifierButton).toHaveAttribute("aria-disabled", "false");
    let lastSymbol = changeEncodingContents.value.payloads[changeEncodingContents.value.payloads.length-1];
    expect(lastSymbol.composition).toStrictEqual(compositionAfterOneModifierRemoved);

    // Remove the last modifier.  Now the `ActionRemoveModifierCell` should be
    // disabled.  Check that the symbol itself no longer has any modifiers.
    fireEvent.click(removeModifierButton);
    expect(removeModifierButton).toHaveAttribute("aria-disabled", "true");
    lastSymbol = changeEncodingContents.value.payloads[changeEncodingContents.value.payloads.length-1];
    expect(lastSymbol.composition).toStrictEqual(compositionAfterBothModifiersRemoved);
  });

  test("ActionRemoveModifierCell keeps baseLabel/baseModifierCount in sync when removing a modifier that predates an applied indicator", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [blissWordModifierThenIndicator],
      caretPosition: 0
    };
    render(html`
      <${ActionRemoveModifierCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );
    const removeModifierButton = await screen.findByRole("button", {name: testCell.options.label});
    expect(removeModifierButton).toHaveAttribute("aria-disabled", "false");

    fireEvent.click(removeModifierButton);

    const updated = changeEncodingContents.value.payloads[0];
    expect(updated.label).toBe("walked");
    expect(updated.baseLabel).toBe("walk");
    expect(updated.baseModifierCount).toBe(0);
  });

  test("ActionRemoveModifierCell leaves baseLabel/baseModifierCount untouched when removing a modifier that postdates an applied indicator", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [blissWordIndicatorThenModifier],
      caretPosition: 0
    };
    render(html`
      <${ActionRemoveModifierCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );
    const removeModifierButton = await screen.findByRole("button", {name: testCell.options.label});
    expect(removeModifierButton).toHaveAttribute("aria-disabled", "false");

    fireEvent.click(removeModifierButton);

    const updated = changeEncodingContents.value.payloads[0];
    expect(updated.label).toBe("walked");
    expect(updated.baseLabel).toBe("walk");
    expect(updated.baseModifierCount).toBe(0);
  });
});
