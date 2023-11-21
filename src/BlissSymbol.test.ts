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

import { initAdaptivePaletteGlobals } from "./GlobalData";
import { BlissSymbol } from "./BlissSymbol";

test("The BlissSymbol component is rendered correctly", async () => {

  await initAdaptivePaletteGlobals();

  const singleBciAvId = {
    bciAvId: 12335,
    label: "VERB"
  };

  const arrayBciAvId = {
    bciAvId: [12335, "/", 8499],
    label: "VERB+S"
  };

  // Render the two test BlissSymbols
  render(html`
    <${BlissSymbol}
      bciAvId="${singleBciAvId.bciAvId}"
      label="${singleBciAvId.label}"
    />`
  );

  render(html`
    <${BlissSymbol}
      bciAvId="${arrayBciAvId.bciAvId}"
      label="${arrayBciAvId.label}"
    />`
  );

  // Check the rendered cells
  console.debug(`Testing BlissSymbol with label ${singleBciAvId.label}`);
  let blissSymbolLabelDiv = await screen.findByText(singleBciAvId.label);
  expect(blissSymbolLabelDiv).toBeVisible();
  expect(blissSymbolLabelDiv).toBeValid();

  // Expert the only sibling to be an <svg ...> element
  let parentChildren = blissSymbolLabelDiv.parentNode.childNodes;
  expect(parentChildren.length).toBe(2);
  expect(parentChildren[0].nodeName).toBe("svg");

  console.debug(`Testing BlissSymbol with label ${arrayBciAvId.label}`);
  blissSymbolLabelDiv = await screen.findByText(arrayBciAvId.label);
  expect(blissSymbolLabelDiv).toBeVisible();
  expect(blissSymbolLabelDiv).toBeValid();
  parentChildren = blissSymbolLabelDiv.parentNode.childNodes;
  expect(parentChildren.length).toBe(2);
  expect(parentChildren[0].nodeName).toBe("svg");
});
