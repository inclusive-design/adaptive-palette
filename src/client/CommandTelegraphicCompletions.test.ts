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

import { render, screen, cleanup } from "@testing-library/preact";
import "@testing-library/jest-dom";
import { html } from "htm/preact";

import { adaptivePaletteGlobals, changeEncodingContents } from "./GlobalData";

import {
  CommandTelegraphicCompletions, 
  TELEGRAPHIC_BUTTON_LABEL, 
  CANCEL_BUTTON_LABEL,
  NO_MODELS_AVAILABLE
} from "./CommandTelegraphicCompletions";

describe("CommandTelegraphicCompletions component", () => {

  // Some phony LLM names for the LLM <select>
  const LLM_NAMES = ["chatHQS", "alpaca2.0", "balladeer10.5:latest"];

  // Simulate a single symbol in the input area
  const INPUT_CONTENTS = {
    payloads: [{
      id: "fake-uuid",
      label: "dog",
      bciAvId: [12380],
      modifierInfo: []
    }],
    caretPosition: 1
  };

  beforeEach(() => {
    adaptivePaletteGlobals.LLMs = [];
    changeEncodingContents.value = { payloads: [], caretPosition: 0 };
  });

  afterEach(() => {
    cleanup();
  });

  test("Render the dialog, no LLMs available", async () => {
    render(html`<${CommandTelegraphicCompletions} stream=${false} />`);
    
    const triggerButton = await screen.findByRole("button", { name: TELEGRAPHIC_BUTTON_LABEL });
    expect(triggerButton).toBeDisabled();

    const cancelButton = await screen.findByRole("button", { name: CANCEL_BUTTON_LABEL });
    expect(cancelButton).toBeDisabled();
    const llmSelect = screen.getByRole("combobox", { name: /llm/i }) as HTMLSelectElement;
    expect(llmSelect.value).toBe(NO_MODELS_AVAILABLE);
    
    const llmOptions = screen.getAllByRole("option") as HTMLOptionElement[];
    expect(llmOptions).toHaveLength(1);
    expect(llmOptions[0].value).toBe(NO_MODELS_AVAILABLE);
  });

  test("Render the dialog, LLMs available", async () => {
    adaptivePaletteGlobals.LLMs = LLM_NAMES;
    render(html`<${CommandTelegraphicCompletions} stream=${false} />`);
    const triggerButton = await screen.findByRole("button", { name: TELEGRAPHIC_BUTTON_LABEL });
    expect(triggerButton).toBeDisabled(); // Disabled because payloads.length === 0

    const cancelButton = await screen.findByRole("button", { name: CANCEL_BUTTON_LABEL });
    expect(cancelButton).toBeEnabled(); 

    const llmSelect = screen.getByRole("combobox", { name: /llm/i }) as HTMLSelectElement;
    expect(llmSelect.value).toBe(LLM_NAMES[0]);    
    const llmOptions = screen.getAllByRole("option") as HTMLOptionElement[];
    expect(llmOptions).toHaveLength(3);
    
    const optionValues = llmOptions.map(opt => opt.value);
    expect(optionValues).toEqual(LLM_NAMES);
  });

  test("Render the dialog, LLMs available, user entered content", async(): Promise<void> => {
    // Some phony LLM names for the LLM <select>
    adaptivePaletteGlobals.LLMs = LLM_NAMES;
    changeEncodingContents.value = INPUT_CONTENTS;

    render(html`<${CommandTelegraphicCompletions} stream=${false} />`);
    
    const triggerButton = await screen.findByRole("button", { name: TELEGRAPHIC_BUTTON_LABEL });
    // FIXED: Use toBeEnabled()
    expect(triggerButton).toBeEnabled();

    const cancelButton = await screen.findByRole("button", { name: CANCEL_BUTTON_LABEL });
    expect(cancelButton).toBeEnabled();

    const llmSelect = screen.getByRole("combobox", { name: /llm/i }) as HTMLSelectElement;
    expect(llmSelect.value).toBe(LLM_NAMES[0]);
    
    const llmOptions = screen.getAllByRole("option") as HTMLOptionElement[];
    expect(llmOptions).toHaveLength(3);
  });
});
