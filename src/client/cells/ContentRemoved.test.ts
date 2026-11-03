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
import { renderCell } from "../testUtils/CellTestUtils";
import { scannableControls } from "../features/switch-scanning/SwitchScanning";
import { ContentRemoved } from "./ContentRemoved";

describe("ContentRemoved", (): void => {

  const TEST_CELL_ID = "cell-0-0";
  const options = {
    label: "Friends\nRemoved for privacy",
    backgroundColor: "#FEFEF4FF",
    rowStart: 2,
    rowSpan: 1,
    columnStart: 3,
    columnSpan: 2
  };

  test("shows its label on two lines, at its grid position, in its colour", (): void => {
    renderCell(ContentRemoved, TEST_CELL_ID, options);

    const cell = document.getElementById(TEST_CELL_ID) as HTMLElement;
    expect(cell).toBeVisible();
    expect(cell.innerText).toBe("Friends\nRemoved for privacy");
    expect(cell.style.getPropertyValue("grid-column")).toBe("3 / span 2");
    expect(cell.style.getPropertyValue("grid-row")).toBe("2 / span 1");
    expect(getComputedStyle(cell).backgroundColor).toBe("rgb(254, 254, 244)");
  });

  test("screen readers read it, and it is not a button, so pressing it does nothing and switch scanning skips it", (): void => {
    const { container } = renderCell(ContentRemoved, TEST_CELL_ID, options);

    const cell = document.getElementById(TEST_CELL_ID) as HTMLElement;
    expect(cell.hasAttribute("aria-hidden")).toBe(false);
    expect(screen.queryByRole("button")).toBeNull();
    expect(scannableControls(container)).toEqual([]);
  });
});
