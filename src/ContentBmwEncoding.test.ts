/*
 * Copyright 2023-2024 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { render, screen } from "@testing-library/preact";
import "@testing-library/jest-dom";
import { html } from "htm/preact";
import { ContentBmwEncoding } from "./ContentBmwEncoding";
import { initAdaptivePaletteGlobals } from "./GlobalData";

test("The BMW Encoding content area is rendered correctly", async () => {
  await initAdaptivePaletteGlobals();

  const cellId = "uuid-of-bmw-encoding-area";
  const cellOptions = {
    columnStart: 1,
    columnSpan: 5,
    rowStart: 2,
    rowSpan: 3
  };

  render(html`
    <${ContentBmwEncoding}
      id="${cellId}"
      options=${cellOptions}
    />`
  );

  // Test the content area is rendered properly
  const encodingAreaByLabel = await screen.findByLabelText("BMW Encoding Area");
  expect(encodingAreaByLabel.id).toBe(cellId);
  expect(encodingAreaByLabel.style["grid-column"]).toBe("1 / span 5");
  expect(encodingAreaByLabel.style["grid-row"]).toBe("2 / span 3");

  // The aria role is defined
  const encodingAreaByRole = await screen.findByRole("region");
  expect(encodingAreaByRole).toBeVisible();
  expect(encodingAreaByRole).toBeValid();

  // Nothing is rendered in the content area
  expect(encodingAreaByLabel.childNodes.length).toBe(0);
});
