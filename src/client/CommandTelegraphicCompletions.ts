/*
 * Copyright 2025 Inclusive Design Research Centre, OCAD University
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

import { changeEncodingContents, sentenceCompletionsSignal } from "./GlobalData";
import { TEXTAREA_ID } from "./DialogPromptEntries";
import { queryChat } from "./ollamaApi";

import "./CommandTelegraphicCompletions.scss";

export const TELEGRPAHIC_BUTTON_LABEL = "Telegraphic Completions";
export const CANCEL_BUTTON_LABEL = "Cancel";

type CommandTelegraphicCompletionsProps = {
  id: string,
  model: string,
  // This should be a boolean type, but for Preact/html the type of the value is
  // string.  It should be "true" or "false".
  stream: ("true" | "false")
};

export function CommandTelegraphicCompletions (props: CommandTelegraphicCompletionsProps): VNode {

  const { model, stream } = props;
  const streamAsBoolean = ( stream === "true" ? true : false );

  // Handler for getting completions from ollama and into the
  // `sentenceCompletionsSignal` signal's value.
  const getTelegraphicCompletions = async (event): Promise<void> => {
    event.preventDefault();
    // Empty out the response area
    sentenceCompletionsSignal.value = ["Working ..."];

    // Get the label texts from each symbol in `changeEncodingContents`
    const labelText = [];
    changeEncodingContents.value.forEach( (value) => {
      labelText.push(value.label);
    });
    const systemPrompt = (document.getElementById(TEXTAREA_ID) as HTMLTextAreaElement).value;
    const response = await queryChat(
      labelText.join(" "), model, streamAsBoolean, systemPrompt
    );
    // Parse the query response messages into an array of strings.  Note that
    // with Llama3.1 each message is one of the suggested sentence completions.
    // That might just be luck.
    sentenceCompletionsSignal.value = response.message.content.split("\n");
    console.log(`getTelegraphicCompletions(), ${sentenceCompletionsSignal.value}`);
  };

  // Handler to remove all of the suggested completions.
  const removeSuggestions = (): void => {
    sentenceCompletionsSignal.value = [];
  };

  return html`
    <p class="commandTelegraphicCompletions">
      <button onClick=${getTelegraphicCompletions}>
        ${TELEGRPAHIC_BUTTON_LABEL}
      </button>
      <span style="visibility: hidden">F</span>
      <button onClick=${removeSuggestions}>
        ${CANCEL_BUTTON_LABEL}
      </button>
    </p>
  `;
}
