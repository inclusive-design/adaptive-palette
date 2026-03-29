/*
 * Copyright 2026 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

import { render, screen } from "@testing-library/preact";
import "@testing-library/jest-dom";
import { html } from "htm/preact";

import { sentenceCompletionsSignal } from "./GlobalData";
import { SentenceCompletionsPalette, SENTENCE_COMPLETIONS_NAME } from "./SentenceCompletionsPalette";

describe("SentenceCompletionsPalette render tests", (): void => {

  const WORKING_MESSAGE = "Working...";
  const SUGGESTED_COMPLETIONS = [
    "1. I'm funny when I swim with my little brother",
    "2. Swimming with my brother is really fun for me",
    "3. My brother and I are happy when we play in the water",
    "4. I am a funny person when I play in the water",
    "My brother thinks I'm funny when we splash in the water"
  ];

  test("Sentence completions signal value is WORKING_MESSAGE", async (): Promise<void> => {

    sentenceCompletionsSignal.value = [WORKING_MESSAGE];
    render(html`<${SentenceCompletionsPalette} />`);

    // The `WORKING_MESSAGE` should be in the document, but not a completions
    // palette.
    expect(await screen.findByText(WORKING_MESSAGE)).toBeVisible();
    expect(document.querySelector(`[data-palettename="${SENTENCE_COMPLETIONS_NAME}"]`)).toBeNull();
  });

  test("Sentence completions signal value is empty", async (): Promise<void> => {
    sentenceCompletionsSignal.value = [];
    render(html`<${SentenceCompletionsPalette} />`);

    // Neither the `WORKING_MESSAGE` nor a completions palette should be in the
    // document.
    const nullElement = await screen.queryByText(WORKING_MESSAGE);
    expect(nullElement).toBeNull();
    expect(document.querySelector(`[data-palettename="${SENTENCE_COMPLETIONS_NAME}"]`)).toBeNull();
  });

  test("Signal value is a set of completions", async (): Promise<void> => {

    sentenceCompletionsSignal.value = SUGGESTED_COMPLETIONS;
    render(html`<${SentenceCompletionsPalette} />`);

    // There should be no `WORKING_MESSAGE` but there should be a completions
    // palette.
    const nullElement = await screen.queryByText(WORKING_MESSAGE);
    expect(nullElement).toBeNull();
    const paletteElement = document.querySelector(`[data-palettename="${SENTENCE_COMPLETIONS_NAME}"]`);
    expect(paletteElement).toBeVisible();

    // Check that there is a button for each sentence in the signal value.
    SUGGESTED_COMPLETIONS.forEach( async (aSentence) => {
      const buttonSentence = await screen.findByRole("button", { name: `/${aSentence}/` });
      expect(buttonSentence).toBeVisible();
    });
  });

});
