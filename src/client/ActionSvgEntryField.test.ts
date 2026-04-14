/*
 * Copyright 2025-2026 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { render, screen } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { html } from "htm/preact";

import {
  ActionSvgEntryField, SUBMIT_VALUE
} from "./ActionSvgEntryField";

describe("ActionSvgEntryField component", () => {

  test("Renders input fields and submit button successfully", () => {
    render(html`<${ActionSvgEntryField} />`);

    // Query by label text - this proves your <label for=".."> is correctly linked!
    const builderInput = screen.getByLabelText(/Builder string:/i);
    expect(builderInput).toBeInTheDocument();
    expect(builderInput).toHaveValue("");

    const labelInput = screen.getByLabelText(/Label:/i);
    expect(labelInput).toBeInTheDocument();
    expect(labelInput).toHaveValue("");

    const submitBtn = screen.getByRole("button", { name: SUBMIT_VALUE });
    expect(submitBtn).toBeInTheDocument();
  });

  // Behavioral test
  test("Displays error message when an invalid builder string is submitted", async () => {
    // userEvent is to simulate user interactions
    const user = userEvent.setup(); 
    
    render(html`<${ActionSvgEntryField} />`);

    const builderInput = screen.getByLabelText(/Builder string:/i);
    const submitBtn = screen.getByRole("button", { name: SUBMIT_VALUE });

    // Type a string that will fail custom `convertSvgBuilderString` logic
    await user.type(builderInput, "invalid-string");
    await user.click(submitBtn);

    // Assert that the malformed state triggers the error message
    const errorMessage = await screen.findByText("Invalid builder string");
    expect(errorMessage).toBeInTheDocument();
    
    expect(builderInput).toHaveAttribute("aria-invalid", "true");
  });

});
