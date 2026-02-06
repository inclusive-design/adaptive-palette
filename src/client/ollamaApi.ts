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

import { default as ollama, ChatResponse } from "ollama/browser";

/**
 * Retrieve a list of LLMs available from the service
 * @return {Array} - Array of the names of the available models.
 */
export async function getModelNames (): Promise<string[]> {
  const modelNames = [];
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
 * Function for passing the chat string and optionally a system prompt to the
 * ollama `chat()` service. The request can optionally ask that the response
 * be streamed or returned all at once.
 * @param {String} query        - The prompt string to query the service.
 * @param {String} modelName    - The name of the LLM to query.
 * @param {Boolean} streamResp  - Whether to stream the response or return it
 *                                all at once.
 * @param {String} systemPrompt - Optional system prompt, defaults to the
 *                                empty string.
 * @param Promise<ChatResponse | any>  - The response from the service. Note:
 *                                the value type <any> is technically
 *                                <<AbortableAsyncIterator<ChatResponse>>,
 *                                when the response is streamed; otherwise
 *                                just <ChatResponse>.  However, the ollama
 *                                module does not export the type
 *                                `AbortableAsyncIterator` yet.  See issues:
 *                                https://github.com/ollama/ollama-js/issues/135
 *                                https://github.com/ollama/ollama-js/issues/187
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function queryChat (query: string, modelName: string, streamResp: boolean, systemPrompt?: string): Promise<ChatResponse | any> {
  const messageArray = [];
  if (systemPrompt.length !== 0) {
    messageArray.push({
      role: "system",
      content: systemPrompt
    });
  }
  messageArray.push({ role: "user", content: query });

  // `ollama.chat()` is overloaded to support streaming vs. non-streaming and
  // disallows the following way of calling it when running tests using
  // jest/node:
  // ...
  //   const response = await ollama.chat({
  //    model: modelName,
  //    messages: messageArray,
  //    stream: streamResp,
  //    keep_alive: 15
  //   });
  // ...
  // The error does not occur when using `vite` to build the distribution.
  // Also, the error occurs when no call to `ollama.chat()` is made.  This
  // implies that a transpiler checker in the testing framework is reporting
  // the error, not any actual execution of the code.  The error is:
  // src/client/ollamaApi.ts:79:5 - error TS2769: No overload matches this call.
  //    Overload 1 of 2, '(request: ChatRequest & { stream: true; }): Promise<AbortableAsyncIterator<ChatResponse>>', gave the following error.
  //      Type 'boolean' is not assignable to type 'true'.
  //    Overload 2 of 2, '(request: ChatRequest & { stream?: false; }): Promise<ChatResponse>', gave the following error.
  //      Type 'boolean' is not assignable to type 'false'.
  //
  // 79     stream: streamResp,
  //        ~~~~~~
  // Related: https://github.com/ollama/ollama-js/issues/78
  // What does work, instead, is an if/else construct to set the `stream`
  // property explicitly to `true` or `false`.
  //
  const request = {
    model: modelName,
    messages: messageArray,
    keep_alive: 15
  };
  if (streamResp) {
    return await ollama.chat({ ...request, stream: true });
  }
  else {
    return await ollama.chat({ ...request, stream: false });
  }
}
