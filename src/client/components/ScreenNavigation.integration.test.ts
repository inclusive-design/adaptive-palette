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
import { en } from "../i18n/en";
import { languageSignal, type LabelType } from "../i18n/I18n";
import { PaletteStore } from "../core/PaletteStore";

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
    languageSignal.value = "en";
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

    const textBox = await screen.findByPlaceholderText<HTMLInputElement>(en.sentenceTypeYours);
    await userEvent.type(textBox, "I want lunch.");
    expect(textBox).toHaveFocus();

    // `fireEvent` leaves focus where it is, as a keyboard shortcut or a switch scan can.
    // Skip "add indicator", which is unavailable with no symbol at the caret.
    const branch = container.querySelector<HTMLElement>(".actionBranchToPaletteCell:not([aria-disabled='true'])");
    if (!branch) {
      throw new Error("The start palette has no branch cell");
    }
    const target = branch.dataset.branchto;
    fireEvent.click(branch);
    await waitFor(() => {
      expect(container.querySelector(`[data-palettename='${target}']`)).not.toBeNull();
    });

    expect(screen.getByPlaceholderText(en.sentenceTypeYours)).toBe(textBox);
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

  test("switching to Swedish relabels the start palette and the command bar", async (): Promise<void> => {
    const { paletteStore, navigationStack } = adaptivePaletteGlobals;
    const startName = await paletteStore.loadPaletteSet("/palette-sets/standardBlissChart/palette_set.json");
    const startPalette = await paletteStore.getNamedPalette(startName, true);
    if (!startPalette) {
      throw new Error(`Start palette "${startName}" did not load`);
    }
    navigationStack.flushReset(startPalette);
    render(html`<${CurrentPalette} />`);

    // The first labelled cell of each, read from the JSON so the test follows the drafts.
    const firstLabel = (paletteName: string): { en: string, sv: string } => {
      const cell = Object.values(PaletteStore.paletteMap[paletteName].cells)
        .find((candidate) => {
          const label = (candidate.options as { label?: LabelType }).label;
          return typeof label === "object" && label.en !== label.sv;
        });
      if (!cell) {
        throw new Error(`"${paletteName}" has no labelled cell`);
      }
      return (cell.options as unknown as { label: { en: string, sv: string } }).label;
    };
    const labels = [firstLabel(startName), firstLabel("Command Bar")];

    for (const label of labels) {
      expect((await screen.findAllByText(label.en)).length).toBeGreaterThan(0);
      expect(screen.queryByText(label.sv)).toBeNull();
    }
    languageSignal.value = "sv";
    for (const label of labels) {
      await waitFor(() => {
        expect(screen.queryAllByText(label.sv).length).toBeGreaterThan(0);
      });
      expect(screen.queryByText(label.en)).toBeNull();
    }
  });
});
