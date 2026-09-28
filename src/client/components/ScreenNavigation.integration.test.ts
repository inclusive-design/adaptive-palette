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
import { goBackImpl } from "../cells/CommandGoBackCell";
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

  /**
   * The start palette's first branch cell that is its own, not one in an included palette such
   * as the shared header.  Pressing it unmounts it, which is what drops focus.
   */
  function ownBranchCell (container: HTMLElement): HTMLElement {
    const cell = Array.from(container.querySelectorAll<HTMLElement>(".actionBranchToPaletteCell"))
      .find((el) => !el.closest(".paletteInclude"));
    if (!cell) {
      throw new Error("The start palette has no branch cell of its own");
    }
    return cell;
  }

  async function renderStartPalette (): Promise<{ container: HTMLElement, startName: string }> {
    const { paletteStore, navigationStack } = adaptivePaletteGlobals;
    const startName = await paletteStore.loadPaletteSet("/palette-sets/standardBlissChart/palette_set.json");
    const startPalette = await paletteStore.getNamedPalette(startName, true);
    if (!startPalette) {
      throw new Error(`Start palette "${startName}" did not load`);
    }
    navigationStack.flushReset(startPalette);
    const { container } = render(html`<${CurrentPalette} />`);
    return { container: container as HTMLElement, startName: startPalette.name };
  }

  test("moves focus to a cell of the new palette when the pressed cell is gone", async (): Promise<void> => {
    const { container } = await renderStartPalette();
    const branch = await waitFor(() => ownBranchCell(container));
    const target = branch.dataset.branchto;

    branch.focus();
    await userEvent.keyboard("{Enter}");

    const newPalette = await waitFor(() => {
      const el = container.querySelector(`[data-palettename='${target}']`);
      if (!el) {
        throw new Error(`Palette "${target}" is not drawn`);
      }
      return el;
    });
    await waitFor(() => {
      expect(document.activeElement).not.toBe(document.body);
    });
    expect(newPalette.contains(document.activeElement)).toBe(true);
    expect(document.activeElement?.closest(".paletteInclude")).toBeNull();
  });

  test("moves focus to a cell of the palette gone back to", async (): Promise<void> => {
    const { container, startName } = await renderStartPalette();
    const branch = await waitFor(() => ownBranchCell(container));
    const target = branch.dataset.branchto;
    branch.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => {
      expect(container.querySelector(`[data-palettename='${target}']`)).not.toBeNull();
    });

    // As the backquote key does: focus is on no cell when the palette changes.
    (document.activeElement as HTMLElement | null)?.blur();
    goBackImpl();

    await waitFor(() => {
      const startPalette = container.querySelector(`[data-palettename='${startName}']`);
      expect(startPalette?.contains(document.activeElement)).toBe(true);
    });
    expect(document.activeElement?.closest(".paletteInclude")).toBeNull();
  });
});
