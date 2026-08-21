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

/**
 * Turn one English sentence into the Bliss symbols.
 *
 * Everything here is pure and synchronous: the sentence is parsed by `compromise` on the
 * client and looked up in the Bliss dictionary. No model is queried.
 */
import nlp from "compromise";
import { findGlossEntry, glossPayload } from "../../utils/GlossLookupUtils";
import { readMessageLog } from "../../core/MessageLog";
import { BlissSentenceSlotType, SymbolEncodingType } from "../../index.d";

/**
 * One run of words treated as a unit, and the key it is looked up under. The key differs from
 * the text because the Bliss dictionary glosses actions with a "to" prefix and nouns in the
 * singular: the span "want to" is looked up as "to want", and "apples" as "apple".
 */
export type SentenceSpanType = {
  text: string,
  key: string,
  // The Bliss indicator to overlay, if the span calls for one.
  indicatorId?: number,
  // A punctuation mark rather than a word: resolved by mark, never by gloss.
  isPunctuation?: boolean
};

/**
 * One term as compromise tagged it.
 */
type TaggedTermType = {
  id: string,
  text: string,
  tags: string[],
  // The whitespace and punctuation that followed the term, as compromise read it: ", ".
  post: string
};

/**
 * A verb compromise found, and the terms it covers. `will eat` is one verb over two terms.
 */
type VerbSpanType = {
  ids: string[],
  infinitive: string,
  form: string,
  tense: string
};

/**
 * As much of a compromise document as this module uses.
 *
 * compromise's own `.d.ts` types `.json()` as `any` and its `JsonProps` does not declare the
 * `verb` option the verbs plugin supports, so the document is cast to this once and the shapes
 * it really returns are named here, rather than letting `any` spread through the parsing below.
 */
type SentenceDocType = {
  contractions: () => { expand: () => void },
  terms: () => { json: (options: object) => { terms: TaggedTermType[] }[] },
  verbs: () => { json: (options: object) => {
    terms: { id: string }[],
    verb?: { infinitive?: string, grammar?: { form?: string, tense?: string } }
  }[] }
};

// The longest multi-word gloss worth scanning for. 98% of senses are three words or fewer.
const MAX_GLOSS_WORDS = 3;

// Bliss indicators. Present tense (928) is deliberately absent: an action entry's own
// indicator 81 is already the unmarked present, and 928 is the marked form.
export const PAST_INDICATOR_ID = 92;
export const FUTURE_INDICATOR_ID = 87;
export const IMPERATIVE_INDICATOR_ID = 907;
export const PLURAL_INDICATOR_ID = 99;

// The Bliss punctuation symbols, by the English mark they stand for. A direct map rather than a
// gloss lookup: "period" also glosses id 426 ("limited time, interval, period") and id 2001
// ("menstruation, menstrual period").
const PUNCTUATION_IDS: Record<string, number> = {
  "!": 1,
  "?": 3,
  ".": 4,
  ",": 5,
  ":": 6,
  "'": 7
};

/**
 * Read a sentence into terms and verb spans, with contractions expanded first so "I'm" is
 * parsed as "I am". This is done here rather than by instructing the model, because it holds
 * even when the model ignores the instruction.
 * @param {string} sentence - The English sentence.
 * @returns {{ terms: TaggedTermType[], verbs: VerbSpanType[] }}
 */
function parseSentence (sentence: string): { terms: TaggedTermType[], verbs: VerbSpanType[] } {
  const doc = nlp(sentence) as unknown as SentenceDocType;
  doc.contractions().expand();
  const terms = doc.terms().json({ terms: { id: true, tags: true } })
    .map((entry) => entry.terms[0])
    .filter((term): term is TaggedTermType => term !== undefined);
  const verbs = doc.verbs().json({ terms: { id: true }, verb: true })
    .map((verb): VerbSpanType => ({
      ids: verb.terms.map((term) => term.id),
      infinitive: verb.verb?.infinitive ?? "",
      form: verb.verb?.grammar?.form ?? "",
      tense: verb.verb?.grammar?.tense ?? ""
    }))
    .filter((verb) => verb.infinitive.length > 0);
  return { terms, verbs };
}

/**
 * The singular of a word, as compromise conjugates it: "apples" to "apple", "people" to
 * "person".
 * @param {string} word - The word.
 * @returns {string}
 */
function toSingular (word: string): string {
  // Tagged as a noun first: compromise reads a bare "books" or "drinks" as a verb, which
  // leaves `.nouns()` empty and the word unchanged.
  const doc = nlp(word);
  doc.tag("Noun");
  const singular = doc.nouns().toSingular().text().trim();
  return singular.length > 0 ? singular.toLowerCase() : word.toLowerCase();
}

/**
 * The indicator a verb span calls for, or `undefined` for the present tense.
 *
 * Imperative is tested first because compromise tags an imperative `PresentTense` as well, so
 * a tense-first order would never reach it. Passive, conditional and continuous are left out:
 * see the spec's step 4.
 *
 * `form === "imperative"` is not on its own evidence of a command: compromise also reports it
 * for the bare verb of a modal question, so "Can you help me?" would be marked as an order.
 * A subject pronoun ahead of the verb rules that out, and no real imperative has one.
 * @param {VerbSpanType} verb - The verb span.
 * @param {boolean} hasSubjectBefore - Whether a pronoun precedes the verb in the sentence.
 * @returns {number | undefined}
 */
function verbIndicator (verb: VerbSpanType, hasSubjectBefore: boolean): number | undefined {
  if (verb.form === "imperative" && !hasSubjectBefore) {
    return IMPERATIVE_INDICATOR_ID;
  }
  if (verb.tense === "PastTense") {
    return PAST_INDICATOR_ID;
  }
  if (verb.tense === "FutureTense") {
    return FUTURE_INDICATOR_ID;
  }
  return undefined;
}

/**
 * The lookup key and indicator for a single term: a plural noun by its singular, with the
 * plural indicator; anything else by what it says. Verbs never reach here.
 * @param {TaggedTermType} term - The term.
 * @returns {{ key: string, indicatorId?: number }}
 */
function singleTermKey (term: TaggedTermType): { key: string, indicatorId?: number } {
  return term.tags.includes("Plural")
    ? { key: toSingular(term.text), indicatorId: PLURAL_INDICATOR_ID }
    : { key: term.text.toLowerCase() };
}

/**
 * Look for a multi-word gloss over a run of terms starting at `start`, longest first. A miss
 * is retried with the last word singularized, so "ice creams" finds "ice cream".
 * @param {TaggedTermType[]} terms - Every term in the sentence.
 * @param {number} start - Where the unclaimed run begins.
 * @param {number} limit - One past the last term of the unclaimed run.
 * @returns {SentenceSpanType & { length: number } | undefined}
 */
function scanForGloss (
  terms: TaggedTermType[], start: number, limit: number
): (SentenceSpanType & { length: number }) | undefined {
  const longest = Math.min(MAX_GLOSS_WORDS, limit - start);
  for (let length = longest; length >= 2; length -= 1) {
    const words = terms.slice(start, start + length).map((term) => term.text);
    const text = words.join(" ");
    const written = text.toLowerCase();
    const singularized = [...words.slice(0, -1), toSingular(words[words.length - 1])]
      .join(" ").toLowerCase();
    for (const key of written === singularized ? [written] : [written, singularized]) {
      if (findGlossEntry(key)) {
        return {
          text, key, length,
          indicatorId: key === singularized && key !== written ? PLURAL_INDICATOR_ID : undefined
        };
      }
    }
  }
  return undefined;
}

/**
 * The punctuation spans that follow a term: one per run of punctuation in its `post`, so
 * ", " gives one comma span and "..." gives one ellipsis span rather than three periods.
 * @param {TaggedTermType | undefined} term - The last term the preceding span covered.
 * @returns {SentenceSpanType[]}
 */
function punctuationSpans (term: TaggedTermType | undefined): SentenceSpanType[] {
  return (term?.post?.match(/\S+/g) ?? []).map((mark) => ({
    text: mark, key: mark, isPunctuation: true
  }));
}

/**
 * Split a sentence into the spans a Bliss row draws one symbol for.
 *
 * The order is load-bearing. Verb spans are claimed first, each absorbing a following "to"
 * only when a verb follows it, so "I want to go home" gives "want to" while "I go to school"
 * keeps its directional "to". The n-gram scan then runs over what is left, and never over a
 * single token: "to go" is a real two-word sense, so a scan running first would strand "want"
 * as a lone token and match the noun "want, desire" rather than the action "to want".
 * @param {string} sentence - The English sentence.
 * @returns {SentenceSpanType[]}
 */
export function sentenceSpans (sentence: string): SentenceSpanType[] {
  if (sentence.trim().length === 0) {
    return [];
  }
  const { terms, verbs } = parseSentence(sentence);
  const verbByFirstTerm = new Map<string, VerbSpanType>(
    verbs.map((verb) => [verb.ids[0], verb])
  );
  const verbTermIds = new Set<string>(verbs.flatMap((verb) => verb.ids));

  const spans: SentenceSpanType[] = [];
  let index = 0;
  while (index < terms.length) {
    const verb = verbByFirstTerm.get(terms[index].id);
    if (verb) {
      let end = index + verb.ids.length;
      // A verb takes a following "to" only when another verb follows it.
      if (terms[end]?.text.toLowerCase() === "to" &&
          terms[end + 1] !== undefined && verbByFirstTerm.has(terms[end + 1].id)) {
        end += 1;
      }
      // compromise already prefixes the infinitive with "to" for a "have to" construction,
      // which would otherwise key the span "to to go".
      const infinitive = verb.infinitive.toLowerCase().replace(/^to /, "");
      spans.push({
        text: terms.slice(index, end).map((term) => term.text).join(" "),
        key: `to ${infinitive}`,
        indicatorId: verbIndicator(verb, terms.slice(0, index).some(
          (term) => term.tags.includes("Pronoun")
        ))
      });
      spans.push(...punctuationSpans(terms[end - 1]));
      index = end;
      continue;
    }
    // The unclaimed run this term starts, which is as far as the n-gram scan may reach.
    let limit = index;
    while (limit < terms.length && !verbTermIds.has(terms[limit].id)) {
      limit += 1;
    }
    const gloss = scanForGloss(terms, index, limit);
    if (gloss) {
      spans.push({ text: gloss.text, key: gloss.key, indicatorId: gloss.indicatorId });
      spans.push(...punctuationSpans(terms[index + gloss.length - 1]));
      index += gloss.length;
      continue;
    }
    spans.push({ text: terms[index].text, ...singleTermKey(terms[index]) });
    spans.push(...punctuationSpans(terms[index]));
    index += 1;
  }
  return spans;
}

/**
 * The symbols the user has used before, keyed by lowercased label. A payload from history
 * carries the indicators, modifiers and symbol the user chose for that word themselves, so it
 * beats anything the dictionary offers.
 * @returns {Map<string, SymbolEncodingType>}
 */
function historyPayloads (): Map<string, SymbolEncodingType> {
  const byLabel = new Map<string, SymbolEncodingType>();
  readMessageLog().forEach((record) => record.payloads.forEach((payload) => {
    if (payload.label) {
      byLabel.set(payload.label.toLowerCase(), payload);
    }
  }));
  return byLabel;
}

/**
 * The symbol for one span: the user's own payload for that word if they have chosen one,
 * otherwise a dictionary entry. There is no loose "word appears somewhere in the gloss" rung.
 * A wrong suggestion is ignorable in the word prediction row, but a wrong symbol in a
 * sentence the user is about to speak is not.
 * @param {SentenceSpanType} span - The span.
 * @param {Map<string, SymbolEncodingType>} history - Past payloads by lowercased label.
 * @returns {SymbolEncodingType | undefined}
 */
function spanPayload (
  span: SentenceSpanType, history: Map<string, SymbolEncodingType>
): SymbolEncodingType | undefined {
  if (span.isPunctuation) {
    const symbolId = PUNCTUATION_IDS[span.key];
    // A mark with no Bliss symbol resolves to nothing, and is drawn as text like any other
    // unresolved span.
    return symbolId === undefined ? undefined : glossPayload(symbolId, undefined, span.text);
  }
  // Three ways in, because a span's key is not what the user's own label looks like. A verb
  // span is keyed "to want" and reads "want to", while the label they saved is "want".
  const fromHistory = history.get(span.key) ??
    history.get(span.text.toLowerCase()) ??
    history.get(span.key.replace(/^to /, ""));
  const base = fromHistory
    ? { ...fromHistory }
    : (() => {
      const entry = findGlossEntry(span.key);
      return entry ? glossPayload(entry.id, entry.composition, span.text) : undefined;
    })();
  if (!base) {
    return undefined;
  }
  // The user's own indicator wins: they chose it for this word themselves. Otherwise overlay
  // the span's, which needs a bare id for the library to find a head glyph in.
  // A payload the user built with modifiers is left exactly as they built it: the overlay
  // replaces the composition, which would drop their modifiers from what is drawn while
  // `modifierInfo` still claimed they were there.
  if (span.indicatorId === undefined || base.indicatorId !== undefined ||
      base.userSelectedSymbolId === undefined || (base.modifierInfo?.length ?? 0) > 0) {
    return base;
  }
  return {
    ...base,
    composition: [base.userSelectedSymbolId, ";;", span.indicatorId],
    indicatorId: span.indicatorId
  };
}

/**
 * The Bliss row for one English sentence: one slot per span, each with the symbol found for
 * it or nothing, in which case the span is rendered as text.
 *
 * The pipeline makes no network call and cannot fail as a unit. A span that resolves to
 * nothing is the normal path, not an error. If `compromise` throws on some input, the whole
 * sentence becomes one text slot, so a sentence choice is never lost.
 * @param {string} sentence - The English sentence.
 * @returns {BlissSentenceSlotType[]}
 */
export function blissSlots (sentence: string): BlissSentenceSlotType[] {
  try {
    const history = historyPayloads();
    return sentenceSpans(sentence).map((span) => {
      const payload = spanPayload(span, history);
      return payload ? { text: span.text, payload } : { text: span.text };
    });
  } catch (error) {
    console.error(`Could not build a Bliss sentence: ${String(error)}`);
    return sentence.trim().length > 0 ? [{ text: sentence }] : [];
  }
}
