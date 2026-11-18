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

import type { ChatResponse} from "ollama/browser";
import ollama, { Ollama } from "ollama/browser";
import { t } from "../i18n/I18n";
import { adaptivePaletteGlobals } from "../state/GlobalData";

const LOCAL_HOSTNAMES = ["localhost", "127.0.0.1", "[::1]"];

/**
 * Whether the app is served from this computer, the only place Ollama can run.
 *
 * Away from these hostnames nothing may be sent to Ollama: a request from a public site to
 * this computer makes Chrome ask the user for permission to reach local services.
 *
 * It has since come to mark the desktop build generally, not only what may reach Ollama:
 * `installStorage()` reads it to decide whether the browser may keep the user's data at all.
 * It stays here because this is where it is defined and most used.
 * @param {string} hostname - The hostname to check. Defaults to the page's own.
 * @returns {boolean}
 */
export function isLocalHost (hostname: string = window.location.hostname): boolean {
  return LOCAL_HOSTNAMES.includes(hostname);
}

/**
 * The installed name of a model the configuration asks for, or `undefined` when it is not
 * installed. Ollama reports every model with a tag and gives an untagged pull the tag `latest`,
 * so a configuration that names `gemma4` is satisfied by `gemma4:latest`.
 * @param {string[]} available - The model names Ollama reports.
 * @param {string} wanted - The name the configuration asks for.
 * @returns {string | undefined}
 */
function installedName (available: string[], wanted: string): string | undefined {
  const withTag = wanted.includes(":") ? wanted : `${wanted}:latest`;
  return available.find((candidate) => candidate === wanted || candidate === withTag);
}

/**
 * Whether Ollama has a model. See `installedName()` for the tag rule.
 * @param {string[]} available - The model names Ollama reports.
 * @param {string} wanted - The name the configuration asks for.
 * @returns {boolean}
 */
export function hasModel (available: string[], wanted: string): boolean {
  return installedName(available, wanted) !== undefined;
}

/**
 * Choose the model to query: the configured one when Ollama has it, by the same rule
 * first-run setup checks with, otherwise the first available model. Warns only when a model
 * was named and is missing: an empty name means "whichever model Ollama reports first".
 * @param {string} configuredModel - The model name from the config, possibly empty.
 * @returns {string}
 * @throws {Error} When no models are available.
 */
export function pickModel (configuredModel: string): string {
  const { models } = adaptivePaletteGlobals;
  if (models.length === 0) {
    throw new Error(t("noModels"));
  }
  const installed = configuredModel === "" ? undefined : installedName(models, configuredModel);
  if (installed) {
    return installed;
  }
  if (configuredModel !== "") {
    console.warn(`Model "${configuredModel}" is not available; using "${models[0]}" instead.`);
  }
  return models[0];
}

/**
 * Retrieve a list of models available from the service.
 * @return {Promise<string[] | null>} - The names of the available models, or `null` when Ollama
 *                                      cannot be reached. An empty array means Ollama answered
 *                                      but has no models.
 */
export async function getModelNames(): Promise<string[] | null> {
  // The hosted site never reaches Ollama, so it reads as "not reachable".
  if (!isLocalHost()) {
    return null;
  }
  try {
    const list = await ollama.list();
    return list.models.map((model) => model.name);
  } catch (error) {
    console.error("Failed to fetch Ollama models:", error);
    return null;
  }
}

/**
 * Whether Ollama received a request but could not run the model: too little memory, an Ollama
 * too old for the model, or a broken download. Ollama answers these with a 5xx.
 *
 * `ollama-js` throws a `ResponseError` carrying `status_code` for an error answer, but does not
 * export the class, so it is recognized by name.
 * @param {unknown} error - What the request rejected with.
 * @returns {boolean}
 */
export function isModelRunFailure (error: unknown): boolean {
  if (!(error instanceof Error) || error.name !== "ResponseError") {
    return false;
  }
  const status = (error as Error & { status_code?: number }).status_code ?? 0;
  return status >= 500;
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
 * Send a query, and optionally a system prompt, to the Ollama `chat()` service, and return the
 * whole reply.
 * @param {String} query        - The prompt string to query the service.
 * @param {String} modelName    - The name of the model to query.
 * @param {String} systemPrompt - Optional system prompt; an empty one is not sent.
 * @param {AbortSignal} abortSignal - Optional signal to cancel the request. `ollama-js`
 *                                does not pass a signal on the non-streaming path, so inject
 *                                AbortController.signal through a custom `fetch` on a
 *                                per-request client instead.
 *                                Rejects with a `DOMException` named `"AbortError"` when
 *                                the signal fires; callers that cancel deliberately should
 *                                not treat that as a failure.
 * @return {Promise<ChatResponse>} - The reply.
 */
export async function queryChat (query: string, modelName: string, systemPrompt?: string, abortSignal?: AbortSignal): Promise<ChatResponse> {
  // The last check before a request leaves the page: a hosted page never reaches Ollama, even
  // when a caller forgets its own check.
  if (!isLocalHost()) {
    throw new Error(t("hosted"));
  }
  const messages = [];
  if (systemPrompt && systemPrompt.length !== 0) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: query });

  // No `keep_alive`: Ollama's default, or the user's `OLLAMA_KEEP_ALIVE`, keeps the model loaded
  // between requests.
  return await clientFor(abortSignal).chat({ model: modelName, messages, think: false, stream: false });
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
  if (!isLocalHost()) {
    throw new Error(t("hosted"));
  }
  const client = clientFor(abortSignal);

  const stream = await client.pull({ model: modelName, stream: true });
  for await (const part of stream) {
    if (typeof part.total === "number" && part.total > 0) {
      onProgress({ completed: part.completed ?? 0, total: part.total });
    }
  }
}
