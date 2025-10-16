/*
 * Copyright 2024 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */
import nlp from "compromise";

import { JsonPaletteType } from "./index.d";

/**
 * Global Utility Functions
 */

/**
 * Generate the grid css.
 * @param {number} columnStart - The number of the column that the grid item will start from.
 * @param {number} columnSpan - The number of columns that the item will span across.
 * @param {number} rowStart - The number of the row that the grid item will start from.
 * @param {number} rowSpan - The number of rows that the item will span across.
 * @return {String} - The grid css.
 */
function generateGridStyle(columnStart: number, columnSpan: number, rowStart: number, rowSpan: number): string {
  return `grid-column: ${columnStart} / span ${columnSpan};grid-row: ${rowStart} / span ${rowSpan};`;
}

/**
 * Use the text-to-speech to announce the given text. If the previous announcement is still going
 * on, cancel it.
 * @param {String} text - The text to be announced.
 */
function speak(text): void {
  // If the text-to-speech feature is unavailable, do nothing. This happens when running node tests.
  if (!window.speechSynthesis) {
    return;
  }

  // Cancel the previous announcement
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
  }
  // Announce the current text
  const utterThis = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterThis);
}

/**
 * Load a palette from the given JSON file using `fetch()`. The location of the
 * JSON file is provided as a variable. If the loading fails, a console error with
 * detailed error message is reported.
 *
 * @param {String} jsonFilePath - Path of the JSON file to load, without the
 *                                ".json" extension (added herein).
 * @return {JsonPaletteType}    - The palette itself, or `null` if it could not be
 *                                loaded.
 */
async function loadPaletteFromJsonFile (jsonFilePath: string): Promise<JsonPaletteType> {
  try {
    const response = await fetch(jsonFilePath);
    if (!response.ok) {
      console.error(`Error loading ${jsonFilePath}: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error loading ${jsonFilePath}:, ${error}`);
  }
}

// Collections of indicators used by `wordGrammar()` below.  Note that the
// plural,
const PLURAL_INDICATORS = [ 9011, 28044, 28046 ];

// Some of the verb indicators.  There a many more
// action/infinitive, future, past, command, present
const VERB_INDICATORS = [ 8993, 8999, 9004, 24670, 24807 ];

/**
 * Given a word and an indicator that modifies it, change the word to its
 * related form based on the indicator.  For example, if the indicator is for
 * the plural form, change the word to its plrual; if for the past tense,
 * change it to the past tense form.
 */
function wordGrammar (wordToModify: string, indicatorId: number, added: boolean = true): string {
  let result = wordToModify;
  const doc = nlp(wordToModify);

  if (PLURAL_INDICATORS.includes(indicatorId)) {
    if (added) {
      result = doc.nouns().toPlural().text();
    }
    else {
      result = doc.nouns().toSingular().text();
    }
  }
  else if (VERB_INDICATORS.includes(indicatorId)) {
    if (added) {
      switch (indicatorId) {
      case 8993:
        result = doc.verbs().toInfinitive().text();
        if (result.length !== 0 && !result.includes("to")) {
          result = "to " + result;
        }
        break;
      case 8999:
        result = doc.verbs().toFutureTense().text();
        break;
      case 9004:
        result = doc.verbs().toPastTense().text();
        break;
      case 24670:
      case 24807: // command is frequently present tense in English...
        result = doc.verbs().toPresentTense().text();
        break;
      default:
        break;
      }
    }
    else {
      // If removing a verb indicator, try to turn the word back into a "noun"
      // (gerund), e.g. "walk" -> "walking".
      result = doc.verbs().toGerund().text();
    }
  }
  // Compromise returns the empty string if it can't figure out how to convert
  // the `wordToModify`.  Default is to revert back to the original input.
  //
  if (result.length === 0) {
    result = wordToModify;
  }
  return result;
}

export {
  generateGridStyle,
  speak,
  loadPaletteFromJsonFile,
  wordGrammar
};
