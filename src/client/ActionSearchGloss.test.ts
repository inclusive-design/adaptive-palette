/*
 * Copyright 2026 Inclusive Design Research Centre, OCAD University
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
  ActionSearchGloss, GLOSS_ENTRY_FIELD_ID, SUBMIT_LABEL, CLEAR_LABEL
} from "./ActionSearchGloss";

describe("ActionSearchGloss component", (): void => {

  test("Render search-gloss dialog", async (): Promise<void> => {

    render(html`<${ActionSearchGloss} />`);

    // Check that the inputs were rendered
    let anInput = document.getElementById(GLOSS_ENTRY_FIELD_ID) as HTMLInputElement;
    expect(anInput).toBeInTheDocument();
    expect(anInput.value).toBe("");

    anInput = screen.getByDisplayValue(SUBMIT_LABEL) as HTMLInputElement;
    expect(anInput).toBeInTheDocument();

    anInput = screen.getByDisplayValue(CLEAR_LABEL) as HTMLInputElement;
    expect(anInput).toBeInTheDocument();
  });
});
