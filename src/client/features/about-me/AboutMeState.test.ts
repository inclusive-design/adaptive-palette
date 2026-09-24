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
import { setStorage } from "../../core/StorageBackend";
import { MemoryStorage } from "../../core/MemoryStorage";
import type { DismissedFactType, AboutMeFactType } from "../../index.d";
import {
  aboutMeSignal, hydrateAboutMe, addFact, editFact, removeFact,
  acceptSuggestion, rejectSuggestion, restoreDismissed, recordLearning, isKnownText, aboutMePromptText
} from "./AboutMeState";

const dismissed = (): DismissedFactType => ({ category: "Preferences", text: "likes cats" });

const fact = (overrides: Partial<AboutMeFactType> = {}): AboutMeFactType => ({
  id: "fact-1", category: "Family", text: "has a dog named Rex",
  source: "manual", addedAt: "2026-09-22T00:00:00.000Z", ...overrides
});

describe("AboutMeState", (): void => {

  let storage: MemoryStorage;

  beforeEach(async (): Promise<void> => {
    storage = new MemoryStorage();
    setStorage(storage);
    await hydrateAboutMe();
  });

  test("hydrateAboutMe reads the saved About Me facts", async (): Promise<void> => {
    await storage.writeAboutMe({ facts: [fact()], dismissed: [dismissed()], pending: [] });
    await hydrateAboutMe();
    expect(aboutMeSignal.value).toEqual({ facts: [fact()], dismissed: [dismissed()], pending: [] });
  });

  test("hydrateAboutMe drops malformed entries", async (): Promise<void> => {
    await storage.writeAboutMe({
      facts: [fact(), { id: 1 }, fact({ id: "fact-2", category: "Pets" as never })],
      dismissed: [dismissed(), "likes cats", { category: "Pets", text: "a cat" }],
      pending: []
    } as never);
    await hydrateAboutMe();
    expect(aboutMeSignal.value).toEqual({ facts: [fact()], dismissed: [dismissed()], pending: [] });
  });

  test("addFact adds a trimmed manual fact and saves it", async (): Promise<void> => {
    await addFact("Preferences", "  likes tea ");
    const [added] = aboutMeSignal.value.facts;
    expect(added).toMatchObject({ category: "Preferences", text: "likes tea", source: "manual" });
    expect(typeof added.id).toBe("string");
    expect(await storage.readAboutMe()).toEqual(aboutMeSignal.value);
  });

  test("editFact changes the category and text and keeps the rest", async (): Promise<void> => {
    aboutMeSignal.value = { facts: [fact()], dismissed: [], pending: [] };
    await editFact("fact-1", "Background", "grew up in Halifax");
    expect(aboutMeSignal.value.facts).toEqual([
      fact({ category: "Background", text: "grew up in Halifax" })
    ]);
    expect(await storage.readAboutMe()).toEqual(aboutMeSignal.value);
  });

  test("removing a manual fact does not dismiss it", async (): Promise<void> => {
    aboutMeSignal.value = { facts: [fact()], dismissed: [], pending: [] };
    await removeFact("fact-1");
    expect(aboutMeSignal.value).toEqual({ facts: [], dismissed: [], pending: [] });
  });

  test("removing a suggested fact dismisses its text", async (): Promise<void> => {
    aboutMeSignal.value = { facts: [fact({ source: "suggested" })], dismissed: [], pending: [] };
    await removeFact("fact-1");
    expect(aboutMeSignal.value).toEqual({
      facts: [], dismissed: [{ category: "Family", text: "has a dog named Rex" }], pending: []
    });
  });

  test("acceptSuggestion adds a suggested fact", async (): Promise<void> => {
    await acceptSuggestion({ category: "Family", text: "sister Ana" });
    expect(aboutMeSignal.value.facts[0]).toMatchObject({
      category: "Family", text: "sister Ana", source: "suggested"
    });
  });

  test("rejectSuggestion dismisses without adding a fact", async (): Promise<void> => {
    await rejectSuggestion({ category: "Family", text: "sister Ana" });
    expect(aboutMeSignal.value).toEqual({
      facts: [], dismissed: [{ category: "Family", text: "sister Ana" }], pending: []
    });
    expect(await storage.readAboutMe()).toEqual(aboutMeSignal.value);
  });

  test("restoreDismissed adds it back as a learnt fact in its own category", async (): Promise<void> => {
    const entry = dismissed();
    aboutMeSignal.value = { facts: [], dismissed: [entry], pending: [] };
    await restoreDismissed(entry);
    expect(aboutMeSignal.value.dismissed).toEqual([]);
    expect(aboutMeSignal.value.facts[0]).toMatchObject({
      category: "Preferences", text: "likes cats", source: "suggested"
    });
    expect(await storage.readAboutMe()).toEqual(aboutMeSignal.value);
  });

  test("hydrateAboutMe reads pending suggestions and the watermark", async (): Promise<void> => {
    const learntUpTo = { id: 4, timestamp: "2026-09-24T15:15:00.000Z" };
    await storage.writeAboutMe({ facts: [], dismissed: [], pending: [dismissed()], learntUpTo });
    await hydrateAboutMe();
    expect(aboutMeSignal.value).toEqual({ facts: [], dismissed: [], pending: [dismissed()], learntUpTo });
  });

  test("hydrateAboutMe drops malformed pending entries and a malformed watermark", async (): Promise<void> => {
    for (const learntUpTo of [{ id: -1, timestamp: "" }, { id: 2.5 }, { id: "4" }, "4", null]) {
      await storage.writeAboutMe({
        facts: [], dismissed: [], pending: [dismissed(), { text: 1 }], learntUpTo
      } as never);
      await hydrateAboutMe();
      expect(aboutMeSignal.value).toEqual({ facts: [], dismissed: [], pending: [dismissed()] });
    }
  });

  test("hydrateAboutMe keeps a watermark whose timestamp is unusable", async (): Promise<void> => {
    await storage.writeAboutMe({ facts: [], dismissed: [], pending: [], learntUpTo: { id: 4 } } as never);
    await hydrateAboutMe();
    expect(aboutMeSignal.value.learntUpTo).toEqual({ id: 4 });
  });

  test("recordLearning adds the suggestions and moves the watermark, and saves both", async (): Promise<void> => {
    aboutMeSignal.value = { facts: [], dismissed: [], pending: [dismissed()] };
    const learntUpTo = { id: 9, timestamp: "2026-09-24T15:15:00.000Z" };
    await recordLearning([{ category: "Family", text: "sister Ana" }], learntUpTo);
    expect(aboutMeSignal.value).toEqual({
      facts: [], dismissed: [],
      pending: [dismissed(), { category: "Family", text: "sister Ana" }],
      learntUpTo
    });
    expect(await storage.readAboutMe()).toEqual(aboutMeSignal.value);
  });

  test("acceptSuggestion takes the suggestion off the pending list", async (): Promise<void> => {
    const suggestion = { category: "Family" as const, text: "sister Ana" };
    aboutMeSignal.value = { facts: [], dismissed: [], pending: [suggestion, dismissed()] };
    await acceptSuggestion(suggestion);
    expect(aboutMeSignal.value.pending).toEqual([dismissed()]);
    expect(aboutMeSignal.value.facts[0]).toMatchObject({ text: "sister Ana", source: "suggested" });
  });

  test("rejectSuggestion takes the suggestion off the pending list", async (): Promise<void> => {
    const suggestion = { category: "Family" as const, text: "sister Ana" };
    aboutMeSignal.value = { facts: [], dismissed: [], pending: [suggestion] };
    await rejectSuggestion(suggestion);
    expect(aboutMeSignal.value).toEqual({ facts: [], dismissed: [suggestion], pending: [] });
  });

  test("editing About Me keeps pending suggestions and the watermark", async (): Promise<void> => {
    const learntUpTo = { id: 9, timestamp: "2026-09-24T15:15:00.000Z" };
    aboutMeSignal.value = { facts: [], dismissed: [], pending: [dismissed()], learntUpTo };
    await addFact("Family", "sister Ana");
    expect(aboutMeSignal.value.pending).toEqual([dismissed()]);
    expect(aboutMeSignal.value.learntUpTo).toEqual(learntUpTo);
  });

  test("isKnownText matches pending suggestions", (): void => {
    aboutMeSignal.value = { facts: [], dismissed: [], pending: [dismissed()] };
    expect(isKnownText("Likes cats")).toBe(true);
  });

  test("isKnownText matches facts and dismissals, ignoring case and spaces", (): void => {
    aboutMeSignal.value = { facts: [fact()], dismissed: [dismissed()], pending: [] };
    expect(isKnownText(" Has a dog named REX")).toBe(true);
    expect(isKnownText("likes cats ")).toBe(true);
    expect(isKnownText("likes tea")).toBe(false);
  });

  test("aboutMePromptText is empty with no facts", (): void => {
    expect(aboutMePromptText()).toBe("");
  });

  test("aboutMePromptText lists facts in category order", (): void => {
    aboutMeSignal.value = {
      facts: [
        fact({ id: "a", category: "Preferences", text: "likes tea" }),
        fact({ id: "b", category: "Family", text: "sister Ana" }),
        fact({ id: "c", category: "Family", text: "has a dog named Rex" })
      ],
      dismissed: [], pending: [] };
    expect(aboutMePromptText()).toBe(
      "Family: sister Ana; Family: has a dog named Rex; Preferences: likes tea"
    );
  });

  test("a failed save keeps the change for the session", async (): Promise<void> => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(storage, "writeAboutMe").mockRejectedValue(new Error("storage is not available"));
    await addFact("Family", "sister Ana");
    expect(aboutMeSignal.value.facts[0].text).toBe("sister Ana");
    expect(console.error).toHaveBeenCalled();
  });
});
