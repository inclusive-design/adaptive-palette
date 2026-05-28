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
import { html } from "htm/preact";

import { initAdaptivePaletteGlobals } from "./GlobalData";
import { BlissSymbol, GRAPHIC_ROLE } from "./BlissSymbol";

describe("BlissSymbol render tests", (): void => {
  const singleSymbol = {
    composition: 106,     // ID for bciAvId 12335 (VERB)
    label: "VERB"
  };

  const arraySymbol = {
    composition: [106, "/", 12],  // IDs for bciAvId 12335, 8499 (VERB+S)
    label: "VERB+S"
  };

  const MOCK_LABEL_ID = "mockLabelId";
  const UNKNOWN_COMPOSITION = -1;

  beforeAll(async () => {
    await initAdaptivePaletteGlobals();
  });

  test(`BlissSymbol defined by a single composition id (${singleSymbol.label})`, async (): Promise<void> => {
    render(html`
      <${BlissSymbol}
        composition=${singleSymbol.composition}
        label="${singleSymbol.label}"
        isPresentation=true
      />`
    );
    const blissSymbolLabelDiv = await screen.findByText(singleSymbol.label);
    expect(blissSymbolLabelDiv).toBeVisible();
    expect(blissSymbolLabelDiv).toBeValid();

    // Expect an <svg ...> element as the only sibling
    const parentNode = blissSymbolLabelDiv.parentNode;
    if (!parentNode) {
      throw new Error("Parent node of blissSymbolLabelDiv is null");
    }
    const parentChildren = parentNode.childNodes;
    expect(parentChildren.length).toBe(2);
    expect(parentChildren[0].nodeName).toBe("svg");
  });

  test("BlissSymbol when the SVG is unknown", async (): Promise<void> => {
    render(html`
      <${BlissSymbol}
        composition=${UNKNOWN_COMPOSITION}
        label="${arraySymbol.label}"
        isPresentation=true
      />`
    );
    const blissSymbolLabelDiv = await screen.findByText(arraySymbol.label);
    const parentNode = blissSymbolLabelDiv.parentNode;
    if (!parentNode) {
      throw new Error("Parent node of blissSymbolLabelDiv is null");
    }
    const svgElement = parentNode.querySelector("svg");
    const parentChildren = parentNode.childNodes;
    expect(parentChildren.length).toBe(1);
    expect(svgElement).toBe(null);
  });

  test(`BlissSymbol defined by an array of composition ids (${arraySymbol.label})`, async (): Promise<void> => {
    render(html`
      <${BlissSymbol}
        composition=${arraySymbol.composition}
        label="${arraySymbol.label}"
        isPresentation=true
      />`
    );
    const blissSymbolLabelDiv = await screen.findByText(arraySymbol.label);
    expect(blissSymbolLabelDiv).toBeVisible();
    expect(blissSymbolLabelDiv).toBeValid();
    const parentNode = blissSymbolLabelDiv.parentNode;
    if (!parentNode) {
      throw new Error("Parent node of blissSymbolLabelDiv is null");
    }
    const parentChildren = parentNode.childNodes;
    expect(parentChildren.length).toBe(2);
    expect(parentChildren[0].nodeName).toBe("svg");
  });

  test("BlissSymbol aria: when svg has no role)", async (): Promise<void> => {
    render(html`
      <${BlissSymbol}
        composition=${arraySymbol.composition}
        label="${arraySymbol.label}"
        isPresentation=true
      />`
    );
    const blissSymbolLabelDiv = await screen.findByText(arraySymbol.label);
    const parentNode = blissSymbolLabelDiv.parentNode;
    if (!parentNode) {
      throw new Error("Parent node of blissSymbolLabelDiv is null");
    }
    const svgElement = parentNode.querySelector("svg")!;
    expect(svgElement.getAttribute("aria-hidden")).toBe("true");
    expect(svgElement.getAttribute("role")).toBe(null);
    expect(svgElement.getAttribute("aria-labelledby")).toBe(null);
  });

  test("BlissSymbol aria: when svg has a graphic role)", async (): Promise<void> => {
    render(html`
      <${BlissSymbol}
        composition=${arraySymbol.composition}
        label="${arraySymbol.label}"
        isPresentation=false
        labelledBy=${MOCK_LABEL_ID}
      />`
    );
    const blissSymbolLabelDiv = await screen.findByText(arraySymbol.label);
    const parentNode = blissSymbolLabelDiv.parentNode;
    if (!parentNode) {
      throw new Error("Parent node of blissSymbolLabelDiv is null");
    }
    const svgElement = parentNode.querySelector("svg")!;
    expect(svgElement.getAttribute("role")).toBe(GRAPHIC_ROLE);
    expect(svgElement.getAttribute("aria-labelledby")).toBe(MOCK_LABEL_ID);
    expect(svgElement.getAttribute("aria-hidden")).toBe(null);
  });
});
