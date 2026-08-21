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

import {
  blissSlots, FUTURE_INDICATOR_ID, IMPERATIVE_INDICATOR_ID, PAST_INDICATOR_ID,
  PLURAL_INDICATOR_ID, sentenceSpans
} from "./BlissSentenceUtils";
import { MESSAGE_LOG_KEY, saveMessageRecord } from "../../core/MessageLog";
import { SymbolCompositionType, SymbolEncodingType } from "../../index.d";
import { compositionToBstr, getSvgElement, initSvgCompositeDefinitions } from "../../utils/SvgUtils";

describe("BlissSentenceUtils", (): void => {

  const texts = (sentence: string): string[] =>
    sentenceSpans(sentence).map((span) => span.text);

  const keys = (sentence: string): string[] =>
    sentenceSpans(sentence).map((span) => span.key);

  describe("sentenceSpans", (): void => {

    it("gives a verb its `to` when a verb follows", (): void => {
      expect(texts("I want to go home")).toEqual(["I", "want to", "go", "home"]);
    });

    it("leaves a directional `to` alone when a noun follows", (): void => {
      expect(texts("I go to school")).toEqual(["I", "go", "to", "school"]);
      expect(keys("I go to school")).toEqual(["i", "to go", "to", "school"]);
    });

    it("keeps a verb's auxiliaries in the same span", (): void => {
      expect(texts("I will eat apples")).toEqual(["I", "will eat", "apples"]);
      expect(texts("I have eaten lunch")).toEqual(["I", "have eaten", "lunch"]);
      expect(texts("I was eating lunch")).toEqual(["I", "was eating", "lunch"]);
    });

    it("keys a verb as the Bliss `to` form of its infinitive", (): void => {
      expect(keys("I came home")).toEqual(["i", "to come", "home"]);
      expect(keys("I will eat apples")).toEqual(["i", "to eat", "apple"]);
    });

    it("keys a plural noun by its singular", (): void => {
      expect(keys("I want apples")).toEqual(["i", "to want", "apple"]);
    });

    it("matches a multi-word gloss as one span", (): void => {
      expect(texts("I like ice cream")).toEqual(["I", "like", "ice cream"]);
      expect(texts("Valentine's Day is fun")).toEqual(["Valentine's Day", "is", "fun"]);
    });

    it("retries a multi-word gloss with the last token singularized", (): void => {
      const spans = sentenceSpans("I like ice creams");
      expect(spans.map((span) => span.text)).toEqual(["I", "like", "ice creams"]);
      expect(spans[2].key).toBe("ice cream");
    });

    it("expands a contraction", (): void => {
      expect(texts("I'm hungry")).toEqual(["I", "am", "hungry"]);
      expect(keys("I'm hungry")).toEqual(["i", "to be", "hungry"]);
    });

    it("keeps an unknown proper noun as its own span", (): void => {
      expect(texts("I miss Sarah")).toEqual(["I", "miss", "Sarah"]);
    });

    it("returns nothing for an empty sentence", (): void => {
      expect(sentenceSpans("   ")).toEqual([]);
    });

    const indicators = (sentence: string): (number | undefined)[] =>
      sentenceSpans(sentence).map((span) => span.indicatorId);

    it("marks a past tense verb", (): void => {
      expect(indicators("I came home")).toEqual([undefined, PAST_INDICATOR_ID, undefined]);
    });

    it("marks a future tense verb and a plural noun", (): void => {
      expect(indicators("I will eat apples"))
        .toEqual([undefined, FUTURE_INDICATOR_ID, PLURAL_INDICATOR_ID]);
    });

    it("leaves a present tense verb unmarked, so it keeps its own indicator", (): void => {
      expect(indicators("I want water")).toEqual([undefined, undefined, undefined]);
    });

    it("marks an imperative rather than the present tense it is also tagged with", (): void => {
      expect(indicators("Eat your lunch"))
        .toEqual([IMPERATIVE_INDICATOR_ID, undefined, undefined]);
    });

    it("does not mark a modal question as an imperative", (): void => {
      // compromise tags the bare verb of "Can you help me?" imperative; the subject rules it out.
      expect(indicators("Can you help me")).toEqual([undefined, undefined, undefined, undefined]);
      expect(indicators("Would you open the door"))
        .toEqual([undefined, undefined, undefined, undefined, undefined]);
    });

    it("still marks a real imperative that has no subject", (): void => {
      expect(indicators("Please turn on the television")[1]).toBe(IMPERATIVE_INDICATOR_ID);
    });

    it("collapses the perfect aspect onto the past, which Bliss has no indicator for", (): void => {
      expect(indicators("I have eaten lunch")).toEqual([undefined, PAST_INDICATOR_ID, undefined]);
    });

    it("keeps the tense of a continuous verb rather than its aspect", (): void => {
      // Bliss's continuous indicator does not combine with a tense, and losing the tense is
      // the worse loss.
      expect(indicators("I was eating lunch")).toEqual([undefined, PAST_INDICATOR_ID, undefined]);
    });

    it("keys a `have to` verb without doubling the `to`", (): void => {
      // compromise hands back "to go" as the infinitive here, not "go".
      expect(keys("I have to go home")).toEqual(["i", "to go", "home"]);
      expect(keys("I had to wait")).toEqual(["i", "to wait"]);
    });

    it("singularizes a plural compromise reads as a verb", (): void => {
      // Bare "books" and "drinks" tag as verbs, leaving `.nouns()` empty.
      expect(keys("I like books")).toEqual(["i", "to like", "book"]);
      expect(keys("I want drinks")).toEqual(["i", "to want", "drink"]);
    });

    it("marks a plural found through the singularized retry", (): void => {
      expect(indicators("I like ice creams")).toEqual([undefined, undefined, PLURAL_INDICATOR_ID]);
    });

    it("gives each punctuation mark its own span", (): void => {
      expect(texts("I want ice cream, please."))
        .toEqual(["I", "want", "ice cream", ",", "please", "."]);
    });

    it("keeps a mark with no Bliss symbol as its own span", (): void => {
      expect(texts("I like ice cream...")).toEqual(["I", "like", "ice cream", "..."]);
    });

    it("draws no apostrophe for an expanded contraction", (): void => {
      expect(texts("I'm hungry.")).toEqual(["I", "am", "hungry", "."]);
    });
  });

  describe("blissSlots", (): void => {

    beforeAll((): void => {
      initSvgCompositeDefinitions();
    });

    beforeEach((): void => {
      window.localStorage.removeItem(MESSAGE_LOG_KEY);
    });

    const compositions = (sentence: string): (SymbolCompositionType | undefined)[] =>
      blissSlots(sentence).map((slot) => slot.payload?.composition);

    it("labels each slot with the English span it covers", (): void => {
      expect(blissSlots("I want to go home").map((slot) => slot.text))
        .toEqual(["I", "want to", "go", "home"]);
    });

    it("resolves an action by its `to` form, not the bare noun", (): void => {
      // The bare sense "want, desire" is the noun, id 4765.
      expect(blissSlots("I want water")[1].payload?.userSelectedSymbolId).toBe(2705);
    });

    it("overlays an indicator with `;;` on the bare id", (): void => {
      expect(compositions("I came home")[1]).toEqual([1440, ";;", 92]);
    });

    it("overlays a plural on a multi-word gloss", (): void => {
      expect(compositions("I like ice creams")[2]).toEqual([1843, ";;", 99]);
    });

    it("keeps the entry's own composition when there is no indicator", (): void => {
      expect(compositions("I like ice cream")[2]).toEqual([329, "/", 642, "/", 678, "/", 394]);
    });

    it("prefers the user's own payload for a verb, saved under its bare label", (): void => {
      // The span is keyed "to want" and reads "want to"; the user saved it as "want".
      saveMessageRecord([{ label: "want", composition: 4321, modifierInfo: [] }]);
      expect(blissSlots("I want water")[1].payload?.composition).toBe(4321);
    });

    it("finds a symbol for the main verb of a `have to` sentence", (): void => {
      expect(blissSlots("I have to go")[1].payload?.userSelectedSymbolId).toBe(1736);
    });

    it("keeps a payload the user built with modifiers rather than overlaying it", (): void => {
      // Overlaying would replace their composition and silently drop the modifiers.
      saveMessageRecord([{
        label: "apple", composition: [8, "/", 9], modifierInfo: [{ label: "big", id: 12 }]
      }] as unknown as SymbolEncodingType[]);
      expect(blissSlots("I want apples")[2].payload?.composition).toEqual([8, "/", 9]);
    });

    it("leaves a span with no symbol as text", (): void => {
      const slots = blissSlots("I miss Sarah");
      expect(slots[2].text).toBe("Sarah");
      expect(slots[2].payload).toBeUndefined();
    });

    it("resolves an article rather than dropping it", (): void => {
      expect(blissSlots("the apple")[0].payload?.userSelectedSymbolId).toBe(647);
    });

    it("returns one text slot when the sentence cannot be parsed at all", (): void => {
      // A guard, not a normal path: an unresolved span is a text slot, not a failure.
      expect(blissSlots("")).toEqual([]);
    });

    it("produces an svg-builder string the library accepts", (): void => {
      const composition = blissSlots("I came home")[1].payload?.composition;
      expect(compositionToBstr(composition as SymbolCompositionType)).toBe("1440;;B92");
      expect(getSvgElement(composition as SymbolCompositionType)).toBeDefined();
    });

    it("draws a punctuation mark as its Bliss symbol", (): void => {
      const slots = blissSlots("I want ice cream, please.");
      expect(slots[3].text).toBe(",");
      expect(slots[3].payload?.userSelectedSymbolId).toBe(5);
      expect(slots[5].text).toBe(".");
      expect(slots[5].payload?.userSelectedSymbolId).toBe(4);
    });

    it("leaves a mark with no Bliss symbol as text", (): void => {
      const slots = blissSlots("I like ice cream...");
      expect(slots[3].text).toBe("...");
      expect(slots[3].payload).toBeUndefined();
    });

    it("produces an svg-builder string for a punctuation symbol", (): void => {
      const composition = blissSlots("I am hungry.")[3].payload?.composition;
      expect(compositionToBstr(composition as SymbolCompositionType)).toBe("B4");
      expect(getSvgElement(composition as SymbolCompositionType)).toBeDefined();
    });
  });
});
