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
import { userEvent } from "vitest/browser";
import { render, cleanup, waitFor } from "@testing-library/preact";
import { html } from "htm/preact";
import { initAdaptivePaletteGlobals } from "../../core/InitGlobals";
import { queryChat } from "../../core/OllamaApi";
import { getStorage } from "../../core/StorageBackend";
import { messageText } from "../../core/MessageLog";
import { adaptivePaletteGlobals, changeEncodingContents, finishedMessageSignal } from "../../state/GlobalData";
import { setTestConfig } from "../../testUtils/TestConfig";
import { outlinedRow, highlightedCell } from "../../testUtils/SwitchScanTestUtils";
import { mockedSpeak } from "../../testUtils/SpeechUtilsMock";
import { resetMessageLog } from "../../testUtils/MessageLogTestUtils";
import { CurrentPalette } from "../../components/CurrentPalette";
import { SymbolEntryToolbar } from "../../components/SymbolEntryToolbar";
import {
  sentenceCompletionsSignal, IDLE_SENTENCE_STATE, typedSentenceSignal, focusedMessageSignal
} from "../telegraphic-translation/TelegraphicTranslationState";
import { startSwitchScanning, isOwnPaletteCell as isOwnCell } from "./SwitchScanning";
import { en } from "../../i18n/en";

vi.mock("../../utils/SpeechUtils");
vi.mock("../../core/OllamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../core/OllamaApi")>();
  return { ...actual, queryChat: vi.fn() };
});

// Trusted key presses, as in SwitchScanning.test.ts.
const move = async (): Promise<void> => {
  await userEvent.keyboard(" ");
};
const select = async (): Promise<void> => {
  await userEvent.keyboard("{Enter}");
};

type MatchType = (el: HTMLElement) => boolean;

// Press move until `reached()` holds. A change to the page is painted on the frame after the
// scanner's observer sees it, so wait for that one first.
async function scanTo (reached: () => boolean, what: string): Promise<void> {
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  for (let i = 0; i < 60 && !reached(); i++) {
    await move();
  }
  if (!reached()) {
    throw new Error(`The scan never reached ${what}`);
  }
}

const isHighlighted = (match: MatchType) => (): boolean => {
  const cell = highlightedCell();
  return !!cell && match(cell);
};

// Pick a page control: scan to its row, enter it, scan to the control and select it.
async function pick (match: MatchType, what: string): Promise<void> {
  await scanTo(() => outlinedRow().some(match), `the row with ${what}`);
  await select();
  await scanTo(isHighlighted(match), what);
  await select();
}

// Pick a control in the open dialog, which is scanned one control at a time.
async function pickInDialog (match: MatchType, what: string): Promise<void> {
  await scanTo(isHighlighted(match), what);
  await select();
}

const byId = (id: string): MatchType => (el) => el.id === id;
const byText = (text: string): MatchType => (el) => el.textContent === text;
const ownBranch: MatchType = (el) => isOwnCell(el) && el.classList.contains("actionBranchToPaletteCell");

describe("Switch scanning on the standard Bliss chart", (): void => {
  let area: HTMLElement;
  let stop: () => void;
  let startName: string;

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  beforeEach(async (): Promise<void> => {
    setTestConfig();
    // No models, so the header's model-gated cells are not drawn whether or not Ollama is running.
    adaptivePaletteGlobals.models = [];
    const { paletteStore, navigationStack } = adaptivePaletteGlobals;
    startName = await paletteStore.loadPaletteSet("/palette-sets/standardBlissChart/palette_set.json");
    const startPalette = await paletteStore.getNamedPalette(startName, true);
    if (!startPalette) {
      throw new Error(`Start palette "${startName}" did not load`);
    }
    navigationStack.flushReset(startPalette);
    area = document.createElement("div");
    area.id = "mainPaletteDisplayArea";
    document.body.appendChild(area);
    render(html`<${CurrentPalette} />`, { container: area });
    await waitFor(() => expect(area.querySelector(".actionBranchToPaletteCell")).not.toBeNull());
    stop = startSwitchScanning({ enabled: true, moveKey: "Space", selectKey: "Enter" });
  });

  afterEach(async (): Promise<void> => {
    stop();
    cleanup();
    area.remove();
    document.getElementById("topBar")?.remove();
    vi.restoreAllMocks();
    vi.mocked(queryChat).mockReset();
    mockedSpeak.mockClear();
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
    finishedMessageSignal.value = "";
    sentenceCompletionsSignal.value = IDLE_SENTENCE_STATE;
    typedSentenceSignal.value = "";
    focusedMessageSignal.value = null;
    adaptivePaletteGlobals.navigationStack.flushReset(null);
    await resetMessageLog();
  });

  // Move until the outlined row is one of the current palette's own rows.
  async function moveToPaletteRow (): Promise<void> {
    for (let i = 0; i < 20 && !outlinedRow().some(isOwnCell); i++) {
      await move();
    }
    expect(outlinedRow().some(isOwnCell)).toBe(true);
  }

  // The first control the current palette draws itself.
  function firstOwnCell (): HTMLElement | undefined {
    return Array.from(area.querySelectorAll<HTMLElement>("button, [tabindex='0']")).find(isOwnCell);
  }

  test("branches, adds a symbol, and stays on the row", async (): Promise<void> => {
    // 1. Enter the chart's second own row and pick its first cell, a branch. Not the first row:
    // that one is at the same index as the new palette's first row, so staying put would pass.
    await moveToPaletteRow();
    await move();
    await select();
    const target = highlightedCell()?.dataset.branchto;
    expect(target).toBeTruthy();
    await select();

    // 2. The new palette is drawn and its first own row is outlined.
    await waitFor(() => {
      expect(adaptivePaletteGlobals.navigationStack.currentPalette?.name).toBe(target);
      expect(outlinedRow().length).toBeGreaterThan(0);
      expect(outlinedRow().every(isOwnCell)).toBe(true);
      expect(outlinedRow()).toContain(firstOwnCell());
    });
    const row = outlinedRow();

    // 3. Pick the row's first symbol: it is added to the message and the row stays outlined.
    await select();
    await select();
    await waitFor(() => expect(changeEncodingContents.value.payloads.length).toBe(1));
    await waitFor(() => expect(outlinedRow()).toEqual(row));
  });

  // Branch into the start palette's first branch cell, and wait for the new palette.
  async function branch (): Promise<void> {
    await pick(ownBranch, "a branch cell");
    await waitFor(() => expect(adaptivePaletteGlobals.navigationStack.currentPalette?.name).not.toBe(startName));
  }

  test("goes to another palette and back", async (): Promise<void> => {
    await branch();
    await pick(byId("command-go-back"), "Back");

    await waitFor(() => {
      expect(adaptivePaletteGlobals.navigationStack.currentPalette?.name).toBe(startName);
      expect(outlinedRow().every(isOwnCell)).toBe(true);
      expect(outlinedRow()).toContain(firstOwnCell());
    });
  });

  test("makes a sentence, chooses it and speaks the message", async (): Promise<void> => {
    // The header's Make Sentences cell is drawn only with a model and the section configured.
    adaptivePaletteGlobals.models = ["phony-model:12b"];
    setTestConfig({
      telegraphicTranslation: {
        model: "phony-model:12b",
        numSentences: 1,
        systemPrompt: "Give {{numSentences}} sentences.",
        userPrompt: "Telegraphic message: {{telegraphicMessage}}",
        showBlissSentence: false
      }
    });
    vi.mocked(queryChat).mockResolvedValue({ message: { content: "1. I am hungry." } } as never);

    // 1. Add a symbol. The header is drawn again on the new palette, now with Make Sentences.
    await branch();
    const symbol = firstOwnCell();
    await pick((el) => el === symbol, "the first symbol");
    await waitFor(() => expect(changeEncodingContents.value.payloads.length).toBe(1));
    expect(area.querySelector("#command-make-sentence")).not.toBeNull();

    // 2. Make sentences and choose the one offered: choosing it speaks it.
    await pick(byId("command-make-sentence"), "Make Sentences");
    await waitFor(() => expect(area.querySelector(".sentenceChoice")).not.toBeNull());
    await pick((el) => el.classList.contains("sentenceChoice"), "the sentence");
    await waitFor(() => expect(mockedSpeak).toHaveBeenCalledWith("I am hungry.", "en"));

    // 3. Speak the composed message.
    await pick(byId("action-speak"), "Speak");
    await waitFor(() => expect(mockedSpeak).toHaveBeenLastCalledWith(
      messageText(changeEncodingContents.value.payloads)
    ));
  });

  test("opens, changes and saves the settings", async (): Promise<void> => {
    const { fileConfig } = adaptivePaletteGlobals;
    adaptivePaletteGlobals.config = { ...fileConfig };
    // Resolved without writing, so the saved choice does not reach the tests after this one.
    const writeSettings = vi.spyOn(getStorage(), "writeSettings").mockResolvedValue(undefined);
    const topBar = document.createElement("div");
    topBar.id = "topBar";
    document.body.insertBefore(topBar, area);
    render(html`<${SymbolEntryToolbar} />`, { container: topBar });

    await pick(byText(en.toolbarSettings), "Adjust Settings");
    await waitFor(() => expect(document.querySelector("dialog[open]")).not.toBeNull());
    await pickInDialog((el) => el.id === "setting-announceSymbolOnInput", "the speak-each-symbol box");
    await pickInDialog(byText(en.settingsSave), "Save and close");

    await waitFor(() => expect(writeSettings).toHaveBeenCalledWith(
      { "announceSymbolOnInput": !fileConfig.announceSymbolOnInput }
    ));
    await waitFor(() => expect(document.querySelector("dialog[open]")).toBeNull());
  });
});
