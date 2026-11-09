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

import { adaptivePaletteGlobals, changeEncodingContents } from "../state/GlobalData";
import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { queryChat } from "../core/OllamaApi";
import { renderCell, expectCellRendered } from "../testUtils/CellTestUtils";
import { ActionPreModifierCell } from "./ActionPreModifierCell";
import { resetSymbolLabelsForTests } from "../utils/SymbolLabelUtils";
import { mockedAnnounceIfEnabled, mockedSpeakUnavailable } from "../testUtils/SpeechUtilsMock";

vi.mock("../core/OllamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../core/OllamaApi")>();
  return { ...actual, queryChat: vi.fn() };
});

vi.mock("../utils/SpeechUtils");

const mockedQueryChat = vi.mocked(queryChat);

describe("ActionPreModifierCell", (): void => {

  const TEST_CELL_ID = "uuid-for-premodifier-cell";
  const testCell = {
    options: {
      "label": "oppposite of",
      "rowStart": 3,
      "rowSpan": 2,
      "columnStart": 2,
      "columnSpan": 1,
      "composition": 486
    }
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  const cold = { label: "cold", composition: 1436, userSelectedSymbolId: 1436, modifierInfo: [] };

  beforeEach((): void => {
    resetSymbolLabelsForTests();
    mockedQueryChat.mockReset();
    // The model is asked only in the tests that say so.
    adaptivePaletteGlobals.models = [];
    adaptivePaletteGlobals.config.labelLookup = {
      useModelQueryFallback: true, model: "phony-model:12b",
      systemPrompt: "Answer with the label.", userPrompt: "Word: \"{{word}}\"\nModifiers, in order: {{modifiers}}"
    };
  });

  test("is unavailable while the input area is empty", async (): Promise<void> => {

    renderCell(ActionPreModifierCell, TEST_CELL_ID, testCell.options);

    const button = await expectCellRendered(TEST_CELL_ID, testCell.options, "actionModifierCell");

    // Check disabled state.  `changeEncodingContents` is initialized
    // with an empty array, hence there should be an `aria-disabled` attribute.
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  test("is available with a symbol at the caret, and unavailable once the caret moves off it", async (): Promise<void> => {

    // Put a symbol into the `changeEncodingContents` (the value of the symbol
    // entry area in the palette display) so the modifier cells will not be
    // disabled when rendered.  All the other properties are tested to make sure
    // that an enabled ActionPreModifierCell otherwise has the same output.
    changeEncodingContents.value = {
      payloads: [{
        label: "building",
        composition: 392
      }],
      caretPosition: 0
    };

    renderCell(ActionPreModifierCell, TEST_CELL_ID, testCell.options);
    let button = await expectCellRendered(TEST_CELL_ID, testCell.options, "actionModifierCell");

    // Check disabled state.  `changeEncodingContents` is initialized
    // with a symbol, hence there should be an `aria-disabled` attribute.
    expect(button).toHaveAttribute("aria-disabled", "false");

    // Move the caret to the beginning of th input.  The ActionPreModifierCell
    // should become disabled.
    changeEncodingContents.value = { ...changeEncodingContents.value, caretPosition: -1 };
    button = await screen.findByRole("button", {name: testCell.options.label});
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  test("applying a pre modifier prepends its text to the label", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [{
        label: "building",
        composition: 392
      }],
      caretPosition: 0
    };
    renderCell(ActionPreModifierCell, TEST_CELL_ID, testCell.options);
    const button = await screen.findByRole("button", {name: testCell.options.label});
    fireEvent.click(button);

    expect(changeEncodingContents.value.payloads[0].label).toBe("oppposite of building");
    expect(changeEncodingContents.value.payloads[0].baseLabel).toBe("building");
  });

  test("with the model asked, the joined text waits for its answer, then becomes it", async (): Promise<void> => {
    adaptivePaletteGlobals.models = ["phony-model:12b"];
    mockedQueryChat.mockResolvedValue({ message: { content: "hot" } } as Awaited<ReturnType<typeof queryChat>>);
    changeEncodingContents.value = { payloads: [cold], caretPosition: 0 };
    renderCell(ActionPreModifierCell, TEST_CELL_ID, testCell.options);
    fireEvent.click(await screen.findByRole("button", { name: testCell.options.label }));

    expect(changeEncodingContents.value.payloads[0]).toMatchObject({ label: "oppposite of cold", baseLabel: "cold" });
    expect(changeEncodingContents.value.payloads[0].pendingLabel).toBeDefined();
    expect(mockedAnnounceIfEnabled).toHaveBeenCalledWith("oppposite of cold");
    await waitFor(() => expect(changeEncodingContents.value.payloads[0]).toMatchObject({ label: "hot", isAiLabel: true }));
  });

  test("a second modifier stops the first query", async (): Promise<void> => {
    adaptivePaletteGlobals.models = ["phony-model:12b"];
    const signals: (AbortSignal | undefined)[] = [];
    mockedQueryChat.mockImplementation((_query, _model, _stream, _system, abortSignal) => {
      signals.push(abortSignal);
      return new Promise<never>(() => undefined);
    });
    changeEncodingContents.value = { payloads: [cold], caretPosition: 0 };
    renderCell(ActionPreModifierCell, TEST_CELL_ID, testCell.options);
    const button = await screen.findByRole("button", { name: testCell.options.label });

    fireEvent.click(button);
    await waitFor(() => expect(mockedQueryChat).toHaveBeenCalledTimes(1));
    fireEvent.click(button);

    expect(signals).toHaveLength(2);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
  });

  // The unavailable guard lives in `ActionModifierCellCommon`, shared with
  // `ActionPostModifierCell`, so it is exercised here only.
  test("clicking while unavailable leaves the input untouched and is announced", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [{ label: "building", composition: 392 }],
      caretPosition: -1
    };
    const before = JSON.stringify(changeEncodingContents.value);

    renderCell(ActionPreModifierCell, TEST_CELL_ID, testCell.options);

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

    renderCell(ActionPreModifierCell, TEST_CELL_ID, testCell.options);

    const button = await screen.findByRole("button", { name: testCell.options.label });
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);

    expect(JSON.stringify(changeEncodingContents.value)).toBe(before);
    expect(mockedSpeakUnavailable).toHaveBeenCalledWith(testCell.options.label);
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });
});
