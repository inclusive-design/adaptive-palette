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
import { BlissSymbol, GRAPHIC_ROLE } from "./BlissSymbol";

describe("BlissSymbol render tests", () => {
  const singleBciAvId = {
    bciAvId: 12335,
    label: "VERB"
  };

  const arrayBciAvId = {
    bciAvId: [12335, "/", 8499],
    label: "VERB+S"
  };

  const MOCK_LABEL_ID = "mockLabelId";
  const UNKNOWN_BCI_AV_ID = -1;

  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  });

  test(`BlissSymbol defined by a single BCI_AV_ID (${singleBciAvId.label})`, async () => {
    render(html`
      <${BlissSymbol}
        bciAvId="${singleBciAvId.bciAvId}"
        label="${singleBciAvId.label}"
        isPresentation=true
      />`
    );
    const blissSymbolLabelDiv = await screen.findByText(singleBciAvId.label);
    expect(blissSymbolLabelDiv).toBeVisible();
    expect(blissSymbolLabelDiv).toBeValid();

    // Expect an <svg ...> element as the only sibling
    const parentChildren = blissSymbolLabelDiv.parentNode.childNodes;
    expect(parentChildren.length).toBe(2);
    expect(parentChildren[0].nodeName).toBe("svg");
  });

  test("BlissSymbol when the SVG is unknown", async () => {
    render(html`
      <${BlissSymbol}
        bciAvId="${UNKNOWN_BCI_AV_ID}"
        label="${arrayBciAvId.label}"
        isPresentation=true
      />`
    );
    const blissSymbolLabelDiv = await screen.findByText(arrayBciAvId.label);
    const svgElement = blissSymbolLabelDiv.parentNode.querySelector("svg");
    const parentChildren = blissSymbolLabelDiv.parentNode.childNodes;
    expect(parentChildren.length).toBe(1);
    expect(svgElement).toBe(null);
  });

  test(`BlissSymbol defined by an of BCI_AV_IDs (${arrayBciAvId.label})`, async () => {
    render(html`
      <${BlissSymbol}
        bciAvId="${arrayBciAvId.bciAvId}"
        label="${arrayBciAvId.label}"
        isPresentation=true
      />`
    );
    const blissSymbolLabelDiv = await screen.findByText(arrayBciAvId.label);
    expect(blissSymbolLabelDiv).toBeVisible();
    expect(blissSymbolLabelDiv).toBeValid();
    const parentChildren = blissSymbolLabelDiv.parentNode.childNodes;
    expect(parentChildren.length).toBe(2);
    expect(parentChildren[0].nodeName).toBe("svg");
  });

  test("BlissSymbol aria: when svg has no role)", async () => {
    render(html`
      <${BlissSymbol}
        bciAvId="${arrayBciAvId.bciAvId}"
        label="${arrayBciAvId.label}"
        isPresentation=true
      />`
    );
    const blissSymbolLabelDiv = await screen.findByText(arrayBciAvId.label);
    const svgElement = blissSymbolLabelDiv.parentNode.querySelector("svg");
    expect(svgElement.getAttribute("aria-hidden")).toBe("true");
    expect(svgElement.getAttribute("role")).toBe(null);
    expect(svgElement.getAttribute("aria-labelledby")).toBe(null);
  });

  test("BlissSymbol aria: when svg has a graphic role)", async () => {
    render(html`
      <${BlissSymbol}
        bciAvId="${arrayBciAvId.bciAvId}"
        label="${arrayBciAvId.label}"
        isPresentation=false
        labelledBy=${MOCK_LABEL_ID}
      />`
    );
    const blissSymbolLabelDiv = await screen.findByText(arrayBciAvId.label);
    const svgElement = blissSymbolLabelDiv.parentNode.querySelector("svg");
    expect(svgElement.getAttribute("role")).toBe(GRAPHIC_ROLE);
    expect(svgElement.getAttribute("aria-labelledby")).toBe(MOCK_LABEL_ID);
    expect(svgElement.getAttribute("aria-hidden")).toBe(null);
  });
});

