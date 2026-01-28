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

export const SELECT_ID          = "promptSelect";
export const TEXTAREA_ID        = "systemPrompt";
export const SUBMIT_VALUE       = "Save above prompt as:";
export const PROMPT_NAME_ID     = "promptName";

/**
 * Utility function for getting the prompts from `window.localStorage` while
 * hiding the parsing to an object.
 * @returns {Object} - The prompts
 */
function getStoredPrompts () {
  return JSON.parse(window.localStorage.getItem(SYSTEM_PROMPTS_KEY));
}

/**
 * Utility function for saving the prompts into `window.localStorage` while
 * hiding the stringification of the object.
 * @param {Object} - The prompts
 */
function updateStoredPrompts (prompts) {
  window.localStorage.setItem(SYSTEM_PROMPTS_KEY, JSON.stringify(prompts));
}

export function DialogPromptEntries (): VNode {

  const [systemPrompts, setSystemPrompts] = useState(getStoredPrompts());
  const [selectIndex, setSelectIndex] = useState(0);
  const promptNames = Object.keys(systemPrompts);

  // Utility to add a new prompt to the set of `systemPrompts`
  const addPrompt = (newKey, newPrompt) => {
    const newPrompts = getStoredPrompts();
    newPrompts[newKey] = newPrompt;
    setSystemPrompts(newPrompts);
    setSelectIndex(Object.keys(newPrompts).indexOf(newKey));
    updateStoredPrompts(newPrompts);
  };

  // Handle changes to the <select> menu
  const onSelectChange = (event: Event) => {
    event.preventDefault();
    const theSelect = event.target as HTMLSelectElement;
    setSelectIndex(theSelect.selectedIndex);
  };

  // Handle saving a new prompt
  const savePrompt = (event: Event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget as HTMLFormElement);
    const newPromptName = formData.get(PROMPT_NAME_ID) as string;
    const newPrompt = formData.get(TEXTAREA_ID) as string;
    if (newPromptName.length > 0 && newPrompt.length > 0) {
      addPrompt(newPromptName, newPrompt);
    }
  };

  // Create the <options>s for the <select>
  const options = [];
  promptNames.forEach( (aKey) => {
    options.push(html`<option value="${systemPrompts[aKey]}">${aKey}</option>`);
  });

  const thePrompt = systemPrompts[promptNames[selectIndex]];
  return html`
    <form class="dialogPromptEntries" onSubmit=${savePrompt}>
      <fieldset>
        <legend>Enter a prompt or choose one from the list</legend>
        <p>
          <label for="${SELECT_ID}">Choose a prompt:</label>
            <select id="${SELECT_ID}" value=${thePrompt} onchange=${onSelectChange}>
              ${options}
            </select>
        </p>
        <p>
          <label for="${TEXTAREA_ID}">Prompt:</label><br />
          <textarea id="${TEXTAREA_ID}" name="${TEXTAREA_ID}" rows="4" cols="90" value=${thePrompt} />
          <div>
            <input type="submit" value="${SUBMIT_VALUE}" />
            <input id="${PROMPT_NAME_ID}" name="${PROMPT_NAME_ID}" type="text" value="" style="margin-left: 1em" />
          </div>
        </p>
      </fieldset>
    </form>
  `;
}
