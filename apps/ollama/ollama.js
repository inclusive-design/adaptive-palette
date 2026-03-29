/*
 * Copyright 2024-2026 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */
import { getModelNames, queryChat } from "../../src/client/ollamaApi";

// Default name of model used (aka, none).  Set in setSelectedModel() handler.
let nameOfModelToUse = "";
const USE_ALL_MODELS = "useAllModels";
const NO_AVAILABLE_MODELS = "No Available Models";
const STREAM_RESPONSE = true;

/**
 * Initialize the model <select> element's options:
 * - set the <select>'s options,
 * - enable/disable the <select> based on the use-all-models checkbox,
 * - set the `nameOfModelToUse` variable to one of:
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
 * @return {Boolean} - `true` if the "use all models" checkbox is checked;
 *                     `false` otherwise.
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
  return allModelsCheckbox.checked;
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
 * Handle click on the "use all models" checkbox.  This will eneable or disbale
 * the models <select> element and reset `nameOfModelToUse` as appropriate.
 */
function useAllModelsClicked () {
  const allModelsChecked = enableDisableModelSelect();
  if (allModelsChecked) {
    nameOfModelToUse = USE_ALL_MODELS;
  }
  else {
    nameOfModelToUse = document.getElementById("modelSelect").selectedOptions[0].label;
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
    const textFromSystemPrompt = document.getElementById("systemPrompt").value.trim();
    console.debug(`executeAsk(): promptText: ${promptText}`);
    console.debug(`  textFromSystemPrompt: ${textFromSystemPrompt}`);
    console.debug(`  modelInSelect: ${modelInSelect}`);
    const response = await queryChat(promptText, modelInSelect, STREAM_RESPONSE, textFromSystemPrompt);
    outputResult(response, document.getElementById("ollamaOutput"), "No Result");
  }
  else {
    outputResult([], document.getElementById("ollamaOutput"), "No Result");
  }
}

/**
 * Process the response from the ollama service and add it to the web page.
 * @param {Array} response    -  Array of objects, an ordered set of parts.
 * @param {Element} outputEl  -  The DOM element to put the entire resonse
 *                               message into.
 * @param {String} defaultMsg -  Optional default msssage when the `response`
 *                               is empty.
 */
async function outputResult(response, outputEl, defaultMsg) {
  outputEl.innerText = "";
  for await (const aPart of response) {
    console.debug(aPart.message.content);
    outputEl.innerText += aPart.message.content;
    document.body.scrollIntoView({behavior: "smooth", block: "end"});
  }
  if (outputEl.innerText === "") {
    outputEl.innerText = ( defaultMsg === undefined ? "LLM gave no results" : defaultMsg);
    document.body.scrollIntoView({behavior: "smooth", block: "end"});
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
 * @param {String} promptText - The prompt to query each model with.
 * @return {Number}           - The number of LLMs queried.
 */
async function queryEachModel (promptText) {
  const names = await getModelNames();
  let count = 0;
  names.forEach ((modelName) => {
    const textFromSystemPrompt = document.getElementById("systemPrompt").value.trim();
    queryChat(promptText, modelName, STREAM_RESPONSE, textFromSystemPrompt)
      .then(async (response) => {
        const outputEl = createOutputSection(modelName);
        await outputResult(response, outputEl, "No Result");
        count++;

        // Clear the general "Working..." message after all models have been
        // queried, and scroll to the bottom
        if (count === names.length) {
          outputResult([], document.getElementById("ollamaOutput"), "");
          document.body.scrollTop = document.body.scrollHeight;
        }
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
    // Rationale: if <section id=section_modelName ...> exists, it was created
    // the last time and, hence, so was its inner <p id=modelNmae_output ...>
    paragraph = document.getElementById(`${modelName}_output`);
  }
  return paragraph;
}

/**
 * Flush all of the model sections contents -- remove the sections.
 */
async function flushModelOutputSections () {
  const names = await getModelNames();
  names.forEach((modelName) => {
    document.getElementById(`section_${modelName}`)?.remove();
  });
  document.getElementById("ollamaOutput").innerText = "";
}

const justAskButton = document.getElementById("justAsk");
const singleSentenceButton = document.getElementById("singleSentence");
const promptTextArea = document.getElementById("prompt");

justAskButton.addEventListener("click", askClicked);
singleSentenceButton.addEventListener("click", askClicked);
document.getElementById("modelSelect").addEventListener("change", setSelectedModel);
document.getElementById("allModels").addEventListener("click", useAllModelsClicked);
document.getElementById("flushModelSections").addEventListener("click", flushModelOutputSections);
promptTextArea.addEventListener("input", setAskButtonsEnabledState);

// Set up the model <select> element
initModelSelect();

