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
import { screen, fireEvent, waitFor } from "@testing-library/preact";

import { adaptivePaletteGlobals, changeEncodingContents, wordBuildSignal } from "../state/GlobalData";
import { setEditGuard } from "../core/MessageEdit";
import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { queryChat } from "../core/OllamaApi";
import { renderCell, expectCellRendered } from "../testUtils/CellTestUtils";
import { ActionIndicatorCell } from "./ActionIndicatorCell";
import { aiSuggestionLabel } from "../components/AiBadge";
import { resetSymbolLabelsForTests } from "../utils/SymbolLabelUtils";
import { mockedAnnounceIfEnabled, mockedSpeakUnavailable } from "../testUtils/SpeechUtilsMock";
import { languageSignal } from "../i18n/I18n";
import type { SymbolEncodingType } from "../index.d";

vi.mock("../core/OllamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../core/OllamaApi")>();
  return { ...actual, queryChat: vi.fn() };
});

vi.mock("../utils/SpeechUtils");

const mockedQueryChat = vi.mocked(queryChat);

describe("ActionIndicatorCell", (): void => {

  const TEST_CELL_ID = "uuid-for-indicator-cell";
  const testCell = {
    options: {
      "label": "Plural",
      "rowStart": 3,
      "rowSpan": 2,
      "columnStart": 2,
      "columnSpan": 1,
      "composition": 99
    }
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  const cell: SymbolEncodingType = { label: "cell", composition: 823, userSelectedSymbolId: 823, modifierInfo: [] };
  const opposite = { modifierId: [486], modifierGloss: "opposite of", isPrepended: true };
  const symbol = (): SymbolEncodingType => changeEncodingContents.value.payloads[0];
  const setMessage = (payload: SymbolEncodingType): void => {
    changeEncodingContents.value = { payloads: [payload], caretPosition: 0 };
  };
  const renderButton = async (): Promise<HTMLElement> => {
    renderCell(ActionIndicatorCell, TEST_CELL_ID, testCell.options);
    return screen.findByRole("button", { name: testCell.options.label });
  };
  const askModel = (): void => {
    adaptivePaletteGlobals.models = ["phony-model:12b"];
  };
  const replyWith = (content: string): void => {
    mockedQueryChat.mockResolvedValue({ message: { content } } as Awaited<ReturnType<typeof queryChat>>);
  };

  beforeEach((): void => {
    resetSymbolLabelsForTests();
    mockedQueryChat.mockReset();
    // The model is asked only in the tests that say so.
    adaptivePaletteGlobals.models = [];
    adaptivePaletteGlobals.indicatorLabels = { en: { "823_99": "cells" }, sv: { "823_99": "bilagor" } };
    adaptivePaletteGlobals.config.markAiSuggestions = true;
    adaptivePaletteGlobals.config.labelLookup = {
      useModelQueryFallback: true, model: "phony-model:12b", systemPrompt: "Answer with the label.",
      userPrompt: "Word: \"{{word}}\"\nModifiers, in order: {{modifiers}}\nIndicator: {{indicator}}"
    };
  });

  afterEach((): void => {
    setEditGuard(null);
    languageSignal.value = "en";
    wordBuildSignal.value = null;
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  test("is unavailable while the input area is empty", async (): Promise<void> => {

    renderCell(ActionIndicatorCell, TEST_CELL_ID, testCell.options);

    const button = await expectCellRendered(TEST_CELL_ID, testCell.options, "actionIndicatorCell");

    // Check disabled state.  `changeEncodingContents` is initialized
    // with an empty array, hence there should be an `aria-disabled` attribute.
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  test("is available with a symbol at the caret, and unavailable once the caret moves off it", async (): Promise<void> => {

    // Put a symbol into the `changeEncodingContents` (the value of the symbol
    // entry area in the palette display) so the indicator cells will not be
    // disabled when rendered.  All the other properties are tested to make sure
    // that an enabled ActionIndicatorCell otherwise has the same output.
    changeEncodingContents.value = {
      payloads: [{
        label: "opposite",
        composition: 486
      }],
      caretPosition: 0  // put the caret on the symbol above
    };

    renderCell(ActionIndicatorCell, TEST_CELL_ID, testCell.options);

    let button = await expectCellRendered(TEST_CELL_ID, testCell.options, "actionIndicatorCell");

    // Check disabled state. `changeEncodingContents` is initialized
    // with an empty array, hence there should be an `aria-disabled` attribute.
    expect(button).toHaveAttribute("aria-disabled", "false");

    // Move the caret to the beginning of the input.  The ActionIndicatorCell
    // should become disabled.
    changeEncodingContents.value = { ...changeEncodingContents.value, caretPosition: -1 };
    button = await screen.findByRole("button", {name: testCell.options.label});
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  test("An indicator lands on the base symbol after a multi-symbol prefix modifier", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [{
        label: "similar feeling help",
        composition: [2404, "/", 374, "/", 382],
        userSelectedSymbolId: 382,
        modifierInfo: [{ modifierId: [2404, "/", 374], modifierGloss: "similar feeling", isPrepended: true }]
      }],
      caretPosition: 0
    };

    renderCell(ActionIndicatorCell, TEST_CELL_ID, testCell.options);
    const button = await screen.findByRole("button", {name: testCell.options.label});
    fireEvent.click(button);

    await waitFor(() => {
      expect(changeEncodingContents.value.payloads[0].indicatorId).toBe(testCell.options.composition);
    });
    expect(changeEncodingContents.value.payloads[0].composition).toStrictEqual(
      [2404, "/", 374, "/", 382, ";", testCell.options.composition]
    );
  });

  test("An indicator lands on the base symbol after stacked prefix modifiers", async (): Promise<void> => {
    // "without" added after "similar feeling": the newest prefix comes first.
    changeEncodingContents.value = {
      payloads: [{
        label: "without similar feeling help",
        composition: [449, "/", 2404, "/", 374, "/", 382],
        userSelectedSymbolId: 382,
        modifierInfo: [
          { modifierId: [2404, "/", 374], modifierGloss: "similar feeling", isPrepended: true },
          { modifierId: [449], modifierGloss: "without", isPrepended: true }
        ]
      }],
      caretPosition: 0
    };

    renderCell(ActionIndicatorCell, TEST_CELL_ID, testCell.options);
    const button = await screen.findByRole("button", {name: testCell.options.label});
    fireEvent.click(button);

    await waitFor(() => {
      expect(changeEncodingContents.value.payloads[0].indicatorId).toBe(testCell.options.composition);
    });
    expect(changeEncodingContents.value.payloads[0].composition).toStrictEqual(
      [449, "/", 2404, "/", 374, "/", 382, ";", testCell.options.composition]
    );
  });

  test("clicking while unavailable leaves the input untouched and is announced", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [{ label: "building", composition: 392 }],
      caretPosition: -1
    };
    const before = JSON.stringify(changeEncodingContents.value);

    renderCell(ActionIndicatorCell, TEST_CELL_ID, testCell.options);

    const button = await screen.findByRole("button", { name: testCell.options.label });
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);

    expect(JSON.stringify(changeEncodingContents.value)).toBe(before);
    // The button keeps `aria-disabled` rather than `disabled`, so it can be focused and
    // activated. Speech is the main feedback channel and must not go silent.
    expect(mockedSpeakUnavailable).toHaveBeenCalledWith(testCell.options.label);
  });

  test("is unavailable with a picture at the caret, and a click leaves the input untouched", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [{ label: "bread", picture: "/pictures/bread.jpg", modifierInfo: [] }],
      caretPosition: 0
    };
    const before = JSON.stringify(changeEncodingContents.value);

    renderCell(ActionIndicatorCell, TEST_CELL_ID, testCell.options);

    const button = await screen.findByRole("button", { name: testCell.options.label });
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);

    expect(JSON.stringify(changeEncodingContents.value)).toBe(before);
    expect(mockedSpeakUnavailable).toHaveBeenCalledWith(testCell.options.label);
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });


  test("is unavailable while a word is being built, and a click leaves the input untouched", async (): Promise<void> => {
    changeEncodingContents.value = { payloads: [{ label: "opposite", composition: 486 }], caretPosition: 0 };
    wordBuildSignal.value = { message: { payloads: [], caretPosition: -1 }, combine: false };
    const before = JSON.stringify(changeEncodingContents.value);

    renderCell(ActionIndicatorCell, TEST_CELL_ID, testCell.options);

    const button = await screen.findByRole("button", { name: testCell.options.label });
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);

    expect(JSON.stringify(changeEncodingContents.value)).toBe(before);
    expect(mockedSpeakUnavailable).toHaveBeenCalledWith(testCell.options.label);
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  test("a label in the table is applied and spoken at once, with no query", async (): Promise<void> => {
    askModel();
    setMessage(cell);
    fireEvent.click(await renderButton());

    expect(symbol()).toMatchObject({
      label: "cells", baseLabel: "cell", indicatorId: 99, isAiLabel: false, composition: [823, ";", 99]
    });
    expect(symbol()).not.toHaveProperty("pendingLabel");
    expect(mockedAnnounceIfEnabled).toHaveBeenCalledWith("cells");
    expect(mockedQueryChat).not.toHaveBeenCalled();
  });

  test("looks the label up with the UI in Swedish too", async (): Promise<void> => {
    languageSignal.value = "sv";
    setMessage(cell);
    fireEvent.click(await renderButton());
    expect(symbol().label).toBe("bilagor");
  });

  test("with no table entry, the label waits for the model and the indicator is named", async (): Promise<void> => {
    askModel();
    adaptivePaletteGlobals.indicatorLabels = { en: {} };
    mockedQueryChat.mockReturnValue(new Promise<never>(() => undefined));
    setMessage(cell);
    fireEvent.click(await renderButton());

    expect(symbol().label).toBe("cell");
    expect(symbol().pendingLabel).toBeDefined();
    expect(mockedAnnounceIfEnabled).toHaveBeenCalledWith(`cell, ${testCell.options.label}`);
    expect(mockedQueryChat.mock.calls[0][0]).toContain("Indicator: plural");
  });

  test("the model's answer replaces the label, marked as AI, and nothing more is spoken", async (): Promise<void> => {
    askModel();
    adaptivePaletteGlobals.indicatorLabels = { en: {} };
    replyWith("cells");
    setMessage(cell);
    fireEvent.click(await renderButton());

    await waitFor(() => expect(symbol().label).toBe("cells"));
    expect(symbol().isAiLabel).toBe(true);
    expect(symbol()).not.toHaveProperty("pendingLabel");
    expect(mockedAnnounceIfEnabled).toHaveBeenCalledTimes(1);
  });

  test("an answer the model already gave is applied and spoken as the model's at once", async (): Promise<void> => {
    askModel();
    adaptivePaletteGlobals.indicatorLabels = { en: {} };
    replyWith("cells");
    setMessage(cell);
    const button = await renderButton();
    fireEvent.click(button);
    await waitFor(() => expect(symbol().label).toBe("cells"));

    fireEvent.click(button);
    expect(mockedAnnounceIfEnabled).toHaveBeenLastCalledWith(aiSuggestionLabel("cells"));
    expect(mockedQueryChat).toHaveBeenCalledTimes(1);
  });

  test("with the marking off, a model label is still recorded but spoken plainly", async (): Promise<void> => {
    adaptivePaletteGlobals.config.markAiSuggestions = false;
    askModel();
    adaptivePaletteGlobals.indicatorLabels = { en: {} };
    replyWith("cells");
    setMessage(cell);
    const button = await renderButton();
    fireEvent.click(button);
    await waitFor(() => expect(symbol().label).toBe("cells"));

    fireEvent.click(button);
    expect(symbol().isAiLabel).toBe(true);
    expect(mockedAnnounceIfEnabled).toHaveBeenLastCalledWith("cells");
  });

  test("with the model unusable and no table entry, the label stays and the indicator is named", async (): Promise<void> => {
    adaptivePaletteGlobals.indicatorLabels = { en: {} };
    setMessage(cell);
    fireEvent.click(await renderButton());

    expect(symbol()).toMatchObject({ label: "cell", isAiLabel: false });
    expect(symbol()).not.toHaveProperty("pendingLabel");
    expect(mockedAnnounceIfEnabled).toHaveBeenCalledWith(`cell, ${testCell.options.label}`);
    expect(mockedQueryChat).not.toHaveBeenCalled();
  });

  test("a symbol with a modifier asks the model, showing the text joined to the table's label", async (): Promise<void> => {
    askModel();
    mockedQueryChat.mockReturnValue(new Promise<never>(() => undefined));
    setMessage({ ...cell, label: "opposite of cell", baseLabel: "cell", composition: [486, "/", 823], modifierInfo: [opposite] });
    fireEvent.click(await renderButton());

    expect(symbol()).toMatchObject({ label: "opposite of cells", composition: [486, "/", 823, ";", 99] });
    expect(symbol().pendingLabel).toBeDefined();
    expect(mockedQueryChat.mock.calls[0][0]).toContain("Modifiers, in order: opposite of (before)");
  });

  test("replacing an indicator works the label out from the base label", async (): Promise<void> => {
    setMessage({ ...cell, label: "attach", baseLabel: "cell", composition: [823, ";", 81], indicatorId: 81 });
    fireEvent.click(await renderButton());
    expect(symbol()).toMatchObject({ label: "cells", baseLabel: "cell", indicatorId: 99, composition: [823, ";", 99] });
  });

  // The guard holds the edit to ask whether it may discard the user's sentences. Naming the new
  // label would name a word that is nowhere in the message.
  test("a relabel the guard holds is not announced as the new label", async (): Promise<void> => {
    setMessage(cell);
    const button = await renderButton();
    setEditGuard(() => true);
    fireEvent.click(button);

    expect(mockedAnnounceIfEnabled).toHaveBeenCalledWith(`cell, ${testCell.options.label}`);
    expect(mockedAnnounceIfEnabled).not.toHaveBeenCalledWith("cells");
    expect(symbol().label).toBe("cell");
  });
});
