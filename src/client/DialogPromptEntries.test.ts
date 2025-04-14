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
  SELECT_ID, TEXTAREA_ID, SUBMIT_VALUE, PROMPT_NAME_ID, DialogPromptEntries
} from "./DialogPromptEntries";

describe("DialogPromptEntries component", (): void => {
  // Set up some dummy prompts for the <select> and the <textarea>
  const PROMPT1_KEY = "prompt1";
  const PROMPT2_KEY = "prompt2";
  const PROMPT1 = "This is prompt one";
  const PROMPT2 = "Prompt two this time";

  window.localStorage.setItem(PROMPT1_KEY, PROMPT1);
  window.localStorage.setItem(PROMPT2_KEY, PROMPT2);

  test("Render dialog, with no specified prompt key", async(): Promise<void> => {
    render(html`
      <${DialogPromptEntries} model="llama3.1:latest" stream=false />`
    );
    // Check the <select> and its <option>s.
    const select = document.getElementById(SELECT_ID) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.selectedIndex).toBe(0);
    expect(select.value).toBe(PROMPT1);
    const options = select.options as HTMLOptionsCollection;
    expect(options.length).toBe(window.localStorage.length);
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

  test("Render dialog, with prompt key", async(): Promise<void> => {
    // Render the dialog twice.  The first render creates the <select> and
    // other controls for the first time; hence they all have their initial
    // values and content.  The calls to `rerender()` will adjust the controls
    // based on the `promptName` attribute.  See the "Results" section for some
    // information on `rerender`:
    // https://testing-library.com/docs/preact-testing-library/api#results
    //
    const { rerender } = render(html`
      <${DialogPromptEntries} model="llama3.1:latest" stream=false />`
    );
    rerender(html`
      <${DialogPromptEntries} model="llama3.1:latest" stream=false promptName=${PROMPT2_KEY} />`,
    );
    const select = document.getElementById(SELECT_ID) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.selectedIndex).toBe(1);
    expect(select.value).toBe(PROMPT2);
    const options = select.options as HTMLOptionsCollection;
    expect(options.length).toBe(window.localStorage.length);
    expect(options.item(0).value).toBe(PROMPT1);
    expect(options.item(1).value).toBe(PROMPT2);

    const textArea = document.getElementById(TEXTAREA_ID) as HTMLTextAreaElement;
    expect(textArea).toBeInTheDocument();
    expect(textArea.value).toBe(PROMPT2);
  });
});
