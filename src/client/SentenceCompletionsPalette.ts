/*
 * Copyright 2023-2026 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */
import { VNode } from "preact";
import { useMemo } from "preact/hooks";
import { html } from "htm/preact";

import { sentenceCompletionsSignal } from "./GlobalData";
import { JsonPaletteType } from "./index.d";
import { Palette } from "./Palette";

export const SENTENCE_COMPLETIONS_NAME = "Sentence Completions";
export const NO_BCI_AV_ID = -1;

/**
 * Create a palette from the array of sentences. Each sentence is displayed
 * as one actionable cell in the palette. The palette is a single column of
 * buttons.
 *
 * @param {string[]} sentences - The array of sentences
 * @return {JsonPaletteType} - a palette data structure
 */
function makeSentencesJsonPalette(sentences: string[]): JsonPaletteType {
  // Functional approach using reduce, relying on index for the unique key
  // and row calculation
  const cells = sentences.reduce((acc, sentence, index) => {
    // Determine row based on array index (1-based)
    const row = index + 1; 
    const key = `sentence-${index}-${sentence.substring(0, 10)}`; 
    
    acc[key] = {
      type: "ActionTextCell",
      options: {
        label: sentence,
        bciAvId: NO_BCI_AV_ID,
        rowStart: row,
        rowSpan: 1,
        columnStart: 1,
        columnSpan: 5
      }
    };
    return acc;
  }, {});

  return {
    name: SENTENCE_COMPLETIONS_NAME,
    cells
  };
}

export function SentenceCompletionsPalette(): VNode | null {
  const completions = sentenceCompletionsSignal.value;

  // Memoize the palette generation so it only runs when completions change
  const sentencesPalette = useMemo(() => {
    return makeSentencesJsonPalette(completions);
  }, [completions]);

  // contains no data, empty the display
  if (completions.length === 0) {
    return null; 
  } 
  
  // if there is only one data element in the completions, assume that
  // it is the in-progress message, e.g. "Working...", and display it as
  // just a string.
  if (completions.length === 1) {
    return html`<span>${completions[0]}</span>`;
  } 
  
  // othewise, show a palette of sentence completions.
  return html`<${Palette} json=${sentencesPalette} />`;
}
