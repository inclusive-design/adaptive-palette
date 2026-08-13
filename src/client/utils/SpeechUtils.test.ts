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
    speak: (utterance: SpeechSynthesisUtterance) => spoken.push(utterance.text)
  });
  vi.stubGlobal("SpeechSynthesisUtterance", class { constructor (public text: string) {} });
  return spoken;
};

describe("SpeechUtils", (): void => {

  const originalSetting = adaptivePaletteGlobals.config.announceSymbolOnInput;

  afterEach((): void => {
    adaptivePaletteGlobals.config.announceSymbolOnInput = originalSetting;
    vi.unstubAllGlobals();
  });

  test("speak() says the text", (): void => {
    const spoken = captureSpeech();
    speak("hello");
    expect(spoken).toEqual(["hello"]);
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
