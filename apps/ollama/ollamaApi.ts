/*
 * Copyright 2024-2025 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import ollama from "ollama/browser";

/**
 * Retrieve a list of LLMs available from the service
 * @return {Array}    - Array of the names of the available models.
 */
export async function getModelNames () {
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
 * Function for passing the chat and optional system prompt to the ollama
 * service.
 * @param {String} query        - The prompt string to query the service with.
 * @param {String} modelName    - The name of the LLM to query.
 * @param {String} systemPrompt - Optionaal.
 * @return {Object}             - The response from the service.
 */
export async function queryChat (query: string, modelName: string, systemPrompt?: string): ChatResponse {
  let messageArray = [];
  const textFromSystemPrompt = document.getElementById("systemPrompt").value.trim();
  if (systemPrompt && systemPrompt !== "") {
    messageArray.push({
      role: "system",
      content: systemPrompt
    });
    console.debug(`queryChat(): system prompt is: "${systemPrompt}")`);
  }
  messageArray.push({ role: "user", content: query });
  const response = await ollama.chat({
    model: modelName,
    messages: messageArray,
    raw: true,
    stream: true,
    keep_alive: 15
  });
  return response;
}
