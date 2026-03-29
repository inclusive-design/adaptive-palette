/*
 * Copyright 2025-2026 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { VNode } from "preact";
import { html } from "htm/preact";
import { useState } from "preact/hooks";

import {
  adaptivePaletteGlobals, changeEncodingContents, sentenceCompletionsSignal
} from "./GlobalData";
import { TEXTAREA_ID } from "./DialogPromptEntries";
import { queryChat } from "./ollamaApi";

import "./CommandTelegraphicCompletions.scss";

export const TELEGRPAHIC_BUTTON_LABEL = "Telegraphic Completions";
export const CANCEL_BUTTON_LABEL      = "Cancel";
export const LLM_SELECT_ID            = "LLMSelect";
export const NO_MODELS_AVAILABLE      = "No models available";

type CommandTelegraphicCompletionsProps = {
  id: string,
  stream: boolean;
};

export function CommandTelegraphicCompletions (props: CommandTelegraphicCompletionsProps): VNode {

  const { stream } = props;

  // Initialize the LLM to use, and the <option>s for the LLM <select>.
  const llmDisabled = ( adaptivePaletteGlobals.LLMs.length > 0 ? false : true );
  const [selectedLLM, setSelectedLLM] = useState(
    ( llmDisabled ? NO_MODELS_AVAILABLE : adaptivePaletteGlobals.LLMs[0] )
  );
  const llmOptions = [];
  if (llmDisabled) {
    llmOptions.push(
      html`<option value="${selectedLLM}">${selectedLLM}</option>`
    );
  }
  else {
    adaptivePaletteGlobals.LLMs.forEach( (llm) => {
      llmOptions.push(html`<option value="${llm}">${llm}</option>`);
    });
  }
  const telegraphicButtonDisabled =
    llmDisabled || changeEncodingContents.value.payloads.length === 0;

  console.debug(`llmDisabled = ${llmDisabled}, telegraphicButtonDisabled = ${telegraphicButtonDisabled}`);

  // Allow the user to select an LLM
  const onLLMSelectChange = (event: Event) => {
    event.preventDefault();
    const LLMSelect = event.target as HTMLSelectElement;
    setSelectedLLM(LLMSelect.selectedOptions.item(0).label);
  };

  // Handler for getting completions from ollama and into the
  // `sentenceCompletionsSignal` signal's value.
  const getTelegraphicCompletions = async (event): Promise<void> => {
    event.preventDefault();
    // Empty out the response area
    sentenceCompletionsSignal.value = ["Working ..."];

    // Get the label texts from each symbol in `changeEncodingContents`
    const labelText = [];
    changeEncodingContents.value.payloads.forEach( (value) => {
      labelText.push(value.label);
    });
    const systemPrompt = (document.getElementById(TEXTAREA_ID) as HTMLTextAreaElement).value;
    const response = await queryChat(
      labelText.join(" "), selectedLLM, stream, systemPrompt
    );
    // Parse the query response messages into an array of strings.  Note that
    // with Llama3.1 each message is one of the suggested sentence completions.
    // That might just be luck.
    sentenceCompletionsSignal.value = response.message.content.split("\n");
    console.log(`getTelegraphicCompletions(), ${sentenceCompletionsSignal.value}`);
  };

  // Handler to remove all of the suggested completions.
  const removeSuggestions = (event): void => {
    event.preventDefault();
    sentenceCompletionsSignal.value = [];
  };

  return html`
    <p class="commandTelegraphicCompletions">
      <form>
        <fieldset>
          <legend>Ask an AI</legend>
          <label for="${LLM_SELECT_ID}">LLM: </label>
          <select id="${LLM_SELECT_ID}" disabled="${llmDisabled}" value=${selectedLLM} onchange=${onLLMSelectChange}>
            ${llmOptions}
          </select>
          <button onClick=${getTelegraphicCompletions} disabled="${telegraphicButtonDisabled}">
            ${TELEGRPAHIC_BUTTON_LABEL}
          </button>
          <button onClick=${removeSuggestions} disabled="${telegraphicButtonDisabled}">
            ${CANCEL_BUTTON_LABEL}
          </button>
        </fieldset>
      </form>
    </p>
  `;
}
