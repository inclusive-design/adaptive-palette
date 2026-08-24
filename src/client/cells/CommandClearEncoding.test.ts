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

import { screen } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";

import { changeEncodingContents } from "../state/GlobalData";
import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { IDLE_SENTENCE_STATE, sentenceCompletionsSignal } from "../features/telegraphic-translation/TelegraphicTranslationState";
import { renderCell, expectCellRendered } from "../testUtils/CellTestUtils";
import { CommandClearEncoding } from "./CommandClearEncoding";

describe("CommandClearEncoding", (): void => {

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

  test("renders at its grid position", async (): Promise<void> => {

    renderCell(CommandClearEncoding, TEST_CELL_ID, testCell.options);

    const button = await expectCellRendered(TEST_CELL_ID, testCell.options, "btn-command");

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
      recalledSentence: null,
      model: "phony-model:12b",
      telegraphicMessage: "hungry"
    };

    renderCell(CommandClearEncoding, TEST_CELL_ID, testCell.options);
    await userEvent.click(await screen.findByRole("button", { name: testCell.options.label }));

    expect(changeEncodingContents.value.payloads).toEqual([]);
    expect(sentenceCompletionsSignal.value).toEqual(IDLE_SENTENCE_STATE);
  });

});
