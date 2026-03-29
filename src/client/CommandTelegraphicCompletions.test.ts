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

import { adaptivePaletteGlobals, changeEncodingContents } from "./GlobalData";

import {
  CommandTelegraphicCompletions, TELEGRPAHIC_BUTTON_LABEL, CANCEL_BUTTON_LABEL,
  LLM_SELECT_ID, NO_MODELS_AVAILABLE
} from "./CommandTelegraphicCompletions";

describe("CommandTelegraphicCompletions component", (): void => {

  // Some phony LLM names for the LLM <select>
  const LLM_NAMES = [ "chatHQS", "alpaca2.0", "balladeer10.5:latest" ];

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

  test("Render the dialog, no LLMs available", async(): Promise<void> => {
    adaptivePaletteGlobals.LLMs = [];
    render(html`
      <${CommandTelegraphicCompletions} stream=false />`
    );
    const triggerButton = await screen.findByText(TELEGRPAHIC_BUTTON_LABEL);
    expect(triggerButton).toBeInTheDocument();
    expect(triggerButton).toBeInstanceOf(HTMLButtonElement);
    expect(triggerButton.getAttribute("disabled")).toBeDefined();

    const cancelButton = await screen.findByText(CANCEL_BUTTON_LABEL);
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toBeInstanceOf(HTMLButtonElement);
    expect(cancelButton.getAttribute("disabled")).toBeDefined();

    const llmSelect = await document.getElementById(LLM_SELECT_ID) as HTMLSelectElement;
    expect(llmSelect.value).toBe(NO_MODELS_AVAILABLE);
    const llmOptions = llmSelect.options as HTMLOptionsCollection;
    expect(llmOptions.length).toBe(1);
    expect(llmOptions.item(0).value).toBe(NO_MODELS_AVAILABLE);
  });

  test("Render the dialog, LLMs available", async(): Promise<void> => {
    // Some phony LLM names for the LLM <select>
    adaptivePaletteGlobals.LLMs = LLM_NAMES;
    render(html`
      <${CommandTelegraphicCompletions} stream=false />`
    );
    const triggerButton = await screen.findByText(TELEGRPAHIC_BUTTON_LABEL);
    expect(triggerButton).toBeInTheDocument();
    expect(triggerButton).toBeInstanceOf(HTMLButtonElement);
    expect(triggerButton.getAttribute("disabled")).toBeDefined();

    const cancelButton = await screen.findByText(CANCEL_BUTTON_LABEL);
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toBeInstanceOf(HTMLButtonElement);
    expect(cancelButton.getAttribute("disabled")).toBeDefined();

    const llmSelect = await document.getElementById(LLM_SELECT_ID) as HTMLSelectElement;
    expect(llmSelect.value).toBe(adaptivePaletteGlobals.LLMs[0]);
    const llmOptions = llmSelect.options as HTMLOptionsCollection;
    expect(llmOptions.length).toBe(3);
    for (let i=0; i < llmOptions.length; i++) {
      expect(llmOptions.item(i).value).toBe(adaptivePaletteGlobals.LLMs[i]);
    }
  });

  test("Render the dialog, LLMs available, user entered content", async(): Promise<void> => {
    // Some phony LLM names for the LLM <select>
    adaptivePaletteGlobals.LLMs = LLM_NAMES;
    changeEncodingContents.value = INPUT_CONTENTS;

    render(html`
      <${CommandTelegraphicCompletions} stream=false />`
    );
    const triggerButton = await screen.findByText(TELEGRPAHIC_BUTTON_LABEL);
    expect(triggerButton).toBeInTheDocument();
    expect(triggerButton).toBeInstanceOf(HTMLButtonElement);
    expect(triggerButton.getAttribute("disabled")).toBeNull();

    const cancelButton = await screen.findByText(CANCEL_BUTTON_LABEL);
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toBeInstanceOf(HTMLButtonElement);
    expect(cancelButton.getAttribute("disabled")).toBeNull();

    const llmSelect = await document.getElementById(LLM_SELECT_ID) as HTMLSelectElement;
    expect(llmSelect.value).toBe(adaptivePaletteGlobals.LLMs[0]);
    const llmOptions = llmSelect.options as HTMLOptionsCollection;
    expect(llmOptions.length).toBe(3);
    for (let i=0; i < llmOptions.length; i++) {
      expect(llmOptions.item(i).value).toBe(adaptivePaletteGlobals.LLMs[i]);
    }
  });
});
