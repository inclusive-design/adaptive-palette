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
 * The client a request should go through.
 *
 * Ollama's own abort only covers streaming requests, so a cancellable request gets its own
 * client whose `fetch` carries the signal. Per-request, so cancelling one leaves the other
 * in-flight requests alone.
 * @param {AbortSignal} abortSignal - Optional signal cancelling this request.
 * @returns {Ollama} - A client for this request, or the shared one when nothing can cancel it.
 */
function clientFor (abortSignal?: AbortSignal): Ollama {
  return abortSignal
    ? new Ollama({ fetch: (input, init) => fetch(input, { ...init, signal: abortSignal }) })
    : ollama;
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

  const client = clientFor(abortSignal);

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

/**
 * How far a model download has got. `total` is always positive; a step that does not know
 * the size yet is not reported at all.
 */
export type PullProgressType = {
  completed: number,
  total: number
};

/**
 * Download a model into Ollama, reporting progress as it goes.
 *
 * The first steps of a pull carry no size -- Ollama is still fetching the manifest -- so
 * they are skipped rather than reported as a zero-length download, which would draw a full
 * progress bar for an instant.
 * @param {string} modelName - The model to pull, tag and all.
 * @param {Function} onProgress - Called for each step that carries a size.
 * @param {AbortSignal} abortSignal - Optional signal to cancel the download. As in
 *                                    `queryChat`, it is injected through a custom `fetch`
 *                                    on a client of its own so a cancellation cannot
 *                                    disturb any other request. Rejects with a
 *                                    `DOMException` named `"AbortError"` when it fires;
 *                                    a caller that cancelled deliberately should not treat
 *                                    that as a failure.
 * @returns {Promise<void>} - Resolves when the model is in place.
 */
export async function pullModel (
  modelName: string,
  onProgress: (progress: PullProgressType) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  const client = clientFor(abortSignal);

  const stream = await client.pull({ model: modelName, stream: true });
  for await (const part of stream) {
    if (typeof part.total === "number" && part.total > 0) {
      onProgress({ completed: part.completed ?? 0, total: part.total });
    }
  }
}
