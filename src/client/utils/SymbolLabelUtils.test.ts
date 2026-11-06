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
import { adaptivePaletteGlobals, changeEncodingContents, wordBuildSignal } from "../state/GlobalData";
import { editMessage, setEditGuard } from "../core/MessageEdit";
import { initAdaptivePaletteGlobals } from "../core/InitGlobals";
import { setTestConfig } from "../testUtils/TestConfig";
import {
  getStaticNewLabel, initIndicatorLabels, labelFor, relabel,
  resetSymbolLabelsForTests, startLabelWatcher, whenLabelsSettled
} from "./SymbolLabelUtils";
import { isLocalHost, queryChat } from "../core/OllamaApi";
import { languageSignal } from "../i18n/I18n";
import type { ModifierInfoType, PromptType, SymbolEncodingType } from "../index.d";

vi.mock("../core/OllamaApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../core/OllamaApi")>();
  return { ...actual, queryChat: vi.fn(), isLocalHost: vi.fn(() => true) };
});

const mockedQueryChat = vi.mocked(queryChat);

const FAKE_LABELS = { "382_97": "helper", "1184_97": "aid" };
const FAKE_LABELS_SV = { "382_97": "hjälparen" };
const FAKE_INDICATORS = [
  { id: 97, group: "Nominal", name: "INDICATOR THING", purpose: "Marks concrete sense" }
];

const SYSTEM_PROMPT = "You are a linguistic assistant for Bliss.";
const USER_PROMPT = "Word: \"{{word}}\"\nPart of speech: {{pos}}\nMeaning: {{explanation}}\nIndicator: {{indicator}} — {{purpose}}";

// The prompt with the modifiers line, as in `public/config.json`.
const MODIFIER_PROMPT = "Word: \"{{word}}\"\nModifiers, in order: {{modifiers}}\nIndicator: {{indicator}} — {{purpose}}";

/**
 * Let `labelFor()` ask the model: the setting on, a prompt, and a model installed.
 */
function askModel (systemPrompt: PromptType = SYSTEM_PROMPT): void {
  setTestConfig({
    labelLookup: { useModelQueryFallback: true, model: "gemma4:12b", systemPrompt, userPrompt: MODIFIER_PROMPT }
  });
  adaptivePaletteGlobals.models = ["gemma4:12b"];
}

const help: SymbolEncodingType = { label: "help", composition: 382, userSelectedSymbolId: 382, modifierInfo: [] };
const opposite = { modifierId: [486], modifierGloss: "opposite of", isPrepended: true };
const more = { modifierId: [937], modifierGloss: "more", isPrepended: false };
const oppositeHelp: SymbolEncodingType = { ...help, label: "opposite of help", baseLabel: "help", modifierInfo: [opposite] };
// Symbol 2 ("percent") has no entry in the fake table.
const percent: SymbolEncodingType = { label: "percent", composition: 2, userSelectedSymbolId: 2, modifierInfo: [] };

describe("SymbolLabels", (): void => {

  beforeAll(async (): Promise<void> => {
    await initAdaptivePaletteGlobals();
  });

  beforeEach(async (): Promise<void> => {
    mockedQueryChat.mockReset();
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      const body = url.includes("indicators.json") ? FAKE_INDICATORS
        : url.includes("_sv") ? FAKE_LABELS_SV : FAKE_LABELS;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(body)
      });
    }));
    await initIndicatorLabels();
    setTestConfig({
      labelLookup: {
        useModelQueryFallback: false, model: "", systemPrompt: SYSTEM_PROMPT, userPrompt: USER_PROMPT
      }
    });
    resetSymbolLabelsForTests();
    adaptivePaletteGlobals.models = [];
  });

  afterEach((): void => {
    languageSignal.value = "en";
    vi.unstubAllGlobals();
  });

  test("reads the table for the UI language", async (): Promise<void> => {
    await initIndicatorLabels();
    expect(getStaticNewLabel(382, 97)).toBe("helper");
    languageSignal.value = "sv";
    expect(getStaticNewLabel(382, 97)).toBe("hjälparen");
  });

  test("a missing table leaves its language empty", async (): Promise<void> => {
    vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(url.includes("_sv")
      ? { ok: false, status: 404, json: () => Promise.reject(new Error("not JSON")) }
      : { ok: true, json: () => Promise.resolve(url.includes("indicators.json") ? FAKE_INDICATORS : FAKE_LABELS) })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await initIndicatorLabels();
    languageSignal.value = "sv";
    expect(getStaticNewLabel(382, 97)).toBeUndefined();
    languageSignal.value = "en";
    expect(getStaticNewLabel(382, 97)).toBe("helper");
  });

  describe("getStaticNewLabel", (): void => {

    test("returns the pregenerated label for a known id pair", (): void => {
      expect(getStaticNewLabel(382, 97)).toBe("helper");
    });

    test("returns undefined for an unknown id pair", (): void => {
      expect(getStaticNewLabel(9999, 97)).toBeUndefined();
    });

    test("returns undefined when userSelectedSymbolId is undefined", (): void => {
      expect(getStaticNewLabel(undefined, 97)).toBeUndefined();
    });

  });

  describe("labelFor", (): void => {

    test("a symbol with no modifiers and no indicator has its base label", (): void => {
      askModel();
      expect(labelFor({ ...help, label: "help more", baseLabel: "help" })).toEqual({ label: "help", isAiLabel: false });
    });

    test("an indicator alone takes the table's label, with no query", (): void => {
      askModel();
      expect(labelFor({ ...help, indicatorId: 97 })).toEqual({ label: "helper", isAiLabel: false });
    });

    test("an indicator the table lacks keeps the base label until the model answers", (): void => {
      askModel();
      const result = labelFor({ ...percent, indicatorId: 97 });
      expect(result).toMatchObject({ label: "percent", isAiLabel: false });
      expect(result.pendingLabel).toBeDefined();
    });

    test("a modifier's text is joined to the base label until the model answers", (): void => {
      askModel();
      const result = labelFor(oppositeHelp);
      expect(result).toMatchObject({ label: "opposite of help", isAiLabel: false });
      expect(result.pendingLabel).toBeDefined();
    });

    test("with an indicator too, the text is joined to the table's label", (): void => {
      askModel();
      expect(labelFor({ ...oppositeHelp, indicatorId: 97 }).label).toBe("opposite of helper");
    });

    test("the model is not asked when the setting is off, on the public site, or with no models", (): void => {
      expect(labelFor(oppositeHelp)).toEqual({ label: "opposite of help", isAiLabel: false });
      askModel();
      vi.mocked(isLocalHost).mockReturnValueOnce(false);
      expect(labelFor(oppositeHelp).pendingLabel).toBeUndefined();
      adaptivePaletteGlobals.models = [];
      expect(labelFor(oppositeHelp).pendingLabel).toBeUndefined();
    });

    test("the model is not asked in a language with no prompt", (): void => {
      askModel({ en: SYSTEM_PROMPT });
      languageSignal.value = "sv";
      expect(labelFor(oppositeHelp).pendingLabel).toBeUndefined();
    });

    test("the model is not asked about a symbol, indicator or word it has no data for", (): void => {
      askModel();
      expect(labelFor({ ...oppositeHelp, userSelectedSymbolId: 999999999 }).pendingLabel).toBeUndefined();
      expect(labelFor({ ...percent, indicatorId: 99999 }).pendingLabel).toBeUndefined();
      expect(labelFor({ label: "", composition: 382, modifierInfo: [opposite] }).pendingLabel).toBeUndefined();
    });

    test("the key changes with the modifiers' order and side, and with the language", (): void => {
      askModel();
      const key = (modifierInfo: ModifierInfoType[]): string | undefined =>
        labelFor({ ...help, baseLabel: "help", modifierInfo }).pendingLabel;
      expect(key([opposite])).toBe(key([opposite]));
      expect(key([opposite, more])).not.toBe(key([more, opposite]));
      expect(key([opposite])).not.toBe(key([{ ...opposite, isPrepended: false }]));
      expect(labelFor(oppositeHelp, "en").pendingLabel).not.toBe(labelFor(oppositeHelp, "sv").pendingLabel);
    });

    test("relabel works the label out again and drops a stale pending key", (): void => {
      const relabelled = relabel({ ...oppositeHelp, modifierInfo: [], pendingLabel: "stale" });
      expect(relabelled).toMatchObject({ label: "help", isAiLabel: false, baseLabel: "help" });
      expect(relabelled).not.toHaveProperty("pendingLabel");
    });

  });

  describe("the label watcher", (): void => {

    type ChatReply = Awaited<ReturnType<typeof queryChat>>;
    // Each query's stop signal, and a way to answer it.
    let signals: (AbortSignal | undefined)[];
    let replies: ((content: string) => void)[];

    /**
     * Put symbols in the message, relabelled as a cell does.
     */
    const put = (...payloads: SymbolEncodingType[]): void => {
      editMessage({ payloads: payloads.map((payload) => relabel(payload)), caretPosition: payloads.length - 1 });
    };
    const labels = (): string[] => changeEncodingContents.value.payloads.map((payload) => payload.label);

    beforeEach((): void => {
      askModel();
      setEditGuard(null);
      startLabelWatcher();
      changeEncodingContents.value = { payloads: [], caretPosition: -1 };
      wordBuildSignal.value = null;
      signals = [];
      replies = [];
      mockedQueryChat.mockImplementation((_query, _model, _stream, _system, abortSignal) => {
        signals.push(abortSignal);
        return new Promise<ChatReply>((resolve) => {
          replies.push((content) => resolve({ message: { content } } as ChatReply));
        });
      });
    });

    afterEach((): void => {
      resetSymbolLabelsForTests();
      changeEncodingContents.value = { payloads: [], caretPosition: -1 };
      wordBuildSignal.value = null;
    });

    test("asks once for symbols in the same state", (): void => {
      put(oppositeHelp, oppositeHelp);
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });

    test("puts the answer in every symbol waiting for it, in one edit, marked as AI", async (): Promise<void> => {
      put(oppositeHelp, oppositeHelp);
      let edits = 0;
      const unsubscribe = changeEncodingContents.subscribe(() => { edits += 1; });
      edits = 0;
      replies[0]("hinder");
      await vi.waitFor(() => expect(labels()).toEqual(["hinder", "hinder"]));
      unsubscribe();
      expect(edits).toBe(1);
      expect(changeEncodingContents.value.payloads[0]).toMatchObject({ isAiLabel: true });
      expect(changeEncodingContents.value.payloads[0]).not.toHaveProperty("pendingLabel");
      // The answer is kept: the same state is labelled at once next time.
      expect(labelFor(oppositeHelp)).toEqual({ label: "hinder", isAiLabel: true });
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });

    test("stops a query no symbol waits for, and keeps nothing from it", (): void => {
      put(oppositeHelp);
      put({ ...oppositeHelp, modifierInfo: [opposite, more] });
      expect(signals[0]?.aborted).toBe(true);
      expect(signals[1]?.aborted).toBe(false);
      // Back to the first state: it was never answered, so it is asked about again.
      put(oppositeHelp);
      expect(mockedQueryChat).toHaveBeenCalledTimes(3);
    });

    test("a query stopped by fetch's AbortError keeps nothing, and is asked again", async (): Promise<void> => {
      // As in production: `fetch` rejects with an AbortError when its signal fires.
      mockedQueryChat.mockImplementation((_query, _model, _stream, _system, abortSignal) => {
        return new Promise<ChatReply>((_resolve, reject) => {
          abortSignal?.addEventListener("abort", () => reject(new DOMException("", "AbortError")));
        });
      });
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      put(oppositeHelp);
      put({ ...oppositeHelp, modifierInfo: [opposite, more] });
      // Let the rejection of the first query settle.
      await new Promise((resolve) => setTimeout(resolve, 0));
      put(oppositeHelp);
      expect(mockedQueryChat).toHaveBeenCalledTimes(3);
      expect(changeEncodingContents.value.payloads[0]).toHaveProperty("pendingLabel");
      expect(error).not.toHaveBeenCalled();
    });

    test("a hand-built symbol with no userSelectedSymbolId is asked about by its base label", (): void => {
      put({ label: "opposite of thing", baseLabel: "thing", composition: 382, modifierInfo: [opposite] });
      expect(mockedQueryChat.mock.calls[0][0]).toBe("Word: \"thing\"\nModifiers, in order: opposite of (before)");
    });

    test("a failed query leaves the joined text, and is not asked again", async (): Promise<void> => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      mockedQueryChat.mockRejectedValueOnce(new Error("connection refused"));
      put(oppositeHelp);
      await vi.waitFor(() => expect(changeEncodingContents.value.payloads[0]).not.toHaveProperty("pendingLabel"));
      expect(changeEncodingContents.value.payloads[0]).toMatchObject({ label: "opposite of help", isAiLabel: false });
      put(oppositeHelp);
      expect(mockedQueryChat).toHaveBeenCalledTimes(1);
    });

    test("the joined text keeps the model's answer for the indicator alone", async (): Promise<void> => {
      put({ ...percent, indicatorId: 97 });
      replies[0]("percents");
      await vi.waitFor(() => expect(labels()).toEqual(["percents"]));
      const result = labelFor({ ...percent, baseLabel: "percent", indicatorId: 97, modifierInfo: [more] });
      expect(result).toMatchObject({ label: "percents more", isAiLabel: true });
      expect(result.pendingLabel).toBeDefined();
    });

    test("a symbol in the message set aside for a new word is still asked about", async (): Promise<void> => {
      put(oppositeHelp);
      const message = changeEncodingContents.value;
      // Start a word as `startBuilding()` does: the message goes aside after the input area empties.
      editMessage({ payloads: [], caretPosition: -1 }, () => {
        wordBuildSignal.value = { message, combine: false };
      });
      expect(signals.at(-1)?.aborted).toBe(false);
      replies.at(-1)?.("hinder");
      await vi.waitFor(() => expect(labelFor(oppositeHelp).label).toBe("hinder"));
      // Cancel the word: the message comes back with the answer in it.
      editMessage(message, () => {
        wordBuildSignal.value = null;
      });
      expect(labels()).toEqual(["hinder"]);
    });

    test("the prompt lists the modifiers in order with their side, and drops an absent indicator", (): void => {
      const gloss = adaptivePaletteGlobals.symbols.find((symbol) => symbol.id === 382)!.gloss;
      put({ ...oppositeHelp, modifierInfo: [opposite, more] });
      const [userPrompt, modelName, streamResp, systemPrompt] = mockedQueryChat.mock.calls[0];
      expect(userPrompt).toBe(`Word: "${gloss}"\nModifiers, in order: opposite of (before), more (after)`);
      expect(modelName).toBe("gemma4:12b");
      expect(streamResp).toBe(false);
      expect(systemPrompt).toBe(SYSTEM_PROMPT);
    });

    test("an indicator alone is asked about as before", (): void => {
      const gloss = adaptivePaletteGlobals.symbols.find((symbol) => symbol.id === 2)!.gloss;
      put({ ...percent, indicatorId: 97 });
      expect(mockedQueryChat.mock.calls[0][0]).toBe(`Word: "${gloss}"\nIndicator: thing — Marks concrete sense`);
    });

    test("asks in the UI language, with its gloss and system prompt", (): void => {
      askModel({ en: SYSTEM_PROMPT, sv: "Svenska." });
      languageSignal.value = "sv";
      put(oppositeHelp);
      expect(mockedQueryChat.mock.calls[0][0]).toContain("Word: \"hjälp, stöd\"");
      expect(mockedQueryChat.mock.calls[0][3]).toBe("Svenska.");
    });

    test("whenLabelsSettled runs a task at once, or once every label has settled", async (): Promise<void> => {
      const task = vi.fn();
      whenLabelsSettled(task);
      expect(task).toHaveBeenCalledTimes(1);
      put(oppositeHelp);
      whenLabelsSettled(task);
      expect(task).toHaveBeenCalledTimes(1);
      replies[0]("hinder");
      await vi.waitFor(() => expect(task).toHaveBeenCalledTimes(2));
      // It runs once only.
      put(help);
      expect(task).toHaveBeenCalledTimes(2);
    });

  });

});
