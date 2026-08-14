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

import { render } from "@testing-library/preact";
import { html } from "htm/preact";

import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { expectCellRendered } from "../testUtils/CellAssertions";
import { CommandDelLastEncoding } from "./CommandDelLastEncoding";

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

  test("renders at its grid position", async (): Promise<void> => {

    render(html`
      <${CommandDelLastEncoding}
        id="${TEST_CELL_ID}"
        options=${testCell.options}
      />`
    );

    const button = await expectCellRendered(TEST_CELL_ID, testCell.options, "btn-command");

    // Check aria-controls
    expect(button.getAttribute("aria-controls")).toBe(testCell.options.ariaControls);

    // Check disabled state (should be enabled)
    expect(button.getAttribute("disabled")).toBe(null);
  });

});
