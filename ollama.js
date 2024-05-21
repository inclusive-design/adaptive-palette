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

import ollama from 'ollama/browser';

console.debug("%O", ollama);
console.debug(`Ollama import: ${window.ollama}`);

const ollamaService = "http://localhost:11434";

// Handle click on "Ask" buttons
function askClicked(event) {
  const singleSentence = "Answer with a single grammatically correct sentence."
  // Empty out the response area
  document.getElementById("ollamaOutput").innerText = "Working...";
  if (event.target.id === "singleSentence") {
    executeAsk(singleSentence);
  }
  else {
    executeAsk();
  }
};

// Function for passing the chat prompt using ollama service.
async function queryChat (query) {
  const message = { role: "user", content: query };
  const response = await ollama.chat({
    model: "phi3",
    messages: [message],
    stream: true
  });
  return response;
};

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
async function outputResult(response, outputEl, defaultOutput) {
  let LlmOutput = "";
  for await (const aPart of response) {
    console.debug(aPart.message.content);
    LlmOutput += aPart.message.content;
  }
  outputEl.innerText = LlmOutput;
};

document.getElementById("justAsk").addEventListener("click", askClicked);
document.getElementById("singleSentence").addEventListener("click", askClicked);

