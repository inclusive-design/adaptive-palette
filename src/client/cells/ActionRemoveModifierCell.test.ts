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
import { vi } from "vitest";
import { screen, fireEvent } from "@testing-library/preact";

import { adaptivePaletteGlobals, changeEncodingContents } from "../state/GlobalData";
import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { queryChat } from "../core/OllamaApi";
import { renderCell, expectCellRendered } from "../testUtils/CellTestUtils";
import { ActionRemoveModifierCell } from "./ActionRemoveModifierCell";
import { resetSymbolLabelsForTests } from "../utils/SymbolLabelUtils";
import { mockedSpeakUnavailable } from "../testUtils/SpeechUtilsMock";

vi.mock("../core/OllamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../core/OllamaApi")>();
  return { ...actual, queryChat: vi.fn() };
});

vi.mock("../utils/SpeechUtils");

const mockedQueryChat = vi.mocked(queryChat);

describe("ActionRemoveModifierCell", (): void => {

  const TEST_CELL_ID = "uuid-remove-modifier-cell";
  const testCell = {
    options: {
      "label": "remove a modifier",
      "rowStart": 3,
      "rowSpan": 2,
      "columnStart": 2,
      "columnSpan": 1,
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
  const blissWordWithModifierAndIndicator = {
    label: "big helper",
    baseLabel: "help",
    composition: [ 368, "/", 382, ";", 97 ],
    indicatorId: 97,
    modifierInfo: [{ modifierId: [368], modifierGloss: "big", isPrepended: true }],
    userSelectedSymbolId: 382
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  beforeEach((): void => {
    resetSymbolLabelsForTests();
    mockedQueryChat.mockReset();
    adaptivePaletteGlobals.models = [];
  });

  test("is unavailable while the input area is empty", async (): Promise<void> => {

    renderCell(ActionRemoveModifierCell, TEST_CELL_ID, testCell.options);

    const removeModifierButton = await expectCellRendered(TEST_CELL_ID, testCell.options, "btn-command");

    // Check disabled state.  `changeEncodingContents` is initialized
    // with an empty array, hence there should be an `aria-disabled` attribute.
    expect(removeModifierButton).toHaveAttribute("aria-disabled", "true");
  });

  test("stays unavailable when the symbol has no modifier", async (): Promise<void> => {

    // Put a symbol into the `changeEncodingContents` that has no
    // modifier.  The rendered `ActionRemoveModifierCell` should remain
    // disabled since there is no modifier to remove.
    changeEncodingContents.value = {
      payloads: [blissWordNoModifier],
      caretPosition: 0
    };
    renderCell(ActionRemoveModifierCell, TEST_CELL_ID, testCell.options);
    const removeModifierButton = await screen.findByRole("button", {name: testCell.options.label});
    expect(removeModifierButton).toBeVisible();
    expect(removeModifierButton).toBeValid();
    expect(removeModifierButton.id).toBe(TEST_CELL_ID);
    expect(removeModifierButton).toHaveAttribute("aria-disabled", "true");
  });

  test("becomes available once the symbol has a prepended modifier", async (): Promise<void> => {

    // Add a symbol *with* a prepended modifier and render the ActionRemoveModifierCell.
    // Copied, not pushed onto: what the signal holds is frozen once a click has published it.
    const newContents = [...changeEncodingContents.value.payloads];
    newContents.push(blissWordWithPreModifier);
    changeEncodingContents.value = {
      payloads: newContents,
      caretPosition: newContents.length - 1
    };
    renderCell(ActionRemoveModifierCell, TEST_CELL_ID, testCell.options);
    // Check that the ActionRemoveModifierCell/button is now enabled
    // since the last symbol in the encoding array has a modifier.
    const removeModifierButton = await screen.findByRole("button", {name: testCell.options.label});
    expect(removeModifierButton).toBeVisible();
    expect(removeModifierButton).toBeValid();
    expect(removeModifierButton.id).toBe(TEST_CELL_ID);
    expect(removeModifierButton).toHaveAttribute("aria-disabled", "false");
  });

  test("goes back to unavailable once the prepended modifier is removed", async (): Promise<void> => {

    // Add two symbols, the last one with a modifier and render the
    // ActionRemoveModifierCell.
    // Copied, not pushed onto: what the signal holds is frozen once a click has published it.
    const newContents = [...changeEncodingContents.value.payloads];
    newContents.push(blissWordNoModifier);
    newContents.push(blissWordWithPreModifier);
    changeEncodingContents.value = {
      payloads: newContents,
      caretPosition: newContents.length - 1
    };
    renderCell(ActionRemoveModifierCell, TEST_CELL_ID, testCell.options);
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

  test("goes back to unavailable once both modifiers are removed", async (): Promise<void> => {

    // Add two symbols, the last one with a modifier and render the
    // ActionRemoveModifierCell.
    // Copied, not pushed onto: what the signal holds is frozen once a click has published it.
    const newContents = [...changeEncodingContents.value.payloads];
    newContents.push(blissWordNoModifier);
    newContents.push(blissWordPrePostModifiers);
    changeEncodingContents.value = {
      payloads: newContents,
      caretPosition: newContents.length - 1
    };
    renderCell(ActionRemoveModifierCell, TEST_CELL_ID, testCell.options);
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

  test("removing the last modifier works the label out from the symbol's parts", async (): Promise<void> => {
    adaptivePaletteGlobals.indicatorLabels = { en: { "382_97": "helper" } };
    changeEncodingContents.value = { payloads: [blissWordWithModifierAndIndicator], caretPosition: 0 };
    renderCell(ActionRemoveModifierCell, TEST_CELL_ID, testCell.options);
    fireEvent.click(await screen.findByRole("button", { name: testCell.options.label }));

    expect(changeEncodingContents.value.payloads[0]).toMatchObject({ label: "helper", baseLabel: "help", indicatorId: 97 });
  });

  test("clicking while unavailable leaves the input untouched and is announced", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [{ label: "building", composition: 392 }],
      caretPosition: 0
    };
    const before = JSON.stringify(changeEncodingContents.value);

    renderCell(ActionRemoveModifierCell, TEST_CELL_ID, testCell.options);

    const button = await screen.findByRole("button", { name: testCell.options.label });
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);

    expect(JSON.stringify(changeEncodingContents.value)).toBe(before);
    // The button keeps `aria-disabled` rather than `disabled`, so it can be focused and
    // activated. Speech is the main feedback channel and must not go silent.
    expect(mockedSpeakUnavailable).toHaveBeenCalledWith(testCell.options.label);
  });

  test("is unavailable with a picture at the caret, even one that claims a modifier", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [{
        label: "bread", picture: "/pictures/bread.jpg",
        modifierInfo: [{ modifierId: [14647], modifierGloss: "many", isPrepended: false }]
      }],
      caretPosition: 0
    };
    const before = JSON.stringify(changeEncodingContents.value);

    renderCell(ActionRemoveModifierCell, TEST_CELL_ID, testCell.options);

    const button = await screen.findByRole("button", { name: testCell.options.label });
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);

    expect(JSON.stringify(changeEncodingContents.value)).toBe(before);
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  test("removing a suffix modifier restores the base label", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [{
        label: "phone one",
        baseLabel: "phone",
        composition: [ 8484, "/", 8510 ],
        modifierInfo: [{ modifierId: [8510], modifierGloss: "one", isPrepended: false }]
      }],
      caretPosition: 0
    };
    renderCell(ActionRemoveModifierCell, TEST_CELL_ID, testCell.options);
    const removeModifierButton = await screen.findByRole("button", { name: testCell.options.label });
    fireEvent.click(removeModifierButton);

    expect(changeEncodingContents.value.payloads[0].label).toBe("phone");
  });

  test("removing the modifier turns \"hot\" back into \"cold\", with no query", async (): Promise<void> => {
    adaptivePaletteGlobals.models = ["phony-model:12b"];
    changeEncodingContents.value = {
      payloads: [{
        label: "hot", baseLabel: "cold", composition: [ 486, "/", 1436 ], userSelectedSymbolId: 1436,
        modifierInfo: [{ modifierId: [486], modifierGloss: "opposite of", isPrepended: true }], isAiLabel: true
      }],
      caretPosition: 0
    };
    renderCell(ActionRemoveModifierCell, TEST_CELL_ID, testCell.options);
    fireEvent.click(await screen.findByRole("button", { name: testCell.options.label }));

    expect(changeEncodingContents.value.payloads[0]).toMatchObject({ label: "cold", isAiLabel: false, composition: [1436] });
    expect(changeEncodingContents.value.payloads[0]).not.toHaveProperty("pendingLabel");
    expect(mockedQueryChat).not.toHaveBeenCalled();
  });
});
