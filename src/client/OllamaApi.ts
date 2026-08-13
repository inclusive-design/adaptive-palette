/*
 * Copyright The Adaptive Palette copyright holders
 * See the AUTHORS.md file at the top-level directory of this distribution and at
 * https://github.com/inclusive-design/adaptive-palette/raw/main/AUTHORS.md.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import ollama, { ChatResponse, Ollama } from "ollama/browser";

export const NO_MODELS_MESSAGE = "No models available. Start Ollama to enable AI features.";

/**
 * Retrieve a list of models available from the service
 * @return {Promise<string[]>} - Array of the names of the available models.
 */
export async function getModelNames(): Promise<string[]> {
  try {
    const list = await ollama.list();
    return list.models.map((model) => model.name);
  } catch (error) {
    console.error("Failed to fetch Ollama models:", error);
    return [];
  }
}

/**
 * Function for passing the chat string and optionally a system prompt to the
 * ollama `chat()` service. The request can optionally ask that the response
 * be streamed or returned all at once.
 * @param {String} query        - The prompt string to query the service.
 * @param {String} modelName    - The name of the model to query.
 * @param {Boolean} streamResp  - Whether to stream the response or return it
 *                                all at once.
 * @param {String} systemPrompt - Optional system prompt, defaults to the
 *                                empty string.
 * @param {AbortSignal} abortSignal - Optional signal to cancel the request. `ollama-js`
 *                                does not pass a signal on the non-streaming path, so inject
 *                                AbortController.signal through a custom `fetch` on a
 *                                per-request client instead.
 *                                Rejects with a `DOMException` named `"AbortError"` when
 *                                the signal fires; callers that cancel deliberately should
 *                                not treat that as a failure.
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
export async function queryChat (query: string, modelName: string, streamResp: boolean, systemPrompt?: string, abortSignal?: AbortSignal): Promise<ChatResponse | AsyncIterable<ChatResponse>> {
  const messageArray = [];
  if (systemPrompt && systemPrompt.length !== 0) {
    messageArray.push({
      role: "system",
      content: systemPrompt
    });
  }
  messageArray.push({ role: "user", content: query });

  const request = {
    model: modelName,
    messages: messageArray,
    keep_alive: 15,
    think: false
  };

  // Because Ollama API only provides abort function for streaming requests which we don't use,
  // need to create a new Ollama client with a custom fetch function that includes the abort signal
  // so the cancellations don't affect other in-flight queries.
  const client = abortSignal
    ? new Ollama({ fetch: (input, init) => fetch(input, { ...init, signal: abortSignal }) })
    : ollama;

  // Workaround for TypeScript error TS2769:
  // `ollama.chat()` has overloads that require a literal `true` or `false` for the `stream` property.
  // Passing a dynamic boolean variable fails type checking.
  // We use an if/else block to pass the literal values explicitly and satisfy the compiler.
  // Ref: https://github.com/ollama/ollama-js/issues/78
  if (streamResp) {
    return await client.chat({ ...request, stream: true });
  } else {
    return await client.chat({ ...request, stream: false });
  }
}
