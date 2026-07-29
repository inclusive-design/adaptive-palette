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

import { render, screen } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { html } from "htm/preact";

import { initAdaptivePaletteGlobals, changeEncodingContents } from "./GlobalData";
import { sentenceCompletionsSignal } from "./telegraphicTranslationState";
import { CommandClearEncoding } from "./CommandClearEncoding";

describe("CommandClearEncoding render tests", (): void => {

  const TEST_CELL_ID = "command-del-last-encoding";
  const testCell = {
    options: {
      "label": "Clear",
      "composition": 1532,
      "rowStart": 2,
      "rowSpan": 1,
      "columnStart": 14,
      "columnSpan": 1,
      "ariaControls": "content-area"
    }
  };

  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  });

  test("CommandClearEncoding rendering", async (): Promise<void> => {

    render(html`
      <${CommandClearEncoding}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );

    // Check the rendered cell
    const button = await screen.findByRole("button", {name: testCell.options.label});

    // Check that the CommandClearEncoding/button is rendered and has the correct
    // attributes and text.
    expect(button).toBeVisible();
    expect(button).toBeValid();
    expect(button.id).toBe(TEST_CELL_ID);
    expect(button.getAttribute("class")).toBe("btn-command");
    expect(button.textContent).toBe(testCell.options.label);

    // Check the grid cell styles.
    expect(button.style.getPropertyValue("grid-column")).toBe("14 / span 1");
    expect(button.style.getPropertyValue("grid-row")).toBe("2 / span 1");

    // Check aria-controls
    expect(button.getAttribute("aria-controls")).toBe(testCell.options.ariaControls);

    // Check disabled state (should be enabled)
    expect(button.getAttribute("disabled")).toBe(null);
  });

  test("clearing the message also discards any sentences made from it", async (): Promise<void> => {
    changeEncodingContents.value = {
      payloads: [{ label: "hungry", composition: [124], modifierInfo: [] }],
      caretPosition: 1
    };
    sentenceCompletionsSignal.value = {
      status: "ready",
      sentences: ["I am hungry."],
      model: "phony-model:12b",
      telegraphicMessage: "hungry"
    };

    render(html`
      <${CommandClearEncoding}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );
    await userEvent.click(await screen.findByRole("button", { name: testCell.options.label }));

    expect(changeEncodingContents.value.payloads).toEqual([]);
    expect(sentenceCompletionsSignal.value).toEqual({ status: "idle" });
  });

});
