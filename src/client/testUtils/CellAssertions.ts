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
import { BlissSymbolInfoType, LayoutInfoType } from "../index.d";

/**
 * Assert the contract every palette cell button shares: it is in the document, carries the given
 * id and class, is labelled by its own label, and sits where its options say it should.
 *
 * Cell-specific state - `aria-disabled`, `aria-controls`, what a click does - belongs in the
 * calling test, not here.
 *
 * @param {String} id - The cell id the button is expected to carry.
 * @param {BlissSymbolInfoType & LayoutInfoType} options - The options the cell was rendered with.
 * @param {String} className - The class the button is expected to carry.
 * @return {Promise<HTMLElement>} The button, for further assertions.
 */
export async function expectCellRendered (
  id: string,
  options: BlissSymbolInfoType & LayoutInfoType,
  className: string
): Promise<HTMLElement> {
  const button = await screen.findByRole("button", { name: options.label });

  expect(button).toBeVisible();
  expect(button).toBeValid();
  expect(button.id).toBe(id);
  expect(button.getAttribute("class")).toBe(className);
  expect(button.textContent).toBe(options.label);
  expect(button.style.getPropertyValue("grid-column"))
    .toBe(`${options.columnStart} / span ${options.columnSpan}`);
  expect(button.style.getPropertyValue("grid-row"))
    .toBe(`${options.rowStart} / span ${options.rowSpan}`);

  return button;
}
