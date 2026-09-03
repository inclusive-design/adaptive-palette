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

import { VNode } from "preact";
import { html } from "htm/preact";
import { useRef, useState } from "preact/hooks";

import { ModalDialog } from "../../components/ModalDialog";
import { PullProgressType, getModelNames, pullModel } from "../../core/OllamaApi";
import { adaptivePaletteGlobals } from "../../state/GlobalData";
import { missingModels, reloadPage, setupDismissedSignal, setupStatus } from "./SetupState";
import "./FirstRunSetup.scss";

export const SETUP_DIALOG_ID = "firstRunSetupDialog";
export const OLLAMA_DOWNLOAD_URL = "https://ollama.com/download";
export const SETUP_TITLE = "Set up the AI features";
export const NO_OLLAMA_TEXT = "The AI features need Ollama, which is not running on this computer. Install it, start it, then choose Try again.";
export const INSTALL_LABEL = "Install Ollama";
export const RETRY_LABEL = "Try again";
export const DOWNLOAD_LABEL = "Download";
export const CANCEL_LABEL = "Cancel";
export const CONTINUE_LABEL = "Continue without AI features";
export const PULL_FAILED_TEXT = "The download did not finish. Check that Ollama is still running, then try again.";

/**
 * The accessible name of the progress bar: an unnamed one is announced as nothing but
 * "progress bar", and the number beside it as a number with no noun.
 * @param {string[]} models - The models being downloaded.
 * @returns {string}
 */
export const PROGRESS_LABEL = (models: string[]): string =>
  `Downloading ${models.join(" and ")}`;

/**
 * What the dialog says about the models that have to be downloaded.
 * @param {string[]} models - The missing model names.
 * @returns {string}
 */
export const MISSING_MODEL_TEXT = (models: string[]): string =>
  `The AI features need ${models.join(" and ")}, which Ollama has not got yet. ` +
  "It is a large download and only has to be done once.";

/**
 * The first-run dialog: install Ollama, or download the model the configuration asks for.
 *
 * It appears whenever the conditions hold rather than on a stored "first run" flag, so a
 * tester whose model is later deleted is offered it again.
 *
 * It never blocks. Every state offers "Continue without AI features", because the palette
 * already works without a model and an AAC user must not be shut out of the device they
 * talk with.
 *
 * A finished download reloads the page rather than updating state in place: the model list
 * is read once at start-up by everything that uses it, and reloading is how the rest of the
 * app already picks up a change of that size.
 * @returns {VNode}
 */
export function FirstRunSetup (): VNode {
  const { config } = adaptivePaletteGlobals;
  // `adaptivePaletteGlobals.models` is a plain mutable field, not a signal, so reassigning it
  // triggers no re-render on its own. Holding a copy in state -- and always setting it to the
  // fresh array `getModelNames()` returns -- is what makes `retry()`'s result actually reach
  // the screen: a `useState` setter bails out on a value that is reference-equal to the
  // current one, which a re-read of the same mutable field would be.
  const [models, setModels] = useState(adaptivePaletteGlobals.models);
  const [progress, setProgress] = useState<PullProgressType | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const status = setupStatus(config, models);
  const missing = missingModels(config, models);
  const isOpen = status !== "ready" && !setupDismissedSignal.value;

  const dismiss = (): void => {
    abortRef.current?.abort();
    setupDismissedSignal.value = true;
  };

  // Ollama may have been started since the app loaded. Reloading is what lets every
  // feature see the models, so it is only done once there is something to see.
  const retry = (): void => {
    void getModelNames().then((found) => {
      adaptivePaletteGlobals.models = found;
      if (setupStatus(config, found) === "ready") {
        reloadPage();
      } else {
        // The check came back with something other than "ready" -- still down, or up but
        // still missing a model. Either way `found` is what makes the screen catch up.
        setModels(found);
        setHasFailed(false);
        setProgress(null);
      }
    });
  };

  const download = (): void => {
    const controller = new AbortController();
    abortRef.current = controller;
    setHasFailed(false);
    setIsPulling(true);
    setProgress(null);

    const pullEach = async (): Promise<void> => {
      for (const model of missing) {
        await pullModel(model, setProgress, controller.signal);
      }
      const found = await getModelNames();
      adaptivePaletteGlobals.models = found;
      reloadPage();
    };

    void pullEach().catch((error: unknown) => {
      setIsPulling(false);
      setProgress(null);
      // A cancel is the tester's own decision, not a failure to report back to them.
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.error(`The model could not be downloaded: ${String(error)}`);
      setHasFailed(true);
    });
  };

  const cancel = (): void => {
    abortRef.current?.abort();
    setIsPulling(false);
    setProgress(null);
  };

  // The percent below is deliberately not in a live region: a multi-gigabyte pull steps
  // through up to a hundred whole percents, and announcing each one would be all a screen
  // reader user could hear for the duration. The labelled bar carries the same figure on
  // demand, in `aria-valuetext`.
  const percent = progress && progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  const body = status === "noOllama"
    ? html`
      <p>${NO_OLLAMA_TEXT}</p>
      <div class="firstRunSetupChoices">
        <a class="firstRunSetupInstall" href=${OLLAMA_DOWNLOAD_URL} target="_blank" rel="noreferrer">${INSTALL_LABEL}</a>
        <button type="button" onClick=${retry}>${RETRY_LABEL}</button>
        <button type="button" onClick=${dismiss}>${CONTINUE_LABEL}</button>
      </div>
    `
    : html`
      <p>${MISSING_MODEL_TEXT(missing)}</p>
      ${isPulling && html`
        <div class="firstRunSetupProgress">
          <progress
            aria-label=${PROGRESS_LABEL(missing)}
            aria-valuetext=${`${percent}% downloaded`}
            max=${progress?.total ?? 1}
            value=${progress?.completed ?? 0}></progress>
          <p>${percent}% downloaded</p>
        </div>
      `}
      ${hasFailed && html`<p class="firstRunSetupFailure" role="alert">${PULL_FAILED_TEXT}</p>`}
      <div class="firstRunSetupChoices">
        ${isPulling
    ? html`<button type="button" onClick=${cancel}>${CANCEL_LABEL}</button>`
    : html`<button type="button" class="firstRunSetupDownload" onClick=${download}>${DOWNLOAD_LABEL}</button>`}
        <button type="button" onClick=${dismiss}>${CONTINUE_LABEL}</button>
      </div>
    `;

  return html`
    <${ModalDialog}
      id=${SETUP_DIALOG_ID}
      title=${SETUP_TITLE}
      isOpen=${isOpen}
      onClose=${dismiss}>
      ${body}
    <//>
  `;
}
