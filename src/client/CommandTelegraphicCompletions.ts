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

export const TELEGRAPHIC_BUTTON_LABEL = "Telegraphic Completions";
export const CANCEL_BUTTON_LABEL      = "Cancel";
export const LLM_SELECT_ID            = "LLMSelect";
export const NO_MODELS_AVAILABLE      = "No models available";
export const WORKING_MESSAGE          = "Working ...";
export const CANNOT_COMPLETE_MESSAGE  = "Error: Could not get completions.";

type CommandTelegraphicCompletionsProps = {
  stream: boolean;
};

export function CommandTelegraphicCompletions(props: CommandTelegraphicCompletionsProps): VNode {
  const { stream } = props;

  const llmDisabled = adaptivePaletteGlobals.LLMs.length === 0;
  
  const [selectedLLM, setSelectedLLM] = useState(
    llmDisabled ? NO_MODELS_AVAILABLE : adaptivePaletteGlobals.LLMs[0]
  );
  const [isFetching, setIsFetching] = useState(false); // Added loading state

  // Declarative array mapping
  const llmOptions = llmDisabled
    ? [html`<option value=${selectedLLM}>${selectedLLM}</option>`]
    : adaptivePaletteGlobals.LLMs.map(
      (llm) => html`<option value=${llm}>${llm}</option>`
    );

  const telegraphicButtonDisabled =
    llmDisabled || changeEncodingContents.value.payloads.length === 0 || isFetching;

  const onLLMSelectChange = (event: Event) => {
    event.preventDefault();
    const target = event.target as HTMLSelectElement;
    setSelectedLLM(target.value);
  };

  const getTelegraphicCompletions = async (event: Event): Promise<void> => {
    event.preventDefault();
    
    setIsFetching(true);
    sentenceCompletionsSignal.value = [WORKING_MESSAGE];

    // Declarative extraction of labels
    const labelText = changeEncodingContents.value.payloads
      .map((value) => value.label)
      .join(" ");

    const systemPrompt = (document.getElementById(TEXTAREA_ID) as HTMLTextAreaElement)?.value || "";

    try {
      const response = await queryChat(labelText, selectedLLM, stream, systemPrompt);
      
      // Optional Chaining to prevent crashes if response is malformed
      const content = response?.message?.content || "";
      sentenceCompletionsSignal.value = content.split("\n");
      
    } catch (error) {
      console.error("Failed to fetch completions:", error);
      sentenceCompletionsSignal.value = [CANNOT_COMPLETE_MESSAGE];
    } finally {
      setIsFetching(false);
    }
  };

  const removeSuggestions = (event: Event): void => {
    event.preventDefault();
    sentenceCompletionsSignal.value = [];
  };

  return html`
    <!-- Changed <p> to <div> to fix HTML validation -->
    <div class="commandTelegraphicCompletions">
      <form>
        <fieldset>
          <legend>Ask an AI</legend>
          <label for=${LLM_SELECT_ID}>LLM: </label>
          <select 
            id=${LLM_SELECT_ID} 
            disabled=${llmDisabled || isFetching} 
            value=${selectedLLM} 
            onchange=${onLLMSelectChange}
          >
            ${llmOptions}
          </select>
          <button onClick=${getTelegraphicCompletions} disabled=${telegraphicButtonDisabled}>
            ${TELEGRAPHIC_BUTTON_LABEL}
          </button>
          <button onClick=${removeSuggestions} disabled=${llmDisabled}>
            ${CANCEL_BUTTON_LABEL}
          </button>
        </fieldset>
      </form>
    </div>
  `;
}
