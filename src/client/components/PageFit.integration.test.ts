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
import { page } from "vitest/browser";
import { waitFor } from "@testing-library/preact";

import type {
  JsonPaletteType, MessageAttributeType, PaletteIncludeType, PaletteSetType, SymbolEncodingType
} from "../index.d";
import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { messageText } from "../core/MessageLog";
import { adaptivePaletteGlobals, changeEncodingContents } from "../state/GlobalData";
import { setTestConfig } from "../testUtils/TestConfig";
import { mountPage } from "../testUtils/PageTestUtils";
import {
  cancelModelQuery, messageUpToCaret, modelWordsSignal, queryContextKeyOf
} from "../features/word-prediction/WordPredictionState";
import { clearAttributes, selectedAttributesSignal } from "../features/message-attributes/MessageAttributesState";
import {
  closeSentences, IDLE_SENTENCE_STATE, sentenceCompletionsSignal, sentencePaletteSignal
} from "../features/telegraphic-translation/TelegraphicTranslationState";
import { en } from "../i18n/en";
import { sv } from "../i18n/sv";
import { languageSignal } from "../i18n/I18n";

vi.mock("../utils/SpeechUtils");

// Word prediction asks the model as the message changes. The tests set the model's words
// themselves, so the query is left waiting.
vi.mock("../core/OllamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../core/OllamaApi")>();
  return { ...actual, queryChat: vi.fn(() => new Promise(() => undefined)) };
});

const SET_FOLDER = "/palette-sets/standardBlissChart";
const SUPPORTED_SIZES = [[1024, 650], [1280, 720], [1366, 650], [1920, 950]];
// Below the smallest size, and 1024×650 zoomed to 200%. The page may scroll down, never sideways.
const SMALL_SIZES = [[800, 600], [512, 325]];

// Every screen in the shipped set: each palette that includes the header. The header, input
// area and command bar are parts of a screen. Read before the tests are collected, so each
// screen gets a test of its own.
const paletteSet = await (await fetch(`${SET_FOLDER}/palette_set.json`)).json() as PaletteSetType;
const SCREENS = (await Promise.all(Object.entries(paletteSet.palettes).map(async ([name, file]) => {
  const palette = await (await fetch(`${SET_FOLDER}/${file}`)).json() as JsonPaletteType;
  const hasHeader = Object.values(palette.cells).some((cell) =>
    cell.type === "PaletteInclude" && (cell.options as PaletteIncludeType).palette === "Standard Header");
  return hasHeader ? name : null;
}))).filter((name): name is string => name !== null);

// The longest top bar notice in any language.
const LONGEST_NOTICE = [en, sv]
  .flatMap((strings) => [strings.aiStatusHosted, strings.aiStatusNoModels, strings.aiStatusNoSentences])
  .reduce((longest, notice) => notice.length > longest.length ? notice : longest);

const LONG_SENTENCES = [
  "I would like a warm bun sandwich with cheese, please.",
  "Could you help me make a bun sandwich for lunch today?",
  "I am hungry and I want to eat a big sandwich on a bun now."
];

// Vocabulary, predictions and sentences need 64×64. Every other control -- the top bar, the
// input area, the command bar, and the layer's own buttons and text box -- needs 44×44.
const LARGE_TARGETS = ".screenPalette > button, .predictedWord, .sentenceChoice";

const symbols = (count: number, label: string): SymbolEncodingType[] =>
  Array.from({ length: count }, (unused, index) => ({ label: `${label}${index}`, composition: 1840, modifierInfo: [] }));

// Lets the observers that count the chips and fit the sentences finish.
async function settle (): Promise<void> {
  for (let frame = 0; frame < 3; frame++) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

async function resize (width: number, height: number): Promise<void> {
  await page.viewport(width, height);
  // A browser that cannot resize fails here, rather than passing at the wrong size.
  await waitFor(() => {
    expect(window.innerWidth).toBe(width);
    expect(window.innerHeight).toBe(height);
  });
  await settle();
}

async function expectFitsEverySize (): Promise<void> {
  for (const [width, height] of [...SUPPORTED_SIZES, ...SMALL_SIZES]) {
    await resize(width, height);
    const { scrollWidth, scrollHeight } = document.documentElement;
    expect(scrollWidth, `scrollWidth at ${width}×${height}`).toBeLessThanOrEqual(width);
    if (SUPPORTED_SIZES.some(([w, h]) => w === width && h === height)) {
      expect(scrollHeight, `scrollHeight at ${width}×${height}`).toBeLessThanOrEqual(height);
    }
  }
}

async function showScreen (name: string): Promise<JsonPaletteType> {
  const palette = await adaptivePaletteGlobals.paletteStore.getNamedPalette(name, true);
  if (!palette) {
    throw new Error(`Palette "${name}" did not load`);
  }
  adaptivePaletteGlobals.navigationStack.flushReset(palette);
  return palette;
}

async function allAttributes (): Promise<MessageAttributeType[]> {
  const palette = await adaptivePaletteGlobals.paletteStore.getNamedPalette("attributes", true);
  return Object.values(palette?.cells ?? {})
    .filter((cell) => cell.type === "ActionAttributeCell")
    .map((cell) => {
      const { category, label, composition } = cell.options as unknown as MessageAttributeType;
      return { category, label, composition };
    });
}

// A long message, with the model's words in all 13 prediction slots.
function showLongMessage (): void {
  const payloads = symbols(30, "word");
  const caretPosition = payloads.length - 1;
  changeEncodingContents.value = { payloads, caretPosition };
  cancelModelQuery();
  modelWordsSignal.value = {
    status: "ready",
    contextKey: queryContextKeyOf(messageUpToCaret(payloads, caretPosition)),
    payloads: symbols(13, "unbelievably-long-suggestion-")
  };
}

// The worst case: every attribute set, a long message, 13 predictions, and the layer open with
// three long sentences.
async function showWorstCase (palette: JsonPaletteType): Promise<void> {
  selectedAttributesSignal.value = await allAttributes();
  showLongMessage();
  sentencePaletteSignal.value = palette.name;
  sentenceCompletionsSignal.value = {
    status: "ready", sentences: LONG_SENTENCES, recalledSentence: null, model: "phony-model:12b",
    telegraphicMessage: messageText(changeEncodingContents.value.payloads), language: "en"
  };
  await waitFor(() => expect(document.querySelectorAll(".sentenceLayer .sentenceChoice")).toHaveLength(3));
  await settle();
}

function expectTargetSizes (): void {
  const controls = Array.from(document.querySelectorAll<HTMLElement>("button, input, a[href], [tabindex='0']"))
    .filter((control) => !control.closest("[inert]") && control.getClientRects().length > 0);
  expect(controls.length).toBeGreaterThan(0);
  for (const control of controls) {
    const { width, height } = control.getBoundingClientRect();
    const minimum = control.matches(LARGE_TARGETS) ? 64 : 44;
    const name = control.getAttribute("aria-label") ?? control.textContent?.trim() ?? control.tagName;
    // Half a pixel is allowed for rounding: grid tracks split the width into fractions.
    expect(width + 0.5, `width of "${name}"`).toBeGreaterThanOrEqual(minimum);
    expect(height + 0.5, `height of "${name}"`).toBeGreaterThanOrEqual(minimum);
  }
}

describe("The page fits the screen", (): void => {
  let unmount: (() => void) | undefined;

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
    await adaptivePaletteGlobals.paletteStore.loadPaletteSet(`${SET_FOLDER}/palette_set.json`);
  });

  beforeEach((): void => {
    setTestConfig({
      wordPrediction: {
        show: true, numSuggestions: 13, enableModelQuery: true, model: "phony-model:12b",
        systemPrompt: "List {{numWords}} words.", userPrompt: "Message so far: {{message}}"
      },
      telegraphicTranslation: {
        model: "phony-model:12b", numSentences: 3, systemPrompt: "system", userPrompt: "user",
        showBlissSentence: true
      }
    });
    // Make Sentences and Msg Style are drawn only with a model.
    adaptivePaletteGlobals.models = ["phony-model:12b"];
  });

  afterEach((): void => {
    unmount?.();
    unmount = undefined;
    clearAttributes();
    changeEncodingContents.value = { payloads: [], caretPosition: -1 };
    modelWordsSignal.value = { status: "idle" };
    sentenceCompletionsSignal.value = IDLE_SENTENCE_STATE;
    sentencePaletteSignal.value = null;
    adaptivePaletteGlobals.navigationStack.flushReset(null);
    languageSignal.value = "en";
  });

  // A renamed header include would otherwise drop every fit test without a failure.
  test("finds the screens of the shipped set", (): void => {
    expect(SCREENS.length).toBeGreaterThan(20);
  });

  test.each(SCREENS)("%s fits every size, empty and in the worst case", async (name): Promise<void> => {
    const palette = await showScreen(name);
    unmount = mountPage();
    await expectFitsEverySize();

    unmount();
    unmount = mountPage(LONGEST_NOTICE);
    await resize(1024, 650);
    await showWorstCase(palette);
    await expectFitsEverySize();
  });

  test.each(["Bliss standard chart", "indicators"])("no vocabulary cell moves on %s", async (name): Promise<void> => {
    await resize(1024, 650);
    const palette = await showScreen(name);
    unmount = mountPage();
    await settle();
    const boxes = (): string[] => Array.from(document.querySelectorAll<HTMLElement>(
      ".screenPalette > :not(.paletteInclude):not(.sentenceChoices)"
    )).map((cell) => JSON.stringify(cell.getBoundingClientRect()));
    const before = boxes();
    expect(before.length).toBeGreaterThan(0);
    const expectUnmoved = async (step: string): Promise<void> => {
      await settle();
      expect(boxes(), step).toEqual(before);
    };

    // 1. Predictions: "…" while the model answers, then its words.
    const payloads = symbols(3, "word");
    changeEncodingContents.value = { payloads, caretPosition: 2 };
    cancelModelQuery();
    const contextKey = queryContextKeyOf(messageUpToCaret(payloads, 2));
    modelWordsSignal.value = { status: "working", contextKey };
    await waitFor(() => expect(document.querySelector(".predictedWordWaiting")).not.toBeNull());
    await expectUnmoved("predictions waiting");
    modelWordsSignal.value = { status: "ready", contextKey, payloads: symbols(13, "suggestion") };
    await expectUnmoved("predictions shown");

    // 2. Chips.
    selectedAttributesSignal.value = await allAttributes();
    await waitFor(() => expect(document.querySelector(".messageAttributeChip")).not.toBeNull());
    await expectUnmoved("chips set");

    // 3. The top bar's notice appears, as `index.js` puts it in after the page is drawn.
    const notice = document.createElement("div");
    notice.id = "aiStatus";
    notice.setAttribute("role", "status");
    notice.textContent = LONGEST_NOTICE;
    document.getElementById("symbolEntryToolbar")?.before(notice);
    await expectUnmoved("notice shown");

    // 4. The layer opens, the sentences arrive, the error line shows, and it closes.
    sentencePaletteSignal.value = palette.name;
    const working = {
      status: "working" as const, sentences: [], recalledSentence: null, model: "phony-model:12b",
      telegraphicMessage: messageText(payloads)
    };
    sentenceCompletionsSignal.value = working;
    await waitFor(() => expect(document.querySelector(".sentenceLayer")).not.toBeNull());
    await expectUnmoved("layer open");
    sentenceCompletionsSignal.value = { ...working, status: "ready", sentences: LONG_SENTENCES, language: "en" };
    await waitFor(() => expect(document.querySelectorAll(".sentenceChoice")).toHaveLength(3));
    await expectUnmoved("sentences shown");
    sentenceCompletionsSignal.value = { ...sentenceCompletionsSignal.value, status: "error" };
    await waitFor(() => expect(document.querySelector(".sentenceError")?.textContent).toBeTruthy());
    await expectUnmoved("error shown");
    closeSentences();
    await waitFor(() => expect(document.querySelector(".sentenceLayer")).toBeNull());
    await expectUnmoved("layer closed");
  });

  test.each(["Bliss standard chart", "indicators"])("every control on %s is big enough at 1024×650", async (name): Promise<void> => {
    await resize(1024, 650);
    const palette = await showScreen(name);
    unmount = mountPage(LONGEST_NOTICE);
    await settle();
    expectTargetSizes();

    await showWorstCase(palette);
    expectTargetSizes();
  });

  // Swedish has the longest toolbar labels.
  test("the Swedish top bar stays on one line at 1024×650", async (): Promise<void> => {
    adaptivePaletteGlobals.config.svgBuilderString = { show: true };
    languageSignal.value = "sv";
    await resize(1024, 650);
    await showScreen("Bliss standard chart");
    unmount = mountPage(LONGEST_NOTICE);
    selectedAttributesSignal.value = await allAttributes();
    await waitFor(() => expect(document.querySelector(".messageAttributeChip")).not.toBeNull());
    await settle();

    const { scrollWidth, scrollHeight } = document.documentElement;
    expect(scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    expect(scrollHeight).toBeLessThanOrEqual(window.innerHeight);
    expect(document.getElementById("topBar")?.getBoundingClientRect().height).toBe(44);
    const buttons = Array.from(document.querySelectorAll<HTMLElement>(".symbolEntryToolbar > button"));
    expect(buttons).toHaveLength(4);
    for (const button of buttons) {
      const { top, bottom } = button.getBoundingClientRect();
      expect(top).toBe(document.getElementById("topBar")?.getBoundingClientRect().top);
      expect(bottom - top).toBe(44);
    }
  });
});
