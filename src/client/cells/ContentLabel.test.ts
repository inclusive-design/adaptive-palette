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

import { renderCell } from "../testUtils/CellTestUtils";
import { ContentLabel } from "./ContentLabel";

describe("ContentLabel", (): void => {

  const TEST_CELL_ID = "attribute-label-feeling";
  const testCell = {
    options: {
      "label": "Feeling",
      "rowStart": 3,
      "rowSpan": 1,
      "columnStart": 1,
      "columnSpan": 1
    }
  };

  test("renders its text at its grid position", (): void => {
    renderCell(ContentLabel, TEST_CELL_ID, testCell.options);

    const label = document.getElementById(TEST_CELL_ID) as HTMLElement;
    expect(label).toBeVisible();
    expect(label.textContent).toBe(testCell.options.label);
    expect(label.getAttribute("class")).toBe("contentLabel");
    expect(label.style.getPropertyValue("grid-column")).toBe("1 / span 1");
    expect(label.style.getPropertyValue("grid-row")).toBe("3 / span 1");
  });

  test("stays out of the accessibility tree; the cells it heads carry the name", (): void => {
    renderCell(ContentLabel, TEST_CELL_ID, testCell.options);

    const label = document.getElementById(TEST_CELL_ID) as HTMLElement;
    expect(label.getAttribute("aria-hidden")).toBe("true");
  });
});
