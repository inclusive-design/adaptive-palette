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

import { VNode } from "preact";
import { html } from "htm/preact";

import { CommandTelegraphicCompletions } from "./CommandTelegraphicCompletions";

const prompts = {
  "Default": "Convert the telegraphic speech to a single sentence. Give the top five best answers.  Answer with a single grammatically correct sentence.  Number the five answers clearly.  Do not add a preamble like, 'Here are the top five answers.'",
};

export function DialogPromptEntries (): VNode {

  // Start with the default prompt.
  let promptName = "Default";
  let thePrompt = prompts[promptName];

  const formSubmit = event => {
    console.log("form submitted");
  };

  const onSelectChange = (event) => {
    event.preventDefault();
    thePrompt = event.currentTarget.value;
    document.getElementById("systemPrompt").value = thePrompt;
  }

  return html`
    <form style="display:inline-grid;" onSubmit=${formSubmit}>
      <fieldset style="display:inline-grid;" >
        <legend>Enter a prompt or choose one from the list</legend>
        <p>
          <label for="promptSelect">Choose a prompt:</label>
            <select id="promptSelect">
              <option value="${thePrompt}">${promptName}</option>
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
//         <${CommandTelegraphicCompletions} model="llama3.1:latest" stream=false systemPrompt="${thePrompt}" />

//     <label for="promptSelect">Choose a prompt:</label>
//     <select id="promptSelect" >
//     <option value="None">None</option>
//     </select><br/>
//     <button>Save above prompt as:</button>
//     <input id="promptName" type="text"/>



//     <form style="display:inline-grid;" onSubmit=${formSubmit}>
//       <fieldset>
//        <legend>Enter a prompt or choose one from the list</legend>
//        <p>
//          <label>Prompt:</label>
//         <textarea id="systemPrompt" name="systemPrompt" rows="4" cols="100" />
//         </p>
//         <p>
//       </fieldset>
//     </form>

}

// Preact issues:
// 1. Cannot use <br> within a <form> element
// 2. Cannot use a variable to assign @value of a <textarea>, e.g. value=${const defaultPrompt}
// 3. The inline-grid style on <form> element is soft of ignore.
//     <form style="display:inline-grid;" onSubmit=${formSubmit}>
//       <fieldset style="display:inline-grid;" >
//         <legend>Enter a prompt or choose one from the list</legend>
//         <p>
//           <label for="systemPrompt">Prompt:</label><br>
//           <textarea name="systemPrompt" rows="4" cols="100" value=${defaultPrompt} />
//         </p>
//         <p>
//           <button>Save prompt as:</button>
//           <input id="promptName" type="text"/>
//           <label for="promptSelect">Choose a prompt:</label>
//           <select id="promptSelect">
//             <option value="None">None</option>
//           </select>
//         </p>
//       </fieldset>
//     </form>

