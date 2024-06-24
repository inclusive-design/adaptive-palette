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

// Function to retrieve a list of LLM's available from the service
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

// Initialize the model <select> element's options.
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

// Set the enabled state of the model <select> based on the checked state of
// the "all models" checkbox.
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

// Handle model select element when a new selection is made.
function setSelectedModel () {
  const selectElement = document.getElementById("modelSelect");
  nameOfModelToUse = selectElement.selectedOptions[0].label;
}

// Handle the "use all models" checkbox
function useAllModels () {
  const allModelsChecked = enableDisableModelSelect();
  if (allModelsChecked.useAllModels) {
    nameOfModelToUse = USE_ALL_MODELS;
  }
  else {
    nameOfModelToUse = allModelsChecked.selectEl.selectedOptions[0].label;
  }
}

// Handle click on "Ask" buttons
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

// Function for passing the chat prompt using ollama service.
async function queryChat (query) {
  const message = { role: "user", content: query };
  const response = await ollama.chat({
    model: nameOfModelToUse,
    messages: [message],
    stream: true
  });
  return response;
}

// Handle the "Ask" button press
async function executeAsk (addSingleToPrompt) {
  let promptText = document.getElementById("prompt").value;
  if (addSingleToPrompt) {
    promptText += addSingleToPrompt;
  }
  console.debug(`executeAsk(): prompt is "${promptText}"`);
  const response = await queryChat(promptText);
  outputResult(response, document.getElementById("ollamaOutput"), "No Result");
}

// Process the response from the ollama service and put it on the web page
async function outputResult(response, outputEl) {
  let LlmOutput = "";
  for await (const aPart of response) {
    console.debug(aPart.message.content);
    LlmOutput += aPart.message.content;
  }
  outputEl.innerText = LlmOutput;
}

// Check if the input <textarea> is empty.
function isTextInputEmpty() {
  return promptTextArea.value.trim() === "";
}

// Enable/diable "Ask" buttons depending on whether the prompt input has
// any text in it or if there is an LLM to query.
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

