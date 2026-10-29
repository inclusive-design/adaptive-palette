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
import { fireEvent, screen } from "@testing-library/preact";
import { changeEncodingContents } from "../state/GlobalData";
import { SPACE_PART } from "../utils/SymbolEncodingUtils";
import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { renderCell, expectCellRendered } from "../testUtils/CellTestUtils";
import { CommandDelLastEncoding } from "./CommandDelLastEncoding";

vi.mock("../utils/SpeechUtils");

describe("CommandDelLastEncoding", (): void => {

  const TEST_CELL_ID = "command-del-last-encoding";
  const testCell = {
    options: {
      "label": "Delete",
      "composition": 145,
      "rowStart": 2,
      "rowSpan": 1,
      "columnStart": 13,
      "columnSpan": 1,
      "ariaControls": "test-encoding-area"
    }
  };

  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  });

  afterEach((): void => {
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
  });

  test("deleting a word deletes the space before it", async (): Promise<void> => {
    const cat = { label: "cat", composition: 126 };
    changeEncodingContents.value = {
      payloads: [cat, SPACE_PART, { label: "tail", composition: 640 }],
      caretPosition: 2
    };
    renderCell(CommandDelLastEncoding, TEST_CELL_ID, testCell.options);

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

    expect(changeEncodingContents.value).toEqual({ payloads: [cat], caretPosition: 0 });
  });

  test("renders at its grid position", async (): Promise<void> => {

    renderCell(CommandDelLastEncoding, TEST_CELL_ID, testCell.options);

    const button = await expectCellRendered(TEST_CELL_ID, testCell.options, "btn-command");

    // Check aria-controls
    expect(button.getAttribute("aria-controls")).toBe(testCell.options.ariaControls);

    // Check disabled state (should be enabled)
    expect(button.getAttribute("disabled")).toBe(null);
  });

});
