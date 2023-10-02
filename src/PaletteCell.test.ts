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
  render(html`
    <${PaletteCell}
      id="uuid-of-some-kind"
      labelText="Bliss Language"
      rowStart="3"
      rowSpan="2"
      columnStart="2"
      columnSpan="1"
      style="background-color: green;"
    />`);

  let button = await screen.findByRole("button", {name: "Bliss Language"});
  let buttonStyles = window.getComputedStyle(button);
  console.log(`Button's background colour: ${buttonStyles.backgroundColor}`);

  // Check that the PaletteCell/button is rendered and has the correct
  // attributes and text
  expect(button).toBeVisible();
  expect(button).toBeValid();
  expect(button.id).toBe("uuid-of-some-kind");

  // PaletteCell.css does not specify a bacground colour.  The background will
  // be whatever the browser default is.  For now, check that the specified
  // colour in the test render above is correct
  expect(button.style["background-color"]).toBe("green");
  expect(button.style["grid-column"]).toBe("2 / span 1");
  expect(button.style["grid-row"]).toBe("3 / span 2");
  expect(button.textContent).toBe("Bliss Language");

  // Check disabled state (should be enabled)
  expect(button.getAttribute("disabled")).toBe(null);
  expect(button.getAttribute("class")).not.toContain("disabled");

  // Check styling due to mouse hover
  // TODO:  get `:hover` style from PaletteCell.css?
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

  // Create a diabled button and check its disabled state.
  render(html`
    <${PaletteCell}
      id="uuid-of-another-kind"
      labelText="Disabled Cell"
      rowStart="3"
      rowSpan="2"
      columnStart="2"
      columnSpan="1"
      class="disabled"
    />`);

  button = await screen.findByRole("button", {name: "Disabled Cell"});
  expect(button).toBeVisible();
  expect(button).toBeValid();
  expect(button.id).toBe("uuid-of-another-kind");
  expect(button.getAttribute("disabled")).toBe("");
  expect(button.getAttribute("class")).toContain("disabled");
});
