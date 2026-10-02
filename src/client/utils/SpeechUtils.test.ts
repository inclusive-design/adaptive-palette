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

import { vi } from "vitest";
import { adaptivePaletteGlobals } from "../state/GlobalData";
import { languageSignal } from "../i18n/I18n";
import { announceIfEnabled, speak, speakUnavailable } from "./SpeechUtils";

/**
 * Stub `window.speechSynthesis` with a recorder, returning the array it speaks into.
 */
const captureSpeech = (): string[] => {
  const spoken: string[] = [];
  vi.stubGlobal("speechSynthesis", {
    speaking: false,
    pending: false,
    cancel: () => {},
    speak: (utterance: SpeechSynthesisUtterance) => {
      spoken.push(utterance.text);
      spokenLangs.push(utterance.lang);
    }
  });
  vi.stubGlobal("SpeechSynthesisUtterance", class { lang = ""; constructor (public text: string) {} });
  return spoken;
};

// The voice language of each utterance `captureSpeech()` recorded, in order.
let spokenLangs: string[] = [];

describe("SpeechUtils", (): void => {

  const originalSetting = adaptivePaletteGlobals.config.announceSymbolOnInput;

  afterEach((): void => {
    adaptivePaletteGlobals.config.announceSymbolOnInput = originalSetting;
    languageSignal.value = "en";
    spokenLangs = [];
    vi.unstubAllGlobals();
  });

  test("speak() says the text", (): void => {
    const spoken = captureSpeech();
    speak("hello");
    expect(spoken).toEqual(["hello"]);
  });

  test("speak() uses the voice for the current language", (): void => {
    captureSpeech();
    speak("hello");
    languageSignal.value = "sv";
    speak("hej");
    expect(spokenLangs).toEqual(["en-US", "sv-SE"]);
  });

  test("speak() uses the voice for the language it is given", (): void => {
    captureSpeech();
    languageSignal.value = "sv";
    speak("bread", "en");
    expect(spokenLangs).toEqual(["en-US"]);
  });

  test("speakUnavailable() says it in the current language", (): void => {
    const spoken = captureSpeech();
    languageSignal.value = "sv";
    speakUnavailable("Läs upp");
    expect(spoken).toEqual(["Läs upp är inte tillgänglig"]);
  });

  test("speakUnavailable() marks the label unavailable", (): void => {
    const spoken = captureSpeech();
    speakUnavailable("Speak");
    expect(spoken).toEqual(["Speak unavailable"]);
  });

  test("announceIfEnabled() speaks when announceSymbolOnInput is on", (): void => {
    adaptivePaletteGlobals.config.announceSymbolOnInput = true;
    const spoken = captureSpeech();
    announceIfEnabled("helper");
    expect(spoken).toEqual(["helper"]);
  });

  test("announceIfEnabled() stays silent when announceSymbolOnInput is off", (): void => {
    adaptivePaletteGlobals.config.announceSymbolOnInput = false;
    const spoken = captureSpeech();
    announceIfEnabled("helper");
    expect(spoken).toEqual([]);
  });

  test("speak() still says the text when announceSymbolOnInput is off", (): void => {
    adaptivePaletteGlobals.config.announceSymbolOnInput = false;
    const spoken = captureSpeech();
    speak("I want");
    speakUnavailable("Speak");
    expect(spoken).toEqual(["I want", "Speak unavailable"]);
  });
});
