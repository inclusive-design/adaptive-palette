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
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { html } from "htm/preact";

import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { adaptivePaletteGlobals } from "../state/GlobalData";
import { setTestConfig } from "../testUtils/TestConfig";
import { CurrentPalette } from "./CurrentPalette";
import {
  sentenceCompletionsSignal, IDLE_SENTENCE_STATE, typedSentenceSignal, focusedMessageSignal
} from "../features/telegraphic-translation/TelegraphicTranslationState";
import { TYPE_YOUR_OWN_HINT } from "../features/telegraphic-translation/SentenceChoices";

vi.mock("../utils/SpeechUtils");

describe("Navigating between screens that share the Standard Header", (): void => {

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  beforeEach((): void => {
    setTestConfig();
    // No models, so the header's model-gated "Msg Style" branch is not drawn and the first branch
    // cell is the start palette's, whether or not Ollama is running.
    adaptivePaletteGlobals.models = [];
  });

  afterEach((): void => {
    cleanup();
    sentenceCompletionsSignal.value = IDLE_SENTENCE_STATE;
    typedSentenceSignal.value = "";
    focusedMessageSignal.value = null;
    adaptivePaletteGlobals.navigationStack.flushReset(null);
  });

  test("keeps the sentence box, its text and its focus", async (): Promise<void> => {
    const { paletteStore, navigationStack } = adaptivePaletteGlobals;
    const startName = await paletteStore.loadPaletteSet("/palette-sets/standardBlissChart/palette_set.json");
    const startPalette = await paletteStore.getNamedPalette(startName, true);
    if (!startPalette) {
      throw new Error(`Start palette "${startName}" did not load`);
    }
    navigationStack.flushReset(startPalette);
    sentenceCompletionsSignal.value = {
      status: "ready", sentences: ["I am hungry."], recalledSentence: null,
      model: "phony-model:12b", telegraphicMessage: "me hungry"
    };
    const { container } = render(html`<${CurrentPalette} />`);

    const textBox = await screen.findByPlaceholderText<HTMLInputElement>(TYPE_YOUR_OWN_HINT);
    await userEvent.type(textBox, "I want lunch.");
    expect(textBox).toHaveFocus();

    // `fireEvent` leaves focus where it is, as a keyboard shortcut or a switch scan can.
    const branch = container.querySelector<HTMLElement>(".actionBranchToPaletteCell");
    if (!branch) {
      throw new Error("The start palette has no branch cell");
    }
    const target = branch.dataset.branchto;
    fireEvent.click(branch);
    await waitFor(() => {
      expect(container.querySelector(`[data-palettename='${target}']`)).not.toBeNull();
    });

    expect(screen.getByPlaceholderText(TYPE_YOUR_OWN_HINT)).toBe(textBox);
    expect(textBox).toHaveFocus();
    expect(textBox.value).toBe("I want lunch.");
  });
});
