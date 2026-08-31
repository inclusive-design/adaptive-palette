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

/*
 * The message-attributes feature driven end to end over the real palette files, loaded the way
 * `index.js` loads them at start-up: `palette_file_map.json`, `command_bar.json`,
 * `input_area.json` and `attributes.json`.
 *
 * This is what `Palette.integration.test.ts` cannot cover. That one exercises the palette
 * engine -- how cells coordinate with each other -- against a mock palette defined inline, and
 * would still pass if `attributes.json` were deleted. This one checks that the shipped data and
 * the code still agree: that the registry keys the JSON names exist, that "Msg Style" resolves
 * through the file map, that the cells land where the grid expects them, and that a selection
 * made on the palette reaches the chip bar and the model prompt.
 *
 * The chip bar is mounted here the way `index.js` mounts it -- on its own, beside the palettes
 * rather than inside one -- so that this test still covers the path from a palette cell to a
 * chip now that the bar has left the input-area grid.
 */
import { vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { html } from "htm/preact";

import { initAdaptivePaletteGlobals } from "../../core/InitGlobals";
import { adaptivePaletteGlobals, changeEncodingContents } from "../../state/GlobalData";
import { loadPaletteFromJsonFile, PaletteStore } from "../../core/PaletteStore";
import { setTestConfig } from "../../testUtils/TestConfig";
import { mockedSpeak } from "../../testUtils/SpeechUtilsMock";
import { resetMessageLog } from "../../testUtils/MessageLogTestUtils";
import { queryChat } from "../../core/OllamaApi";
import { Palette } from "../../components/Palette";
import { CurrentPalette } from "../../components/CurrentPalette";
import { DEBOUNCE_MS } from "../word-prediction/WordPredictionState";
import {
  selectedAttributesSignal, clearAttributes
} from "./MessageAttributesState";
import {
  sentenceCompletionsSignal, IDLE_SENTENCE_STATE, discardEditPromptSignal
} from "../telegraphic-translation/TelegraphicTranslationState";
import { SentenceChoices } from "../telegraphic-translation/SentenceChoices";
import { MessageAttributesBar } from "./MessageAttributesBar";
import { JsonPaletteType } from "../../index.d";

vi.mock("../../utils/SpeechUtils");
vi.mock("../../core/OllamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../core/OllamaApi")>();
  return { ...actual, queryChat: vi.fn() };
});

const mockedQueryChat = vi.mocked(queryChat);

describe("Message attributes: whole-feature walkthrough", (): void => {

  const rootPalette: JsonPaletteType = {
    name: "Walkthrough Root",
    cells: {
      "hungry": {
        type: "ActionCodeCell",
        options: {
          label: "hungry", composition: 124,
          rowStart: 1, rowSpan: 1, columnStart: 1, columnSpan: 1
        }
      }
    }
  };

  let commandBar: JsonPaletteType;
  let inputArea: JsonPaletteType;

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
    // The real app sets this from palette_file_map.json before mounting (see index.js), so
    // "Msg Style" -> attributes.json resolves the same way it does in the running app.
    const fileMap = await loadPaletteFromJsonFile("/palettes/palette_file_map.json");
    if (!fileMap) {
      throw new Error("Could not load /palettes/palette_file_map.json");
    }
    PaletteStore.paletteFileMap = fileMap as unknown as Record<string, string>;
    const loadedCommandBar = await loadPaletteFromJsonFile("/palettes/command_bar.json");
    const loadedInputArea = await loadPaletteFromJsonFile("/palettes/input_area.json");
    if (!loadedCommandBar || !loadedInputArea) {
      throw new Error("Could not load the real command_bar.json / input_area.json");
    }
    commandBar = loadedCommandBar;
    inputArea = loadedInputArea;
  });

  const mount = (): void => {
    const { navigationStack, paletteStore } = adaptivePaletteGlobals;
    paletteStore.addPalette(rootPalette);
    navigationStack.flushReset(rootPalette);
    render(html`<${Palette} json=${commandBar} />`);
    render(html`<${Palette} json=${inputArea} />`);
    render(html`<${CurrentPalette} />`);
    render(html`<${SentenceChoices} />`);
    render(html`<${MessageAttributesBar} />`);
  };

  beforeEach(async (): Promise<void> => {
    clearAttributes();
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
    sentenceCompletionsSignal.value = IDLE_SENTENCE_STATE;
    discardEditPromptSignal.value = null;
    mockedQueryChat.mockReset();
    adaptivePaletteGlobals.models = ["phony-model:12b"];
    await resetMessageLog();
  });

  afterEach(async (): Promise<void> => {
    cleanup();
    clearAttributes();
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
    sentenceCompletionsSignal.value = IDLE_SENTENCE_STATE;
    discardEditPromptSignal.value = null;
    adaptivePaletteGlobals.models = [];
    await resetMessageLog();
  });

  // Items 1-4: the palette opens, two attributes fill in, Back returns, chips show,
  // removing one leaves the other, and re-opening shows what is left.
  test("items 1-4: open Msg Style, set two, Back, chips, remove one, re-open shows the rest", async (): Promise<void> => {
    mount();

    // Item 1: command bar shows "Msg Style"; tapping it opens a palette of four labelled rows.
    const attributesButton = await screen.findByRole("button", { name: "Msg Style" });
    fireEvent.click(attributesButton);

    await waitFor(async (): Promise<void> => {
      expect(await screen.findByRole("button", { name: "Intent: question" })).toBeVisible();
    });
    ["Intent", "Tone", "Feeling", "Priority"].forEach((row) => {
      expect(screen.getByText(row)).toBeVisible();
    });

    // Item 2: tapping "question" and "urgent" fills both in; "Back" returns to the palette
    // that was displayed (the root, not the command bar the button sits in).
    fireEvent.click(await screen.findByRole("button", { name: "Intent: question" }));
    fireEvent.click(await screen.findByRole("button", { name: "Priority: urgent" }));
    expect(selectedAttributesSignal.value.map((attribute) => attribute.label))
      .toEqual(["question", "urgent"]);

    fireEvent.click(await screen.findByRole("button", { name: "Back" }));
    await waitFor(async (): Promise<void> => {
      expect(await screen.findByText("hungry")).toBeVisible();
    });
    expect(adaptivePaletteGlobals.navigationStack.currentPalette?.name).toBe("Walkthrough Root");
    expect(adaptivePaletteGlobals.navigationStack.depth).toBe(0);

    // Item 3: two chips show in the top bar. Tapping one removes it; the other stays.
    const questionChip = await screen.findByRole("button", { name: "Remove Intent: question" });
    const urgentChip = await screen.findByRole("button", { name: "Remove Priority: urgent" });
    expect(questionChip).toBeVisible();
    expect(urgentChip).toBeVisible();

    await userEvent.click(questionChip);
    expect(selectedAttributesSignal.value.map((attribute) => attribute.label)).toEqual(["urgent"]);
    expect(screen.queryByRole("button", { name: "Remove Intent: question" })).toBeNull();
    expect(await screen.findByRole("button", { name: "Remove Priority: urgent" })).toBeVisible();

    // Item 4: re-opening the attributes palette shows the remaining attribute still filled in.
    fireEvent.click(await screen.findByRole("button", { name: "Msg Style" }));
    const urgentCell = await screen.findByRole("button", { name: "Priority: urgent" });
    expect(urgentCell.getAttribute("aria-pressed")).toBe("true");
    const questionCell = await screen.findByRole("button", { name: "Intent: question" });
    expect(questionCell.getAttribute("aria-pressed")).toBe("false");
  });

  // Items 5-6: the word-prediction request body carries the attributes line when set, and
  // drops it when not, without needing a running Ollama (queryChat is mocked).
  test("items 5-6: word-prediction request carries Message attributes, and drops it when none set", async (): Promise<void> => {
    vi.useFakeTimers();
    try {
      setTestConfig({
        wordPrediction: {
          show: true, maxSuggestions: 5, enableModelQuery: true, model: "phony-model:12b",
          systemPrompt: "List words.",
          userPrompt: "Message so far: {{message}}\nMessage attributes: {{attributes}}"
        }
      });
      mockedQueryChat.mockResolvedValue({ message: { content: "eat" } } as never);

      selectedAttributesSignal.value = [{ category: "Feeling", label: "angry", composition: 1198 }];
      changeEncodingContents.value = {
        payloads: [{ label: "I", composition: 1840, modifierInfo: [] }],
        caretPosition: 0
      };
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      await vi.advanceTimersByTimeAsync(0);

      expect(mockedQueryChat.mock.calls.length).toBeGreaterThan(0);
      const [firstCallBody] = mockedQueryChat.mock.calls[mockedQueryChat.mock.calls.length - 1];
      expect(firstCallBody).toBe("Message so far: I\nMessage attributes: Feeling: angry");

      // Item 6: take every attribute off; the next request body has no attributes line.
      mockedQueryChat.mockClear();
      clearAttributes();
      changeEncodingContents.value = {
        payloads: [
          { label: "I", composition: 1840, modifierInfo: [] },
          { label: "want", composition: 2705, modifierInfo: [] }
        ],
        caretPosition: 1
      };
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      await vi.advanceTimersByTimeAsync(0);

      expect(mockedQueryChat.mock.calls.length).toBeGreaterThan(0);
      const [secondCallBody] = mockedQueryChat.mock.calls[mockedQueryChat.mock.calls.length - 1];
      expect(secondCallBody).toBe("Message so far: I want");
      expect(secondCallBody).not.toContain("Message attributes");
    } finally {
      vi.useRealTimers();
      setTestConfig();
    }
  });

  // Item 7: tapping a sentence speaks it and leaves the message and chips; "Done" clears both.
  test("item 7: tapping a sentence keeps the message and chips; Done clears both", async (): Promise<void> => {
    // Configured before mounting: the palette decides there and then whether to render the
    // "Make Sentences" cell, the way start-up loads the config before the first render.
    setTestConfig({
      markAiSuggestions: false,
      telegraphicTranslation: {
        model: "phony-model:12b", numSentences: 1, showBlissSentence: false,
        systemPrompt: "prompt", userPrompt: "Telegraphic message: {{telegraphicMessage}}"
      }
    });
    mount();
    mockedQueryChat.mockResolvedValue({ message: { content: "1. I am hungry." } } as never);

    // Set an attribute and a symbol, the way items 1-4 already proved works end to end.
    selectedAttributesSignal.value = [{ category: "Feeling", label: "angry", composition: 1198 }];
    changeEncodingContents.value = {
      payloads: [{ label: "hungry", composition: 124, modifierInfo: [] }],
      caretPosition: 0
    };

    fireEvent.click(await screen.findByRole("button", { name: "Make Sentences" }));
    const sentenceButton = await screen.findByRole("button", { name: "I am hungry." });

    await userEvent.click(sentenceButton);
    expect(mockedSpeak).toHaveBeenCalledWith("I am hungry.");
    // The message and the chips stay: tapping a sentence is not "Done".
    expect(changeEncodingContents.value.payloads.length).toBe(1);
    expect(selectedAttributesSignal.value.length).toBe(1);
    expect(await screen.findByRole("button", { name: "Remove Feeling: angry" })).toBeVisible();

    await userEvent.click(await screen.findByRole("button", { name: "✓ Done" }));
    expect(changeEncodingContents.value.payloads).toEqual([]);
    expect(selectedAttributesSignal.value).toEqual([]);
    expect(screen.queryByRole("button", { name: "Remove Feeling: angry" })).toBeNull();

    setTestConfig();
  });

  // Item 8: "Delete all" clears the chips; deleting symbols one at a time does not.
  test("item 8: Delete all clears the chips; deleting one at a time leaves them set", async (): Promise<void> => {
    mount();

    // First half: Delete all.
    selectedAttributesSignal.value = [{ category: "Priority", label: "urgent", composition: 4310 }];
    fireEvent.click(await screen.findByText("hungry"));
    expect(changeEncodingContents.value.payloads.length).toBe(1);

    fireEvent.click(await screen.findByRole("button", { name: "Delete all" }));
    expect(changeEncodingContents.value.payloads).toEqual([]);
    expect(selectedAttributesSignal.value).toEqual([]);

    // Second half: deleting symbols one at a time instead.
    selectedAttributesSignal.value = [{ category: "Priority", label: "urgent", composition: 4310 }];
    fireEvent.click(await screen.findByText("hungry"));
    expect(changeEncodingContents.value.payloads.length).toBe(1);

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    expect(changeEncodingContents.value.payloads).toEqual([]);
    // The chips stay, in the top bar above the now-empty input area.
    expect(selectedAttributesSignal.value).toEqual([
      { category: "Priority", label: "urgent", composition: 4310 }
    ]);
    expect(await screen.findByRole("button", { name: "Remove Priority: urgent" })).toBeVisible();
  });

  // Item 9: accessible names and aria-pressed.
  test("item 9: accessible names and aria-pressed", async (): Promise<void> => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Msg Style" }));

    const angryButton = await screen.findByRole("button", { name: "Feeling: angry" });
    expect(angryButton.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(angryButton);
    expect(angryButton.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(await screen.findByRole("button", { name: "Back" }));
    const chip = await screen.findByRole("button", { name: "Remove Feeling: angry" });
    expect(chip).toBeVisible();
  });

  // Step 3, part 1 of the plan's "beyond the plan" checks: the whole feature in one flow.
  test("end to end: root -> Msg Style -> set one -> Back -> add symbol -> reaches the prompt -> Delete all clears both", async (): Promise<void> => {
    mount();
    vi.useFakeTimers();
    try {
      setTestConfig({
        wordPrediction: {
          show: true, maxSuggestions: 5, enableModelQuery: true, model: "phony-model:12b",
          systemPrompt: "List words.",
          userPrompt: "Message so far: {{message}}\nMessage attributes: {{attributes}}"
        }
      });
      mockedQueryChat.mockResolvedValue({ message: { content: "eat" } } as never);

      fireEvent.click(await screen.findByRole("button", { name: "Msg Style" }));
      fireEvent.click(await screen.findByRole("button", { name: "Priority: urgent" }));
      fireEvent.click(await screen.findByRole("button", { name: "Back" }));

      fireEvent.click(await screen.findByText("hungry"));
      changeEncodingContents.value = {
        payloads: [{ label: "hungry", composition: 124, modifierInfo: [] }],
        caretPosition: 0
      };
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      await vi.advanceTimersByTimeAsync(0);

      expect(mockedQueryChat.mock.calls.length).toBeGreaterThan(0);
      const [lastBody] = mockedQueryChat.mock.calls[mockedQueryChat.mock.calls.length - 1];
      expect(lastBody).toContain("Message attributes: Priority: urgent");

      fireEvent.click(await screen.findByRole("button", { name: "Delete all" }));
      expect(changeEncodingContents.value.payloads).toEqual([]);
      expect(selectedAttributesSignal.value).toEqual([]);
      expect(screen.queryByRole("button", { name: "Remove Priority: urgent" })).toBeNull();
    } finally {
      vi.useRealTimers();
      setTestConfig();
    }
  });
});
