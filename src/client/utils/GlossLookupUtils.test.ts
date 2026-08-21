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

import { findGlossEntry, normalizeSense, resolveWordPayload } from "./GlossLookupUtils";
import { SymbolEncodingType } from "../index.d";

describe("GlossLookupUtils", (): void => {

  describe("normalizeSense", (): void => {
    it("lowercases and trims", (): void => {
      expect(normalizeSense("  Valentine's Day ")).toBe("valentine's day");
    });

    it("strips a trailing parenthetical, with or without a dash", (): void => {
      expect(normalizeSense("yes - (exclamatory)")).toBe("yes");
      expect(normalizeSense("side (body)")).toBe("side");
    });

    it("leaves a parenthetical that is not trailing alone", (): void => {
      expect(normalizeSense("action (in favour of) thing")).toBe("action (in favour of) thing");
    });
  });

  describe("findGlossEntry", (): void => {
    const idFor = (key: string): number | undefined => findGlossEntry(key)?.id;

    it("matches an exact sense", (): void => {
      expect(idFor("home")).toBe(1816);
      expect(idFor("water")).toBe(695);
    });

    it("prefers the earliest sense position", (): void => {
      // "water, fluid, liquid" has it at position 0; other entries have it much later.
      expect(idFor("water")).toBe(695);
    });

    it("prefers a single-sense entry over a multi-sense one at the same position", (): void => {
      // id 780 is "ice cream, sherbet, sorbet"; id 1843 is "ice cream" alone.
      expect(idFor("ice cream")).toBe(1843);
    });

    it("tries the gloss as written before normalizing", (): void => {
      // Normalizing first would find id 37 "i (lowercase)" and id 29 "a (lowercase)".
      expect(idFor("i")).toBe(1840);
      expect(idFor("a")).toBe(100);
    });

    it("falls back to a normalized sense when nothing matches as written", (): void => {
      expect(idFor("yes")).toBe(2776);   // "yes - (exclamatory)"
      expect(idFor("for")).toBe(331);    // "for (in exchange for), instead"
      expect(idFor("side")).toBe(592);   // "side (body)"
    });

    it("does not let the single-sense rule pick an index numeral on the normalized pass", (): void => {
      // Ids 19-28 are superscript modifier glyphs. Both "four (digit), 4" and
      // "four (index number)" are qualified, so both only match once normalized.
      expect(idFor("four")).toBe(13);
      expect(idFor("two")).toBe(11);
      expect(idFor("nine")).toBe(18);
    });

    it("finds the action senses the Bliss dictionary writes with a `to` prefix", (): void => {
      expect(idFor("to want")).toBe(2705);
      expect(idFor("to come")).toBe(1440);
      expect(idFor("to be")).toBe(1267);
    });

    it("finds a multi-word sense", (): void => {
      expect(idFor("valentine's day")).toBe(2680);
    });

    it("returns undefined for a word with no sense", (): void => {
      expect(findGlossEntry("zzzq")).toBeUndefined();
    });
  });

  describe("resolveWordPayload", (): void => {
    const payloadByLabel = new Map<string, SymbolEncodingType>();

    it("reports the rung it resolved on", (): void => {
      expect(resolveWordPayload("water", payloadByLabel).rung).toBe("exactGloss");
      expect(resolveWordPayload("zzzq", payloadByLabel).rung).toBe("dropped");
    });

    it("prefers the user's own payload over the dictionary", (): void => {
      const own = { label: "water", composition: 1234, modifierInfo: [] };
      const { payload, rung } = resolveWordPayload("water", new Map([["water", own]]));
      expect(rung).toBe("history");
      expect(payload?.composition).toBe(1234);
    });

    it("labels a dictionary match with the word looked up, not the whole gloss", (): void => {
      expect(resolveWordPayload("water", payloadByLabel).payload?.label).toBe("water");
    });
  });
});
