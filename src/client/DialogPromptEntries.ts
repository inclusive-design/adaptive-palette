/*
 * Copyright 2023-2024 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { render, VNode } from "preact";
import { html } from "htm/preact";

const prompts = {
  "What express": "What does this express?",
  "Single Sentence": "Convert the telegraphic speech to a single sentence. Give the top five best answers.  Answer with a single grammatically correct sentence.  Number the five answers clearly.  Do not add a preamble like, 'Here are the top five answers.'",
};

export function DialogPromptEntries (): VNode {

  // If this is the first time the prompt <select> is rendered, use the default
  // prompt.  Otherwise, use the currently selected item.
  let thePrompt = prompts["What express"];
  const theSelect = document.getElementById("promptSelect");
  if (theSelect) {
    thePrompt = theSelect.selectedOptions[0].label;
    console.log(`DialogPromptEntries() at start, prompt is ${thePrompt}`);
  }

  // Create <options>
  const options = [];
  Object.keys(prompts).forEach( (key) => {
    options.push(html`<option value="${prompts[key]}">${key}</option>`);
  });

  const formSubmit = (event) => {
    event.preventDefault();
    const promptNameFromField = document.getElementById("promptName").value;
    const promptToSave = document.getElementById("systemPrompt").value;
    if (promptNameFromField.length > 0 && promptToSave.length > 0) {
      console.log(`Saving ${promptNameFromField}: ${promptToSave}`);
      prompts[promptNameFromField] = promptToSave;
    }
    console.log("form submitted");
    // TODO redraw the select.  The following seems wrong.  Consider another
    // Preact component that is just the select?
    render(html`<${DialogPromptEntries} />`, document.getElementById("llm_prompt"));
  };

  const onSelectChange = (event) => {
    event.preventDefault();
    document.getElementById("systemPrompt").value = event.currentTarget.value;
  };

  return html`
    <form style="display:inline-grid; background:white" onSubmit=${formSubmit}>
      <fieldset style="display:inline-grid;" >
        <legend>Enter a prompt or choose one from the list</legend>
        <p>
          <label for="promptSelect">Choose a prompt:</label>
            <select id="promptSelect" onchange=${onSelectChange}>
              ${options}
            </select>
        </p>
        <p>
          <label for="systemPrompt">Prompt:</label><br />
          <textarea id="systemPrompt" name="systemPrompt" rows="4" cols="90" value=${thePrompt} />
          <div>
            <input type="submit" value="Save above prompt as:" />
            <input id="promptName" type="text" style="margin-left: 1em" />
          </div>
        </p>
      </fieldset>
    </form>
  `;
}
