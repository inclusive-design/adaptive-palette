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
import "./DialogPromptEntries.scss";

type DialogPromptEntriesProps = {
  promptName?: string
}

export function DialogPromptEntries (props: DialogPromptEntriesProps): VNode {

  // Use `promptName` as a factor in determining the selected index of the
  // <select>.  Note: -1 means "nothing selected".
  const promptName = props.promptName;
  let selectSelectedIndex = -1;

  // (Re) Create <options> for the prompt <select>, based on the prompts
  // in `window.localStorage`.  If there is a `promptName`, use it to
  // determine the <select>'s selected index.
  const options = [];
  const localStore = window.localStorage;
  for (let i = 0; i < localStore.length; i++) {
    const theKey = localStorage.key(i);
    const optionValue = localStore.getItem(theKey);
    options.push(html`<option value="${optionValue}">${theKey}</option>`);
    if (theKey === promptName) {
      selectSelectedIndex = i;
    }
  }
  // If the prompt <select> exists (has been rendered at least once), determine
  // the currently selected prompt either (1) from the `promptName` and
  // `selectSelectedIndex` or (2) from the <select>'s current `selectedIndex`
  // property.
  let thePrompt = "";
  const theSelect = document.getElementById("promptSelect");
  if (theSelect) {
    if (promptName && selectSelectedIndex !== -1) {
      thePrompt = window.localStorage.getItem(promptName);
      theSelect.selectedIndex = selectSelectedIndex;
    }
    else {
      thePrompt = theSelect.options[theSelect.selectedIndex].value;
    }
  }
  // But, if this is the first time the prompt <select> is rendered, use the
  // first item in the <select>'s options as the current prompt, which is the
  // first item in the `window.localstorage`
  else {
    thePrompt = window.localStorage.getItem(window.localStorage.key(0));
  }

  const savePrompt = (event) => {
    event.preventDefault();
    const promptNameFromField = document.getElementById("promptName").value;
    const promptToSave = document.getElementById("systemPrompt").value;
    if (promptNameFromField.length > 0 && promptToSave.length > 0) {
      const localStore = window.localStorage;
      console.debug(`Saving ${promptNameFromField}: ${promptToSave}`);
      localStore.setItem(promptNameFromField, promptToSave);

      // Redraw the <form> so it includes and references the new prompt.
      render(html`<${DialogPromptEntries} promptName=${promptNameFromField}/>`, document.getElementById("llm_prompt"));
    }
  };

  const onSelectChange = (event) => {
    event.preventDefault();
    document.getElementById("systemPrompt").value = event.currentTarget.value;
  };

  return html`
    <form class="dialogPromptEntries" onSubmit=${savePrompt}>
      <fieldset>
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
