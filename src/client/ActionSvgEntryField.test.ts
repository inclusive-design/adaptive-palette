/*
 * Copyright 2025 Inclusive Design Research Centre, OCAD University
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

import {
  ActionSvgEntryField, SVG_ENTRY_FIELD_ID, SYMBOL_LABEL_FIELD_ID, SUBMIT_VALUE
} from "./ActionSvgEntryField";

describe("ActionSvgEntryField component", (): void => {

  test("Render dialog", async(): Promise<void> => {
    render(html`
      <${ActionSvgEntryField} />`
    );
    // Check the text input fields.
    let anInput = document.getElementById(SVG_ENTRY_FIELD_ID) as HTMLInputElement;
    expect(anInput).toBeInTheDocument();
    expect(anInput.value).toBe("");

    anInput = document.getElementById(SYMBOL_LABEL_FIELD_ID) as HTMLInputElement;
    expect(anInput).toBeInTheDocument();
    expect(anInput.value).toBe("");

    anInput = screen.getByDisplayValue(SUBMIT_VALUE);
    expect(anInput).toBeInTheDocument();
  });

});
