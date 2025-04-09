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

import { VNode } from "preact";
import { html } from "htm/preact";

import { changeEncodingContents, sentenceCompletionsSignal } from "./GlobalData";
import { queryChat } from "./ollamaApi";

type CommandTelegraphicCompletionsProps = {
  id: string,
  model: string,
  stream: boolean,
};

export function CommandTelegraphicCompletions (props: CommandTelegraphicCompletionsProps): VNode {

  const { model, stream } = props;
  console.log(`CommandTelegraphicCompletions(), props: ${model}, ${stream}, ${systemPrompt}`);

  // Handler for getting completions from ollama and into the
  // `sentenceCompletionsSignal` signal's value.
  const getTelegraphicCompletions = async (event): void => {
    event.preventDefault();
    // Empty out the response area
    sentenceCompletionsSignal.value = ["Working ..."];

    // Get the label texts from each symbol in `changeEncodingContents`
    const labelText = [];
    changeEncodingContents.value.forEach( (value) => {
      labelText.push(value.label);
    });
    const systemPrompt = document.getElementById("systemPrompt").value;
    const response = await queryChat(
      labelText.join(" "), model, stream, systemPrompt
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
    <p>
      <button onClick=${getTelegraphicCompletions} style="font-size: 1em;">
        Telegraphic Completions
      </button>
      <span style="visibility: hidden">F</span>
      <button onClick=${removeSuggestions} style="font-size: 1em;">
        Cancel
      </button>
    </p>
  `;
}
