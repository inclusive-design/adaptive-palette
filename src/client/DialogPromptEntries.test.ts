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
import "@testing-library/jest-dom";
import { html } from "htm/preact";

import { SYSTEM_PROMPTS_KEY } from "./GlobalData";
import { SUBMIT_VALUE, TEXTAREA_ID, DialogPromptEntries } from "./DialogPromptEntries";

describe("DialogPromptEntries component", () => {
  const PROMPT1_KEY = "prompt1";
  const PROMPT2_KEY = "prompt2";
  const PROMPT1 = "This is prompt one";
  const PROMPT2 = "Prompt two this time";

  // Scope LocalStorage setup and teardown
  beforeEach(() => {
    const testPrompts = {
      [PROMPT1_KEY]: PROMPT1,
      [PROMPT2_KEY]: PROMPT2
    };
    window.localStorage.setItem(SYSTEM_PROMPTS_KEY, JSON.stringify(testPrompts));
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  test("Render dialog", () => {
    render(html`<${DialogPromptEntries} />`);

    // Check the prompt <select> and its <option>s.
    const promptSelect = screen.getByLabelText(/choose a prompt/i) as HTMLSelectElement;
    expect(promptSelect).toBeInTheDocument();
    expect(promptSelect.value).toBe(PROMPT1_KEY);

    const options = screen.getAllByRole("option") as HTMLOptionElement[];
    expect(options).toHaveLength(2);
    expect(options[0].value).toBe(PROMPT1_KEY);
    expect(options[1].value).toBe(PROMPT2_KEY);

    // Check the <textarea> and its content.
    const textArea = document.getElementById(TEXTAREA_ID) as HTMLTextAreaElement;
    expect(textArea).toBeInTheDocument();
    expect(textArea.value).toBe(PROMPT1);

    // Check the other inputs.
    const nameInput = screen.getByPlaceholderText("New prompt name") as HTMLInputElement;
    expect(nameInput).toBeInTheDocument();
    expect(nameInput.value).toBe("");

    const submitBtn = screen.getByRole("button", { name: SUBMIT_VALUE });
    expect(submitBtn).toBeInTheDocument();
  });
});
