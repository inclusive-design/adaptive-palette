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
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { html } from "htm/preact";

import {
  ActionSearchGloss, 
  SUBMIT_LABEL, 
  CLEAR_LABEL
} from "./ActionSearchGloss";

describe("ActionSearchGloss component", () => {

  test("Renders search-gloss form correctly", () => { // Removed unnecessary async
    render(html`<${ActionSearchGloss} />`);

    // 1. Find input by its accessible accessible label/role
    const searchInput = screen.getByRole("textbox", { name: /search vocabulary/i });
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveValue(""); // Use jest-dom's toHaveValue

    // 2. Find submit button by Role
    const submitButton = screen.getByRole("button", { name: SUBMIT_LABEL });
    expect(submitButton).toBeInTheDocument();

    // 3. Find clear button by Role
    const clearButton = screen.getByRole("button", { name: CLEAR_LABEL });
    expect(clearButton).toBeInTheDocument();
  });
});

describe("ActionSearchGloss component behavior", () => {
  
  test("allows user to type and clear the input", async () => {
    // Setup user-event
    const user = userEvent.setup();
    render(html`<${ActionSearchGloss} />`);

    const searchInput = screen.getByRole("textbox", { name: /search vocabulary/i });
    const clearButton = screen.getByRole("button", { name: CLEAR_LABEL });

    // Simulate user typing
    await user.type(searchInput, "apple");
    expect(searchInput).toHaveValue("apple");

    // Simulate user clicking clear
    await user.click(clearButton);
    expect(searchInput).toHaveValue("");
  });

  test("submits the form when Search is clicked", async () => {
    const user = userEvent.setup();
    render(html`<${ActionSearchGloss} />`);

    const searchInput = screen.getByRole("textbox", { name: /search vocabulary/i });
    const submitButton = screen.getByRole("button", { name: SUBMIT_LABEL });

    // Type a search term
    await user.type(searchInput, "123");
    
    // Click submit
    await user.click(submitButton);

    expect(screen.getByText(/No matches found/i)).toBeInTheDocument();
  });
});
