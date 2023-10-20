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

import { render, screen, fireEvent } from "@testing-library/preact";
import "@testing-library/jest-dom";
import { html } from "htm/preact";
import { PaletteCell } from "./PaletteCell";

test("The PaletteCell is rendered correctly", async () => {

  const TEST_CELL_ID = "uuid-of-some-kind";
  const testCell = {
    options: {
      "label": "Bliss Language",
      "rowStart": "3",
      "rowSpan": "2",
      "columnStart": "2",
      "columnSpan": "1",
    }
  };
  render(html`
    <${PaletteCell}
      id="${TEST_CELL_ID}"
      options=${testCell.options}
    />`
  );

  // Check the rendered cell
  const button = await screen.findByRole("button", {name: testCell.options.label});
  let buttonStyles = window.getComputedStyle(button);
  console.log(`Button's background colour: ${buttonStyles.backgroundColor}`);

  // Check that the PaletteCell/button is rendered and has the correct
  // attributes and text
  expect(button).toBeVisible();
  expect(button).toBeValid();
  expect(button.id).toBe(TEST_CELL_ID);

  // PaletteCell.css background colour is 'gray'.  The gridcell properties are
  // passed from `testCell` above.
  expect(button.style["background-color"]).toBe("gray");
  expect(button.style["grid-column"]).toBe("2 / span 1");
  expect(button.style["grid-row"]).toBe("3 / span 2");
  expect(button.textContent).toBe("Bliss Language");

  // Check disabled state (should be enabled)
  expect(button.getAttribute("disabled")).toBe(null);

  // Check styling due to mouse hover
  // TODO:  these tests do not work; needs investigation
  fireEvent.mouseOver(button);

  buttonStyles = window.getComputedStyle(button);
  console.log(`Button's background colour: ${buttonStyles.backgroundColor}`);
  //expect(buttonStyles.backgroundColor).toBe("#cccccc");
  //expect(buttonStyles.color).toBe("#0000aa");

  fireEvent.mouseLeave(button);
  buttonStyles = window.getComputedStyle(button);
  console.log(`Button's background colour: ${buttonStyles.backgroundColor}`);
  //expect(buttonStyles.backgroundColor).not.toBe("#cccccc");
  //expect(buttonStyles.color).not.toBe("#0000aa");
});
