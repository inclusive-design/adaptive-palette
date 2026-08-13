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

import { render, screen } from "@testing-library/preact";
import { html } from "htm/preact";
import { ContentEncoding, clamp } from "./ContentEncoding";
import { initAdaptivePaletteGlobals } from "./InitGlobals";

test("The content encoding area is rendered correctly", async (): Promise<void> => {
  await initAdaptivePaletteGlobals();

  const cellId = "uuid-of-content-encoding-area";
  const cellOptions = {
    columnStart: 1,
    columnSpan: 5,
    rowStart: 2,
    rowSpan: 3
  };

  render(html`
    <${ContentEncoding}
      id="${cellId}"
      options=${cellOptions}
    />`
  );

  // Test the content area is rendered properly
  const encodingAreaByLabel = await screen.findByLabelText("Input Area");
  expect(encodingAreaByLabel.id).toBe(cellId);
  expect(encodingAreaByLabel.style.getPropertyValue("grid-column")).toBe("1 / span 5");
  expect(encodingAreaByLabel.style.getPropertyValue("grid-row")).toBe("2 / span 3");

  // The aria role is defined
  const encodingAreaByRole = await screen.findByRole("textbox");
  expect(encodingAreaByRole.getAttribute("aria-readonly")).toBe("true");
  expect(encodingAreaByRole).toBeVisible();
  expect(encodingAreaByRole).toBeValid();

  // Nothing is rendered in the content area
  expect(encodingAreaByLabel.childNodes.length).toBe(0);
});

// `Sentence` button is not rendered when no model is available. The input area takes over its space.
describe("The content encoding area covers the sentence button's column when it is absent", (): void => {

  const cellOptions = {
    columnStart: 1,
    columnSpan: 10,
    rowStart: 2,
    rowSpan: 1
  };

  test("stretches to column 15 with no sentence button in the palette", async (): Promise<void> => {
    render(html`
      <div id="inputArea">
        <div class="paletteContainer">
          <${ContentEncoding} id="content-encoding-area" options=${cellOptions} />
        </div>
      </div>`
    );
    const encodingArea = await screen.findByLabelText("Input Area");
    expect(getComputedStyle(encodingArea).gridColumnEnd).toBe("15");
  });

  test("keeps its own span when the sentence button is present", async (): Promise<void> => {
    render(html`
      <div id="inputArea">
        <div class="paletteContainer">
          <${ContentEncoding} id="content-encoding-area" options=${cellOptions} />
          <button class="btn-makeSentence">Sentence</button>
        </div>
      </div>`
    );
    const encodingArea = await screen.findByLabelText("Input Area");
    expect(getComputedStyle(encodingArea).gridColumnEnd).toBe("span 10");
  });
});

describe("clamp()", (): void => {

  test("Test clamp function where value is below min", (): void => {
    expect(clamp(-1, 0, 1)).toBe(0);
  });

  test("Test clamp function where value is above max", (): void => {
    expect(clamp(2, 0, 1)).toBe(1);
  });

  test("Test clamp function where value is in range", (): void => {
    expect(clamp(1, 0, 2)).toBe(1);
  });
});
