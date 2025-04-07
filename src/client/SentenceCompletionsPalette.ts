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
import { html } from "htm/preact";

import { adaptivePaletteGlobals, sentenceCompletionsSignal } from "./GlobalData";
import { JsonPaletteType } from "./index.d";
import { Palette } from "./Palette";

const SENTENCE_COMPLETIONS_NAME = "Sentence Completions";
const NO_BCI_AV_ID = -1;

/**
 * Create a palette from the array of sentences.  Each sentence is displayed
 * as once actionable cell in the palette.  The palette is a single column of
 * buttons.
 *
 * @param {string[]} - The array of sentences
 * @return {JsonPaletteType} - a palette data structure
 */
function makeSentencessJsonPalette(sentences: string[]): JsonPaletteType {
  const jsonPalette = {
    "name": SENTENCE_COMPLETIONS_NAME,
    "cells": {}
  };
  let row = 1;
  const column = 1;
  sentences.forEach( (sentence) => {
    const cell = {
      type: "ActionTextCell",
      options: {
        label: sentence,
        bciAvId: NO_BCI_AV_ID,
        rowStart: row,
        rowSpan: 1,
        columnStart: column,
        columnSpan: 5
      }
    };
    row++;
    jsonPalette.cells[sentence] = cell;
  });
  return jsonPalette;
}

export function SentenceCompletionsPalette (): VNode {

  // Remove any existing sentence completions palette from the store.  Once a
  // completions palette has been used and is to be replaced, the store no
  // longer needs to retain it.
  adaptivePaletteGlobals.paletteStore.removePalette(SENTENCE_COMPLETIONS_NAME);

  // Modify the palette display area.  When the `sentenceCompletionsSignal`
  // contains no data, empty the display, ...
  if (sentenceCompletionsSignal.value.length === 0) {
    return html`<span></span>`;
  }
  // ... if there is only one data element in the completions, assume that
  // it is the in-progress message, e.g. "Working...", and display it it as
  // just a string, ...
  else if (sentenceCompletionsSignal.value.length === 1) {
    return html`<span>${sentenceCompletionsSignal.value[0]}</span>`;
  }
  // ... othewise, show a palette of sentence completions.
  else {
    const sentencesPalette = makeSentencessJsonPalette(sentenceCompletionsSignal.value);
    return html`<${Palette} json=${sentencesPalette}/>`;
  }
}
