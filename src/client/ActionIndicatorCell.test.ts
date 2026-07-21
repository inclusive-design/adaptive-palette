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

import { initAdaptivePaletteGlobals, changeEncodingContents } from "./GlobalData";
import { ActionIndicatorCell } from "./ActionIndicatorCell";
import * as IndicatorLabels from "./IndicatorLabelsUtils";

vi.mock("./IndicatorLabelsUtils", () => ({
  initIndicatorLabels: vi.fn().mockResolvedValue(undefined),
  getNewLabel: vi.fn()
}));

const mockedGetNewLabel = vi.mocked(IndicatorLabels.getNewLabel);

describe("ActionIndicatorCell render tests", (): void => {

  const TEST_CELL_ID = "uuid-for-indicator-cell";
  const testCell = {
    options: {
      "label": "Plural",
      "rowStart": "3",
      "rowSpan": "2",
      "columnStart": "2",
      "columnSpan": "1",
      "composition": 99
    }
  };

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  beforeEach((): void => {
    mockedGetNewLabel.mockReset();
  });

  test("Single ActionIndicatorCell rendering, disabled", async (): Promise<void> => {

    render(html`
      <${ActionIndicatorCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );

    // Check the rendered cell
    const button = await screen.findByRole("button", {name: testCell.options.label});

    // Check that the ActionIndicatorCell/button is rendered and has the correct
    // attributes and text.
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(TEST_CELL_ID);
    expect(button.getAttribute("class")).toBe("actionIndicatorCell");
    expect(button.textContent).toBe(testCell.options.label);

    // Check the grid cell styles.
    expect(button.style.getPropertyValue("grid-column")).toBe("2 / span 1");
    expect(button.style.getPropertyValue("grid-row")).toBe("3 / span 2");

    // Check disabled state.  `changeEncodingContents` is initialized
    // with an empty array, hence there should be a `disabled` attribute.
    expect(button.getAttribute("disabled")).toBeDefined();
  });

  test("Single ActionIndicatorCell rendering, enabled", async (): Promise<void> => {

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

    render(html`
      <${ActionIndicatorCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );

    // Check the rendered cell
    let button = await screen.findByRole("button", {name: testCell.options.label});

    // Check that the ActionIndicatorCell/button is rendered and has the correct
    // attributes and text.
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(TEST_CELL_ID);
    expect(button.getAttribute("class")).toBe("actionIndicatorCell");
    expect(button.textContent).toBe(testCell.options.label);

    // Check the grid cell styles.
    expect(button.style.getPropertyValue("grid-column")).toBe("2 / span 1");
    expect(button.style.getPropertyValue("grid-row")).toBe("3 / span 2");

    // Check disabled state. `changeEncodingContents` is initialized
    // with an empty array, hence there should be a `disabled` attribute.
    expect(button.getAttribute("disabled")).toBeNull();

    // Move the caret to the beginning of the input.  The ActionIndicatorCell
    // should become disabled.
    changeEncodingContents.value.caretPosition = -1;
    button = await screen.findByRole("button", {name: testCell.options.label});
    expect(button.getAttribute("disabled")).toBeDefined();
  });

  test("Applying an indicator resolves a new label from the pregenerated tier and updates label + indicatorInfo", async (): Promise<void> => {
    mockedGetNewLabel.mockResolvedValue("helper");

    changeEncodingContents.value = {
      payloads: [{
        label: "help",
        composition: 382,
        userSelectedSymbolId: 382
      }],
      caretPosition: 0
    };

    render(html`
      <${ActionIndicatorCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );
    const button = await screen.findByRole("button", {name: testCell.options.label});
    fireEvent.click(button);

    await waitFor(() => {
      expect(changeEncodingContents.value.payloads[0].label).toBe("helper");
    });

    const updated = changeEncodingContents.value.payloads[0];
    expect(updated.indicatorInfo).toBe(testCell.options.composition);
    expect(updated.baseLabel).toBe("help");
    expect(updated.userSelectedSymbolId).toBe(382);
  });

  test("Replacing an indicator derives the prompt from baseLabel, not the swapped label", async (): Promise<void> => {
    mockedGetNewLabel.mockResolvedValue("aided");

    changeEncodingContents.value = {
      payloads: [{
        label: "helper",
        baseLabel: "help",
        composition: [382, ";", 97],
        indicatorInfo: 97,
        userSelectedSymbolId: 382
      }],
      caretPosition: 0
    };

    render(html`
      <${ActionIndicatorCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );
    const button = await screen.findByRole("button", {name: testCell.options.label});
    fireEvent.click(button);

    await waitFor(() => {
      expect(changeEncodingContents.value.payloads[0].label).toBe("aided");
    });

    expect(mockedGetNewLabel).toHaveBeenCalledWith(
      382,          // userSelectedSymbolId preserved from the original symbol
      "helper",     // current (pre-swap) label
      "help",       // baseLabel preserved, not overwritten by the swapped label
      testCell.options.composition   // indicatorId (99) -- the indicator being applied
    );
    expect(changeEncodingContents.value.payloads[0].baseLabel).toBe("help");
  });

  test("Symbol without userSelectedSymbolId leaves the label unchanged when Ollama is off", async (): Promise<void> => {
    mockedGetNewLabel.mockResolvedValue(undefined);

    changeEncodingContents.value = {
      payloads: [{
        label: "hand-built",
        composition: [1, "/", 2]
      }],
      caretPosition: 0
    };

    render(html`
      <${ActionIndicatorCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );
    const button = await screen.findByRole("button", {name: testCell.options.label});
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockedGetNewLabel).toHaveBeenCalledTimes(1);
    });
    expect(changeEncodingContents.value.payloads[0].label).toBe("hand-built");
  });

  test("Composition and indicatorInfo update synchronously before the label resolves", async (): Promise<void> => {
    let resolveGetNewLabel: (value: string | undefined) => void;
    mockedGetNewLabel.mockImplementation(() => new Promise((resolve) => {
      resolveGetNewLabel = resolve;
    }));

    changeEncodingContents.value = {
      payloads: [{
        label: "help",
        composition: 382,
        userSelectedSymbolId: 382
      }],
      caretPosition: 0
    };

    render(html`
      <${ActionIndicatorCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );
    const button = await screen.findByRole("button", {name: testCell.options.label});
    fireEvent.click(button);

    // The glyph (composition/indicatorInfo) must update immediately -- before
    // getNewLabel resolves. The label catches up once it does.
    await waitFor(() => {
      expect(changeEncodingContents.value.payloads[0].indicatorInfo).toBe(testCell.options.composition);
    });
    expect(changeEncodingContents.value.payloads[0].composition).toStrictEqual([382, ";", testCell.options.composition]);
    expect(changeEncodingContents.value.payloads[0].label).toBe("help");

    resolveGetNewLabel!("helper");
    await waitFor(() => {
      expect(changeEncodingContents.value.payloads[0].label).toBe("helper");
    });
  });

  test("A resolution from a superseded indicator click is dropped once a different indicator has been applied", async (): Promise<void> => {
    let resolveFirst: (value: string | undefined) => void;
    let resolveSecond: (value: string | undefined) => void;
    mockedGetNewLabel
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));

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
    await waitFor(() => expect(mockedGetNewLabel).toHaveBeenCalledTimes(1));
    fireEvent.click(buttonB);   // click B: applies indicator 100 before A resolves
    await waitFor(() => expect(mockedGetNewLabel).toHaveBeenCalledTimes(2));

    const compositionAfterB = changeEncodingContents.value.payloads[0].composition;

    resolveFirst!("A-result");
    // Let A's promise settle without a synchronous way to observe it.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(changeEncodingContents.value.payloads[0].label).toBe("help");   // A's result dropped
    expect(changeEncodingContents.value.payloads[0].composition).toStrictEqual(compositionAfterB);

    resolveSecond!("B-result");
    await waitFor(() => {
      expect(changeEncodingContents.value.payloads[0].label).toBe("B-result");
    });
  });

  test("Applying an indicator after a modifier keeps the modifier's text in the resolved label", async (): Promise<void> => {
    mockedGetNewLabel.mockResolvedValue("walked");

    changeEncodingContents.value = {
      payloads: [{
        label: "big walk",
        composition: [368, "/", 382],
        userSelectedSymbolId: 382,
        modifierInfo: [{ modifierId: [368], modifierGloss: "big", isPrepended: true }]
      }],
      caretPosition: 0
    };

    render(html`
      <${ActionIndicatorCell}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );
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

});
