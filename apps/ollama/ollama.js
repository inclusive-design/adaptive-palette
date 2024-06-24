/*
 * Copyright 2024 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import ollama from "ollama/browser";

// Default name of model used (aka, none).  Set in setSelectedModel() handler.
let nameOfModelToUse = "";
const USE_ALL_MODELS = "useAllModels";
const NO_AVAILABLE_MODELS = "No Available Models";
const OUTPUT_DIV_TEMPLATE = "<div>"

/**
 * Retrieve a list of LLMs available from the service
 * @return {Array}    - Array of the names of the available models.
 */
async function getModelNames () {
  let modelNames = [];
  try {
    const list = await ollama.list();
    list.models.forEach( (model) => {
      modelNames.push(model.name);
    });
  }
  catch (error) {
    console.debug(error);
  }
  return modelNames;
}

/**
 * Initialize the model <select> element's options:
 * - set the <select>'s options,
 * - enable/disable the <select> based on the use-all-models checkbox,
 * - set the `nmeeOfModelToUse` variable to one of:
 *   - a single model name,
 *   - `USE_ALL_MODELS`,
 *   - `NO_AVAILABLE_MODELS`
 */
async function initModelSelect () {
  const selectElement = document.getElementById("modelSelect");
  const modelNames = await getModelNames();

  if (modelNames.length === 0) {
    selectElement.add(new Option("No Available Models"));
  }
  else {
    modelNames.forEach( (aName) => {
      selectElement.add(new Option(aName));
    });
  }
  // Set the enabled/disabled state of the <select> based on whether the "use
  // all models" checkbox is checked.  Then set `nameOfModelToUse` either to
  // the <select>'s first item, or to the special USE_ALL_MODELS.
  if (enableDisableModelSelect()) {
    nameOfModelToUse = USE_ALL_MODELS;
  }
  else {
    nameOfModelToUse = selectElement.item(0).label;
  }
  // Make sure the enabled state of the "Ask" buttons is correct.  This is
  // mostly for a refresh of the page.
  setAskButtonsEnabledState();
}

/**
 * Set the enabled state of the model <select> based on the checked state of
 * the "use all models" checkbox.
 * @return {Object} - An object containing a boolean and a reference to the
 *                    <select> DOM element.  The boolean is `true` if the
 *                    "use all models" checkbox is checked, and `false`
 *                    otherwise.
 */
function enableDisableModelSelect () {
  const selectElement = document.getElementById("modelSelect");
  const allModelsCheckbox = document.getElementById("allModels");
  if (allModelsCheckbox.checked) {
    selectElement.setAttribute("disabled", "disabled");
  }
  else {
    selectElement.removeAttribute("disabled");
  }
  // Return the checked state of the checkbox and the select element itself
  return { useAllModels: allModelsCheckbox.checked, selectEl: selectElement };
}

/**
 * Handle model select element when a new selection is made.  Set the value of
 * `nameOfModelToUse` based on the selection.
 */
function setSelectedModel () {
  const selectElement = document.getElementById("modelSelect");
  nameOfModelToUse = selectElement.selectedOptions[0].label;
}

/**
 * Handle clicke on the "use all models" checkbox.  This will eneable or disbale
 * the models <select> element and reset `nameOfModelToUse` as appropriate.
 */
function useAllModels () {
  const allModelsStatus = enableDisableModelSelect();
  if (allModelsStatus.useAllModels) {
    nameOfModelToUse = USE_ALL_MODELS;
  }
  else {
    nameOfModelToUse = allModelsStatus.selectEl.selectedOptions[0].label;
  }
}

/**
 * Handle click on both of the "Ask" buttons.  The two buttons are "Ask" and
 * "Answer with a single grammatically correct sentence".
 * @param {Event} event - The event that invoked the "Ask" button.  The `target`
 *                        member determine which "Ask" button was invoked.
 */
function askClicked(event) {
  const singleSentence = "Answer with a single grammatically correct sentence.";
  // Empty out the response area
  document.getElementById("ollamaOutput").innerText = "Working...";
  if (event.target.id === "singleSentence") {
    executeAsk(singleSentence);
  }
  else {
    executeAsk();
  }
}

/**
 * Function for passing the chat prompt to the ollama service.
 * @param {String} query      - The prompt string to query the service with.
 * @param {String} modelName  - The name of the LLM to query.
 * @return {Object}           - The response from the service.
 */
async function queryChat (query, modelName) {
  const message = { role: "user", content: query };
  const response = await ollama.chat({
    model: modelName,
    messages: [message],
    stream: true
  });
  return response;
}

/**
 * Handle the "Ask" button press by contructing a prompt from the text area
 * input and which of the "Ask" buttons was pressed.  Query the service with
 * that prompt, and output the result to the bottom of the page.
 * @param {String} addSingleToPrompt -  Optional text to append to the
 *                                      prompt, e.g., "Answer with a single
 *                                      grammatically correct sentence".
 */
async function executeAsk (addSingleToPrompt) {
  const modelInSelect = document.getElementById("modelSelect").selectedOptions[0].label;
  let promptText = document.getElementById("prompt").value;
  if (addSingleToPrompt) {
    promptText += addSingleToPrompt;
  }
  console.debug(`executeAsk(): prompt is "${promptText}"`);
  if (document.getElementById("allModels").checked) {
    queryEachModel(promptText);
  }
  else if (modelInSelect !== NO_AVAILABLE_MODELS) {
    const response = await queryChat(promptText, modelInSelect);
    outputResult(response, document.getElementById("ollamaOutput"), "No Result");
  }
  else {
    outputResult([], document.getElementById("ollamaOutput"), "No Result");
  }
}

/**
 * Process the response from the ollama service and add it to the web page.
 * @param {Array} response -    Array of objects, an ordered set of parts.
 * @param {Element} outputEl -  The DOM element to put the entire resonse
 *                              message into.
 */
async function outputResult(response, outputEl) {
  let LlmOutput = "";
  for await (const aPart of response) {
    console.debug(aPart.message.content);
    LlmOutput += aPart.message.content;
  }
  if (LlmOutput === "") {
    outputEl.innerText = "LLM gave no results";
  }
  else {
    outputEl.innerText = LlmOutput;
  }
}

/**
 * Check if the input <textarea> is empty.
 * @return {Boolean} -  `true` if the <textarea> is empty; `false` otherwise.
 */
function isTextInputEmpty() {
  return promptTextArea.value.trim() === "";
}

/**
 * Enable/diable "Ask" buttons depending on whether (1) the prompt input has any
 * text in it or (2) if there is an LLM to query.
 */
function setAskButtonsEnabledState() {
  if (isTextInputEmpty() || nameOfModelToUse === "No Available Models") {
    justAskButton.setAttribute("disabled", "disabled");
    singleSentenceButton.setAttribute("disabled", "disabled");
  }
  else {
    justAskButton.removeAttribute("disabled");
    singleSentenceButton.removeAttribute("disabled");
  }
}

/**
 * Loop through the available models, passing the same prompt to each, and
 * add the response to the document.
 * @param {String} promppText - The prompt to query each model with.
 */
async function queryEachModel (promptText) {
  const names = await getModelNames();
  names.forEach ((modelName) => {
     queryChat(promptText, modelName)
     .then((response) => {
       const outputEl = createOutputSection(modelName);
       outputResult(response, outputEl, "No Result");
     });
  });
}

/**
 * Create a section for outputting the results of querying one LLM.
 * @param {String} modelName  - The name of the model, used for a heading
 * @return {Element}          - The DOM element where the response for the
 *                              model will be output to.
 */
function createOutputSection(modelName) {
  let sectionEl = document.getElementById(`section_${modelName}`);
  let paragraph = null;
  if (!sectionEl) {
    sectionEl = document.createElement("section");
    document.body.appendChild(sectionEl);
    sectionEl.setAttribute("id", `section_${modelName}`);

    const heading = document.createElement("h2");
    sectionEl.appendChild(heading);
    heading.append(`${modelName}`);

    paragraph = document.createElement("p");
    paragraph.setAttribute("id", `${modelName}_output`);
    paragraph.append("Working ...");
    sectionEl.appendChild(paragraph);
  }
  else {
    // Rationale: if <esction id=secton_modelName ...> exists, it was created
    // the last time and, hence, so was its inner <p id=modelNmae_output ...>
    paragraph = document.getElementById(`${modelName}_output`);
  }
  return paragraph;
}

const justAskButton = document.getElementById("justAsk");
const singleSentenceButton = document.getElementById("singleSentence");
const promptTextArea = document.getElementById("prompt");

justAskButton.addEventListener("click", askClicked);
singleSentenceButton.addEventListener("click", askClicked);
document.getElementById("modelSelect").addEventListener("change", setSelectedModel);
document.getElementById("allModels").addEventListener("click", useAllModels);
promptTextArea.addEventListener("input", setAskButtonsEnabledState);

// Set up the model <select> element
initModelSelect();

