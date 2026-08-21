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
 * Find the Bliss dictionary entry for an English word or phrase.
 *
 * A gloss is a comma separated list of synonym senses ("water, fluid, liquid"), sometimes
 * qualified by a trailing parenthetical ("side (body)"). Both the word prediction row and the
 * Bliss sentence rows look symbols up this way, which is why this lives in `utils/` rather
 * than inside either feature.
 */
import { adaptivePaletteGlobals } from "../state/GlobalData";
import { findSymbolByGloss } from "./SvgUtils";
import {
  BlissSymbolEntry, ResolutionRungType, SymbolCompositionType, SymbolEncodingType
} from "../index.d";

// A parenthetical at the end of a sense, with or without a leading dash:
// "yes - (exclamatory)", "side (body)".
const TRAILING_PARENTHETICAL = /\s*-?\s*\([^()]*\)\s*$/;

/**
 * Lowercase and trim a single sense, and drop a trailing parenthetical qualifier.
 * @param {string} sense - One comma separated part of a gloss.
 * @returns {string}
 */
export function normalizeSense (sense: string): string {
  return sense.trim().toLowerCase().replace(TRAILING_PARENTHETICAL, "").trim();
}

/**
 * The senses of one entry, lowercased and trimmed but otherwise as written.
 * @param {BlissSymbolEntry} entry - The dictionary entry.
 * @returns {string[]}
 */
function writtenSenses (entry: BlissSymbolEntry): string[] {
  return entry.gloss.toLowerCase().split(",").map((sense) => sense.trim());
}

/**
 * Scan the whole dictionary for an entry one of whose senses is `key`.
 *
 * Ties are settled the way `resolveWordPayload` has always settled them: the earliest sense
 * position wins, so "water" is the fluid rather than a late synonym of "urine". Failing that
 * the lowest id wins, since `symbols` is ordered by id and a strict comparison keeps the
 * first one seen.
 *
 * `preferSingleSense` adds one more rule between those two: an entry whose only sense is the
 * key beats a multi-sense one, so "ice cream" alone beats "ice cream, sherbet, sorbet". It is
 * used only on the pass that matches senses as written. On the normalized pass every
 * candidate is qualified by definition, and there the rule picks the more obscure
 * disambiguation: "four" would land on id 23 "four (index number)", a superscript modifier
 * glyph, rather than id 13 "four (digit), 4".
 * @param {string} key - The word or phrase, lowercased.
 * @param {(entry: BlissSymbolEntry) => string[]} senseFn - How to read an entry's senses.
 * @param {boolean} preferSingleSense - Whether a single-sense entry breaks a positional tie.
 * @returns {BlissSymbolEntry | undefined}
 */
function scanSenses (
  key: string, senseFn: (entry: BlissSymbolEntry) => string[], preferSingleSense: boolean
): BlissSymbolEntry | undefined {
  let best: { entry: BlissSymbolEntry, position: number, senseCount: number } | undefined;
  for (const entry of adaptivePaletteGlobals.symbols) {
    const senses = senseFn(entry);
    const position = senses.indexOf(key);
    if (position === -1) {
      continue;
    }
    if (best === undefined || position < best.position ||
        (preferSingleSense && position === best.position &&
         senses.length === 1 && best.senseCount > 1)) {
      best = { entry, position, senseCount: senses.length };
    }
  }
  return best?.entry;
}

/**
 * The dictionary entry for an English word or phrase, or `undefined`.
 *
 * The gloss as written is tried across the whole dictionary before any normalizing. 1192 of
 * the 6420 entries carry a trailing parenthetical and most of them disambiguate rather than
 * annotate -- "ice cream (cone)", "side (body)", and 52 alphabet entries such as
 * "a (lowercase)". Normalizing in one pass turns those into single-sense entries that outrank
 * the right answer, sending "i" to id 37 instead of id 1840 and "a" to id 29 instead of
 * id 100. Only a key whose every candidate is qualified reaches the second pass, which is
 * exactly what normalization is for.
 * @param {string} key - The word or phrase, lowercased.
 * @returns {BlissSymbolEntry | undefined}
 */
export function findGlossEntry (key: string): BlissSymbolEntry | undefined {
  return scanSenses(key, writtenSenses, true) ??
    scanSenses(key, (entry) => writtenSenses(entry).map(normalizeSense), false);
}

/**
 * Build a payload for a symbol found in the Bliss vocabulary, labelled with the word that was
 * looked up rather than the whole gloss: "drink" is what the user asked for, where the gloss
 * may read "drink,beverage".
 * @param {number} symbolId - The id of the matching entry.
 * @param {SymbolCompositionType | undefined} composition - The entry's composition, if it has one.
 * @param {string} word - The word to label the symbol with.
 * @returns {SymbolEncodingType}
 */
export function glossPayload (
  symbolId: number, composition: SymbolCompositionType | undefined, word: string
): SymbolEncodingType {
  return {
    label: word,
    composition: composition ?? symbolId,
    userSelectedSymbolId: symbolId,
    modifierInfo: []
  };
}

/**
 * Find a symbol to show a model-suggested word with, and report which step found it.
 *
 * The steps, first hit winning:
 * 1. the user's own history, whose payload carries the indicators, modifiers and symbol they
 *    chose for that word themselves;
 * 2. a Bliss entry one of whose senses is the word, via `findGlossEntry`;
 * 3. a Bliss entry with the word inside a longer gloss, the shortest gloss first. A common
 *    word such as "to" appears in hundreds of glosses, so the shortest one keeps this from
 *    picking an arbitrary symbol, and the lowest id settles a tie.
 *
 * A word none of them matches is dropped: a suggestion with no symbol cannot be shown.
 *
 * The Bliss sentence rows use `findGlossEntry` directly rather than this function, and stop
 * before step 3: a loose match is ignorable in a suggestion row but not in a sentence the
 * user is about to speak.
 * @param {string} word - The word, lowercased.
 * @param {Map<string, SymbolEncodingType>} payloadByLabel - Past payloads by lowercased label.
 * @returns {{ payload?: SymbolEncodingType, rung: ResolutionRungType }}
 */
export function resolveWordPayload (
  word: string, payloadByLabel: Map<string, SymbolEncodingType>
): { payload?: SymbolEncodingType, rung: ResolutionRungType } {
  const fromHistory = payloadByLabel.get(word);
  if (fromHistory) {
    return { payload: { ...fromHistory }, rung: "history" };
  }
  const senseMatch = findGlossEntry(word);
  if (senseMatch) {
    return {
      payload: glossPayload(senseMatch.id, senseMatch.composition, word), rung: "exactGloss"
    };
  }
  const matches = findSymbolByGloss(word);
  if (matches.length > 0) {
    const best = matches.reduce((shortest, match) =>
      match.label.length < shortest.label.length ||
      (match.label.length === shortest.label.length && match.id < shortest.id)
        ? match
        : shortest
    );
    return { payload: glossPayload(best.id, best.composition, word), rung: "wordInGloss" };
  }
  return { rung: "dropped" };
}
