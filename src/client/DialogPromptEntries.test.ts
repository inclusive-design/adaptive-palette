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

import { SYSTEM_PROMPTS_KEY } from "./GlobalData";
import {
  SELECT_ID, TEXTAREA_ID, SUBMIT_VALUE, PROMPT_NAME_ID, DialogPromptEntries
} from "./DialogPromptEntries";

describe("DialogPromptEntries component", (): void => {
  // Set up some dummy prompts for the <select> and the <textarea>
  const PROMPT1_KEY = "prompt1";
  const PROMPT2_KEY = "prompt2";
  const PROMPT1 = "This is prompt one";
  const PROMPT2 = "Prompt two this time";
  const testPrompts = {};
  testPrompts[PROMPT1_KEY] = PROMPT1;
  testPrompts[PROMPT2_KEY] = PROMPT2;

  window.localStorage.setItem(SYSTEM_PROMPTS_KEY, JSON.stringify(testPrompts));

  test("Render dialog", async(): Promise<void> => {
    render(html`
      <${DialogPromptEntries} />`
    );
    // Check the <select> and its <option>s.
    const select = document.getElementById(SELECT_ID) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.selectedIndex).toBe(0);
    expect(select.value).toBe(PROMPT1);
    const options = select.options as HTMLOptionsCollection;
    expect(options.length).toBe(Object.keys(testPrompts).length);
    expect(options.item(0).value).toBe(PROMPT1);
    expect(options.item(1).value).toBe(PROMPT2);

    // Check the <textarea> and its content.
    const textArea = document.getElementById(TEXTAREA_ID) as HTMLTextAreaElement;
    expect(textArea).toBeInTheDocument();
    expect(textArea.value).toBe(PROMPT1);

    // Check the other inputs.
    let anInput = document.getElementById(PROMPT_NAME_ID) as HTMLInputElement;
    expect(anInput).toBeInTheDocument();
    expect(anInput.value).toBe("");

    anInput = screen.getByDisplayValue(SUBMIT_VALUE);
    expect(anInput).toBeInTheDocument();
  });
});
