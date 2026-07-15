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

vi.mock("./IndicatorLabels", () => ({
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
    expect(updated.indicatorInfo).toStrictEqual([testCell.options.composition]);
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
        indicatorInfo: [97],
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
      expect.objectContaining({ baseLabel: "help", indicatorInfo: [testCell.options.composition] }),
      testCell.options.composition
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

});
