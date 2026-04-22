/*
 * Copyright 2023-2026 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { VNode } from "preact";
import { html } from "htm/preact";
import { useState } from "preact/hooks";

import { SYSTEM_PROMPTS_KEY } from "./GlobalData";
import "./DialogPromptEntries.scss";

export const PROMPT_SELECT_ID   = "promptSelect";
export const TEXTAREA_ID        = "systemPrompt";
export const PROMPT_NAME_ID     = "promptName";
export const SUBMIT_VALUE        = "Save Prompt";
export const NEW_PROMPT_PLACEHOLDER_TEXT = "New prompt name";

type PromptsMap = Record<string, string>;

/**
 * Utility function for getting the prompts from `window.localStorage`.
 */
function getStoredPrompts(): PromptsMap {
  const stored = window.localStorage.getItem(SYSTEM_PROMPTS_KEY);
  // Prevent JSON.parse(null) crash
  return stored ? JSON.parse(stored) : {}; 
}

/**
 * Utility function for saving the prompts into `window.localStorage` while
 * hiding the stringification of the object.
 * @param {Object} - The prompts
 */
function updateStoredPrompts(prompts: PromptsMap) {
  window.localStorage.setItem(SYSTEM_PROMPTS_KEY, JSON.stringify(prompts));
}

export function DialogPromptEntries(): VNode {
  const [systemPrompts, setSystemPrompts] = useState<PromptsMap>(getStoredPrompts());
  
  const promptNames = Object.keys(systemPrompts);
  const firstPromptKey = promptNames[0];
  
  // Track the selected key separately from the text being edited
  const [selectedKey, setSelectedKey] = useState<string>(firstPromptKey || "");
  const [thePrompt, setThePrompt] = useState<string>(systemPrompts[firstPromptKey] || "");

  const addPrompt = (newKey: string, newPrompt: string) => {
    // Copy current state instead of reading from localStorage again
    const newPrompts = { ...systemPrompts, [newKey]: newPrompt };
    setSystemPrompts(newPrompts);
    setSelectedKey(newKey);
    setThePrompt(newPrompt);
    updateStoredPrompts(newPrompts);
  };

  const onPromptSelectChange = (event: Event) => {
    const promptSelect = event.target as HTMLSelectElement;
    const newKey = promptSelect.value;
    setSelectedKey(newKey);
    setThePrompt(systemPrompts[newKey]); // Update textarea text
  };

  // Handle saving a new prompt
  const savePrompt = (event: Event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    
    const newPromptName = formData.get(PROMPT_NAME_ID) as string;
    const newPromptText = formData.get(TEXTAREA_ID) as string;
    
    if (newPromptName.trim().length > 0 && newPromptText.trim().length > 0) {
      addPrompt(newPromptName, newPromptText);
      // Clear the input field
      (form.elements.namedItem(PROMPT_NAME_ID) as HTMLInputElement).value = "";
    }
  };

  const promptOptions = promptNames.map(key => html`
    <option key=${key} value=${key}>${key}</option>
  `);

  return html`
    <form class="dialogPromptEntries" onSubmit=${savePrompt}>
      <fieldset>
        <legend>Enter a prompt or choose one from the list</legend>
        <div class="field-row">
          <label for="${PROMPT_SELECT_ID}">Choose a prompt: </label>
          <select 
            id="${PROMPT_SELECT_ID}" 
            value=${selectedKey} 
            onChange=${onPromptSelectChange}
            disabled=${promptNames.length === 0}
          >
            ${promptOptions.length > 0 ? promptOptions : html`<option>No prompts found</option>`}
          </select>
        </div>
        
        <div class="field-row">
          <label for="${TEXTAREA_ID}">Prompt:</label><br />
          <textarea 
            id="${TEXTAREA_ID}" 
            name="${TEXTAREA_ID}" 
            rows="4" 
            cols="90" 
            value=${thePrompt}
            onInput=${(e: Event) => setThePrompt((e.target as HTMLTextAreaElement).value)}
          ></textarea>
          
          <div>
            <input type="submit" value="${SUBMIT_VALUE}" />
            <input 
              id="${PROMPT_NAME_ID}" 
              name="${PROMPT_NAME_ID}" 
              type="text" 
              placeholder="${NEW_PROMPT_PLACEHOLDER_TEXT}"
            />
          </div>
        </div>
      </fieldset>
    </form>
  `;
}
