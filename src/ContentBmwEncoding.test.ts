/*
 * Copyright 2023 Inclusive Design Research Centre, OCAD University
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
import { dispatchMessage } from "./GlobalMessageHandler";

test("The BMW Encoding content area is rendered correctly", async () => {
  const cellId = "uuid-of-bmw-encoding-area";
  const columnSpan = 5;
  const cellOptions = {
    columnStart: 1,
    rowStart: 2,
    rowSpan: 3
  };

  render(html`
    <${ContentBmwEncoding}
      id="${cellId}"
      columnSpan="${columnSpan}"
      options=${cellOptions}
    />`
  );

  // The aria-label is defined
  const encodingAreaByLabel = await screen.findByLabelText("BMW Encoding Area");
  expect(encodingAreaByLabel.id).toBe(cellId);
  expect(encodingAreaByLabel.style["grid-column"]).toBe("1 / span 5");
  expect(encodingAreaByLabel.style["grid-row"]).toBe("2 / span 3");

  // The aria role is defined
  const encodingAreaByRole = await screen.findByRole("region");
  expect(encodingAreaByRole).not.toBe(undefined);

  // The BMW Encoding content area responds to incoming requests
  dispatchMessage("addBmwCode", {
    id: "hello-id",
    label: "hello-label",
    bciAvId: 1
  });
  expect(document.getElementById(cellId).innerHTML).toBe("hello-label");
});
