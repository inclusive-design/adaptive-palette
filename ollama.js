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

import ollama from 'ollama/browser';

console.debug("%O", ollama);
console.debug(`Ollama import: ${window.ollama}`);

const ollamaService = "http://localhost:11434";
console.debug(`ollamaService is ${ollamaService}`);

function foobar(x) {
  return x;
}
console.log(foobar(5));

// Handle click on "Ask" button
function askClicked(event) {
  const single = "Answer with a single grammatically correct sentence."
  console.debug("Button clicked");
  // Empty out the response area
  document.getElementById("phi3Output").innerText = "Working...";
  debugger;
  if (event.target.id === "single") {
    executeAsk(single);
  }
  else {
    executeAsk();
  }
};

// Function for passing the chat prompt to phi-3 using ollama service.
async function queryChat (query) {
  const message = { role: "user", content: query };
  const response = await ollama.chat({
    model: "phi3",
    messages: [message],
    stream: true
  });
  console.log(`response status: ${response.status}`);
  debugger;
  return response;
};

// Handle the "Ask" button press
async function executeAsk (addSingleToPrompt) {
  let promptText = document.getElementById("prompt").value;
  if (addSingleToPrompt) {
    promptText += addSingleToPrompt;
  }
  console.debug(`executeAsk(): prompt is "${promptText}"`);
  response = await queryChat(promptText);
  outputResult(response, document.getElementById("phi3Output"), "No Result");
}

// Process the response from the ollama service and put it on the web page
async function outputResult(response, outputEl, defaultOutput) {
  // TODO: response is of type 'application/nd-json'.  Either figure
  // a way to configure ollama to return plain json or use response.ndjson()
  // function.
  const responseString = await response.text();
  const arrayOfParts = responseString.split("\n");

  let phi3Output = "";
  arrayOfParts.forEach(function (part) {
    try {
      const aPart = JSON.parse(part);
      console.debug(aPart.message.content);
      phi3Output += `${aPart.message.content}`;
    }
    catch (error) {
      console.error(error.message);
    }
  });
  outputEl.innerText = phi3Output;
};

debugger;

document.getElementById("justAsk").addEventListener("click", askClicked);
document.getElementById("single").addEventListener("click", askClicked);

