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
import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { html } from "htm/preact";

import { changeEncodingContents } from "../state/GlobalData";
import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { renderCell, expectCellRendered } from "../testUtils/CellTestUtils";
import { ActionIndicatorCell } from "./ActionIndicatorCell";
import * as IndicatorLabels from "../utils/IndicatorLabelsUtils";
import { mockedAnnounceIfEnabled, mockedSpeakUnavailable } from "../testUtils/SpeechUtilsMock";

vi.mock("../utils/IndicatorLabelsUtils", () => ({
  initIndicatorLabels: vi.fn().mockResolvedValue(undefined),
  getStaticNewLabel: vi.fn(),
  getNewLabelViaModelQuery: vi.fn()
}));

vi.mock("../utils/SpeechUtils");

const mockedGetStaticNewLabel = vi.mocked(IndicatorLabels.getStaticNewLabel);
const mockedGetNewLabelViaModelQuery = vi.mocked(IndicatorLabels.getNewLabelViaModelQuery);

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

  beforeEach((): void => {
    mockedGetStaticNewLabel.mockReset().mockReturnValue(undefined);
    mockedGetNewLabelViaModelQuery.mockReset().mockReturnValue({ status: "not-viable" });
    mockedAnnounceIfEnabled.mockReset();
    mockedSpeakUnavailable.mockReset();
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

  test("Tier 1 (pregenerated) hit: applies and speaks the label immediately", async (): Promise<void> => {
    mockedGetStaticNewLabel.mockReturnValue("helper");

    changeEncodingContents.value = {
      payloads: [{
        label: "help",
        composition: 382,
        userSelectedSymbolId: 382
      }],
      caretPosition: 0
    };

    renderCell(ActionIndicatorCell, TEST_CELL_ID, testCell.options);
    const button = await screen.findByRole("button", {name: testCell.options.label});
    fireEvent.click(button);

    await waitFor(() => {
      expect(changeEncodingContents.value.payloads[0].label).toBe("helper");
    });

    const updated = changeEncodingContents.value.payloads[0];
    expect(updated.indicatorId).toBe(testCell.options.composition);
    expect(updated.baseLabel).toBe("help");
    expect(updated.userSelectedSymbolId).toBe(382);
    expect(mockedGetNewLabelViaModelQuery).not.toHaveBeenCalled();
    expect(mockedAnnounceIfEnabled).toHaveBeenCalledWith("helper");
  });

  test("Replacing an indicator derives the prompt from baseLabel, not the swapped label", async (): Promise<void> => {
    mockedGetStaticNewLabel.mockReturnValue("aided");

    changeEncodingContents.value = {
      payloads: [{
        label: "helper",
        baseLabel: "help",
        composition: [382, ";", 97],
        indicatorId: 97,
        userSelectedSymbolId: 382
      }],
      caretPosition: 0
    };

    renderCell(ActionIndicatorCell, TEST_CELL_ID, testCell.options);
    const button = await screen.findByRole("button", {name: testCell.options.label});
    fireEvent.click(button);

    await waitFor(() => {
      expect(changeEncodingContents.value.payloads[0].label).toBe("aided");
    });

    expect(mockedGetStaticNewLabel).toHaveBeenCalledWith(
      382,          // userSelectedSymbolId preserved from the original symbol
      testCell.options.composition   // indicatorId (99) -- the indicator being applied
    );
    expect(changeEncodingContents.value.payloads[0].baseLabel).toBe("help");
  });

  test("Not viable (Ollama off, no static hit): speaks the unchanged message immediately, label stays", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [{
        label: "hand-built",
        composition: [1, "/", 2]
      }],
      caretPosition: 0
    };

    renderCell(ActionIndicatorCell, TEST_CELL_ID, testCell.options);
    const button = await screen.findByRole("button", {name: testCell.options.label});
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockedGetNewLabelViaModelQuery).toHaveBeenCalledTimes(1);
    });
    expect(changeEncodingContents.value.payloads[0].label).toBe("hand-built");
    expect(mockedAnnounceIfEnabled).toHaveBeenCalledWith(`hand-built, ${testCell.options.label}`);
  });

  test("Cached model-query result with a label: speaks and applies it immediately, no loading message", async (): Promise<void> => {
    mockedGetNewLabelViaModelQuery.mockReturnValue({ status: "cached", label: "cells" });

    changeEncodingContents.value = {
      payloads: [{
        label: "cell",
        composition: [823],
        userSelectedSymbolId: 823
      }],
      caretPosition: 0
    };

    renderCell(ActionIndicatorCell, TEST_CELL_ID, testCell.options);
    const button = await screen.findByRole("button", {name: testCell.options.label});
    fireEvent.click(button);

    await waitFor(() => {
      expect(changeEncodingContents.value.payloads[0].label).toBe("cells");
    });
    expect(mockedAnnounceIfEnabled).toHaveBeenCalledTimes(1);   // no loading message
    expect(mockedAnnounceIfEnabled).toHaveBeenCalledWith("cells");
  });

  test("Cached model-query result with no label: speaks the unchanged message immediately, label stays", async (): Promise<void> => {
    mockedGetNewLabelViaModelQuery.mockReturnValue({ status: "cached", label: undefined });

    changeEncodingContents.value = {
      payloads: [{
        label: "cell",
        composition: [823],
        userSelectedSymbolId: 823
      }],
      caretPosition: 0
    };

    renderCell(ActionIndicatorCell, TEST_CELL_ID, testCell.options);
    const button = await screen.findByRole("button", {name: testCell.options.label});
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockedAnnounceIfEnabled).toHaveBeenCalledWith(`cell, ${testCell.options.label}`);
    });
    expect(changeEncodingContents.value.payloads[0].label).toBe("cell");
  });

  test("Pending model query: speaks the loading message immediately, then the resolved label once it settles", async (): Promise<void> => {
    let resolveQuery: (value: string | undefined) => void;
    mockedGetNewLabelViaModelQuery.mockReturnValue({
      status: "pending",
      promise: new Promise((resolve) => { resolveQuery = resolve; })
    });

    changeEncodingContents.value = {
      payloads: [{
        label: "walk",
        composition: [382],
        userSelectedSymbolId: 382
      }],
      caretPosition: 0
    };

    renderCell(ActionIndicatorCell, TEST_CELL_ID, testCell.options);
    const button = await screen.findByRole("button", {name: testCell.options.label});
    fireEvent.click(button);

    // The loading message is spoken immediately, before the query resolves.
    await waitFor(() => {
      expect(mockedAnnounceIfEnabled).toHaveBeenCalledWith(`walk, ${testCell.options.label} loading new label`);
    });
    expect(changeEncodingContents.value.payloads[0].label).toBe("walk");

    resolveQuery!("walked");
    await waitFor(() => {
      expect(changeEncodingContents.value.payloads[0].label).toBe("walked");
    });
    expect(mockedAnnounceIfEnabled).toHaveBeenCalledWith("walked");
  });

  test("Pending model query that fails: speaks the loading message, then the unchanged message as closure", async (): Promise<void> => {
    let resolveQuery: (value: string | undefined) => void;
    mockedGetNewLabelViaModelQuery.mockReturnValue({
      status: "pending",
      promise: new Promise((resolve) => { resolveQuery = resolve; })
    });

    changeEncodingContents.value = {
      payloads: [{
        label: "walk",
        composition: [382],
        userSelectedSymbolId: 382
      }],
      caretPosition: 0
    };

    renderCell(ActionIndicatorCell, TEST_CELL_ID, testCell.options);
    const button = await screen.findByRole("button", {name: testCell.options.label});
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockedAnnounceIfEnabled).toHaveBeenCalledWith(`walk, ${testCell.options.label} loading new label`);
    });

    resolveQuery!(undefined);
    await waitFor(() => {
      expect(mockedAnnounceIfEnabled).toHaveBeenCalledWith(`walk, ${testCell.options.label}`);
    });
    expect(changeEncodingContents.value.payloads[0].label).toBe("walk");
  });

  test("Composition and indicatorId update synchronously before a pending label resolves", async (): Promise<void> => {
    let resolveQuery: (value: string | undefined) => void;
    mockedGetNewLabelViaModelQuery.mockReturnValue({
      status: "pending",
      promise: new Promise((resolve) => { resolveQuery = resolve; })
    });

    changeEncodingContents.value = {
      payloads: [{
        label: "help",
        composition: 382,
        userSelectedSymbolId: 382
      }],
      caretPosition: 0
    };

    renderCell(ActionIndicatorCell, TEST_CELL_ID, testCell.options);
    const button = await screen.findByRole("button", {name: testCell.options.label});
    fireEvent.click(button);

    // The glyph (composition/indicatorId) must update immediately -- before
    // the model query resolves. The label catches up once it does.
    await waitFor(() => {
      expect(changeEncodingContents.value.payloads[0].indicatorId).toBe(testCell.options.composition);
    });
    expect(changeEncodingContents.value.payloads[0].composition).toStrictEqual([382, ";", testCell.options.composition]);
    expect(changeEncodingContents.value.payloads[0].label).toBe("help");

    resolveQuery!("helper");
    await waitFor(() => {
      expect(changeEncodingContents.value.payloads[0].label).toBe("helper");
    });
  });

  test("A resolution from a superseded indicator click is dropped once a different indicator has been applied", async (): Promise<void> => {
    let resolveFirst: (value: string | undefined) => void;
    let resolveSecond: (value: string | undefined) => void;
    mockedGetNewLabelViaModelQuery
      .mockImplementationOnce(() => ({ status: "pending", promise: new Promise((resolve) => { resolveFirst = resolve; }) }))
      .mockImplementationOnce(() => ({ status: "pending", promise: new Promise((resolve) => { resolveSecond = resolve; }) }));

    changeEncodingContents.value = {
      payloads: [{
        label: "help",
        composition: 382,
        userSelectedSymbolId: 382
      }],
      caretPosition: 0
    };

    const otherCell = {
      options: { ...testCell.options, label: "Other indicator", composition: 100 }
    };

    render(html`
      <${ActionIndicatorCell} id="cell-a" options=${testCell.options} />
      <${ActionIndicatorCell} id="cell-b" options=${otherCell.options} />
    `);

    const buttonA = await screen.findByRole("button", {name: testCell.options.label});
    const buttonB = await screen.findByRole("button", {name: otherCell.options.label});

    fireEvent.click(buttonA);   // click A: applies indicator 99
    await waitFor(() => expect(mockedGetNewLabelViaModelQuery).toHaveBeenCalledTimes(1));
    // Click A's own immediate ("loading") announcement fires before it can be superseded.
    expect(mockedAnnounceIfEnabled).toHaveBeenCalledWith(`help, ${testCell.options.label} loading new label`);

    fireEvent.click(buttonB);   // click B: applies indicator 100 before A resolves
    await waitFor(() => expect(mockedGetNewLabelViaModelQuery).toHaveBeenCalledTimes(2));
    expect(mockedAnnounceIfEnabled).toHaveBeenCalledWith(`help, ${otherCell.options.label} loading new label`);

    const compositionAfterB = changeEncodingContents.value.payloads[0].composition;

    resolveFirst!("A-result");
    // Let A's promise settle without a synchronous way to observe it.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(changeEncodingContents.value.payloads[0].label).toBe("help");   // A's result dropped
    expect(changeEncodingContents.value.payloads[0].composition).toStrictEqual(compositionAfterB);
    expect(mockedAnnounceIfEnabled).not.toHaveBeenCalledWith("A-result");

    resolveSecond!("B-result");
    await waitFor(() => {
      expect(changeEncodingContents.value.payloads[0].label).toBe("B-result");
    });
  });

  test("A pending label resolves even if a modifier changes the composition of the same slot first", async (): Promise<void> => {
    let resolveQuery: (value: string | undefined) => void;
    mockedGetNewLabelViaModelQuery.mockReturnValue({
      status: "pending",
      promise: new Promise((resolve) => { resolveQuery = resolve; })
    });

    changeEncodingContents.value = {
      payloads: [{
        label: "help",
        composition: 382,
        userSelectedSymbolId: 382
      }],
      caretPosition: 0
    };

    renderCell(ActionIndicatorCell, TEST_CELL_ID, testCell.options);
    const button = await screen.findByRole("button", {name: testCell.options.label});
    fireEvent.click(button);

    await waitFor(() => {
      expect(changeEncodingContents.value.payloads[0].indicatorId).toBe(testCell.options.composition);
    });

    // A modifier is applied to the same slot before the indicator's label resolves.
    // It rewrites `composition` and `label` but preserves `indicatorId`, since the
    // indicator itself is still applied.
    const current = changeEncodingContents.value.payloads[0];
    changeEncodingContents.value = {
      payloads: [{
        ...current,
        label: "big help",
        composition: [368, "/", ...(current.composition as (string|number)[])]
      }],
      caretPosition: 0
    };

    resolveQuery!("helper");
    // The resolved label must still be applied -- not silently dropped -- even though
    // `composition` changed after the indicator click. The modifier's own composition
    // and label edits made in the meantime are preserved.
    await waitFor(() => {
      expect(changeEncodingContents.value.payloads[0].label).toBe("helper");
    });
    expect(changeEncodingContents.value.payloads[0].composition).toStrictEqual([368, "/", 382, ";", testCell.options.composition]);
  });

  test("Applying an indicator after a modifier keeps the modifier's text in the resolved label", async (): Promise<void> => {
    mockedGetStaticNewLabel.mockReturnValue("walked");

    changeEncodingContents.value = {
      payloads: [{
        label: "big walk",
        composition: [368, "/", 382],
        userSelectedSymbolId: 382,
        modifierInfo: [{ modifierId: [368], modifierGloss: "big", isPrepended: true }]
      }],
      caretPosition: 0
    };

    renderCell(ActionIndicatorCell, TEST_CELL_ID, testCell.options);
    const button = await screen.findByRole("button", {name: testCell.options.label});
    fireEvent.click(button);

    await waitFor(() => {
      expect(changeEncodingContents.value.payloads[0].label).toBe("big walked");
    });
    expect(changeEncodingContents.value.payloads[0].baseLabel).toBe("big walk");
    expect(changeEncodingContents.value.payloads[0].composition).toStrictEqual(
      [368, "/", 382, ";", testCell.options.composition]
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

});
