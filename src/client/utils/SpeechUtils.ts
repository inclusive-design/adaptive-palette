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
import { adaptivePaletteGlobals } from "../state/GlobalData";

/**
 * Text-to-speech functions
 */

/**
 * Use the text-to-speech to announce the given text. If the previous announcement is still going
 * on, cancel it.
 * @param {String} text - The text to be announced.
 */
export function speak(text: string): void {
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
 * Announce that a cell marked `aria-disabled` was activated. Such a cell keeps its
 * place in the tab order, so it can be focused and activated.
 * @param {String} label - The label of the cell that was activated.
 */
export function speakUnavailable(label: string): void {
  speak(`${label} unavailable`);
}

/**
 * Announce the given text only when `announceSymbolOnInput` is on. The labels spoken as the
 * user acts call this. Failures and the Speak button call `speak()` so they are always heard.
 * @param {String} text - The text to be announced.
 */
export function announceIfEnabled(text: string): void {
  if (adaptivePaletteGlobals.config.announceSymbolOnInput) {
    speak(text);
  }
}
