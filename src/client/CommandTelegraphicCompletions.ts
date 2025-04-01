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

import { changeEncodingContents } from "./GlobalData";
import { queryChat } from "./ollamaApi";
import { sentenceCompletionsSignal } from "./GlobalData";
// import { BlissSymbol } from "./BlissSymbol";
// import { ContentBmwEncodingType } from "./index.d";
// import { generateGridStyle } from "./GlobalUtils";
// import "./ContentBmwEncoding.scss";

// TODO: put these in the `CommandTelegraphicCompletionsProps`
const MODEL_NAME = "llama3.1:latest";
const STREAM_RESPONSE = false;
const SYSTEM_PROMPT = "Convert the telegraphic speech to a single sentence.  \
  Give the top five best answers.  Answer with a single grammatically correct\
  sentence.  Number the five answers clearly.  Do not add a preamble like,\
  'Here are the top five answers.'";

type CommandTelegraphicCompletionsProps = {
  id: string,
  model: string,
  stream: boolean,
  systemPrompt: string
};

export function CommandTelegraphicCompletions (props: CommandTelegraphicCompletionsProps): VNode {

  const { model, stream, systemPrompt} = props;
  console.log(`CommandTelegraphicCompletions(), props: ${model}, ${stream}, ${systemPrompt}`);

  // Handler for getting completions from ollama and into the
  // `sentenceCompletionsSignal` signal's value.
  const getTelegraphicCompletions = async (): void => {
    // ? Create another signal like `changeEndcodingContents`.  Call it
    // ? `telegraphicSuggestions`.  It is a list of sentence suggestions
    // ? returned by the `ollama.chat() call`.

    // Empty out the response area
    const suggestionEl = document.getElementById("llm_suggestions");
    suggestionEl.innerText = "Working...";

    // Get the label text from `changeEncodingContents` and
    const labelText = [];
    changeEncodingContents.value.forEach( (value) => {
      labelText.push(value.label);
    });
    console.log(`getTelegraphicCompletions() handler, ${labelText.join(" ")}`);
    const response = await queryChat(
      labelText.join(" "), MODEL_NAME, STREAM_RESPONSE, SYSTEM_PROMPT
    );
    // Parse the messages into an array
    sentenceCompletionsSignal.value = response.message.content.split("\n");
    // Dump the response text to the window.
    suggestionEl.innerText = sentenceCompletionsSignal.value.join("\n");
    console.log(response);
  };

  return html`
    <button onClick=${getTelegraphicCompletions}>
      Telegraphic Completions
    </button>
  `;
}
