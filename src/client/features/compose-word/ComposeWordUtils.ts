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
 * The pure side of building a word: its composition, breaking a part into characters, the name
 * offered for it, and whether it is already in the vocabulary. See `docs/ComposeWords.md`.
 */
import type { BlissSymbolEntry, SymbolCompositionType, SymbolEncodingType } from "../../index.d";
import type { Language } from "../../i18n/I18n";
import { adaptivePaletteGlobals } from "../../state/GlobalData";
import { COMBINE_MARKER_ID, SEMANTIC_INDICATORS, glossFor, isIndicator } from "../../utils/SvgUtils";
import { isWordPart, normalizeComposition } from "../../utils/SymbolEncodingUtils";

type TokenType = string | number;

// A kerning code moves one character against the next. It carries no meaning.
const KERNING = /^[AR]K:/;

const entryOf = (id: number): BlissSymbolEntry | undefined =>
  adaptivePaletteGlobals.symbols.find((symbol) => symbol.id === id);

const isOverlay = (token: TokenType | undefined): boolean => token === ";" || token === ";;";

const isGrammaticalIndicator = (token: TokenType | undefined): boolean =>
  typeof token === "number" && isIndicator(token) && !SEMANTIC_INDICATORS.includes(token);

/**
 * Whether a part is one of the words the built word is made of: a word with a symbol, not a
 * picture, a space or a comma.
 * @param {SymbolEncodingType} part - The part.
 * @returns {boolean}
 */
export function isSymbolWord (part: SymbolEncodingType): boolean {
  return isWordPart(part) && part.composition !== undefined;
}

/**
 * The first of a gloss's comma-separated meanings: "woman, female" gives "woman".
 * @param {string} gloss - The gloss or label.
 * @returns {string}
 */
export function firstGloss (gloss: string): string {
  return gloss.split(",")[0].trim();
}

/**
 * A composition as characters: each vocabulary word in it is replaced by the characters it is
 * made of. The symbol data holds each word as a flat list of characters, so one pass is enough.
 * @param {SymbolCompositionType} composition - A part's composition.
 * @returns {TokenType[]}
 */
export function expandComposition (composition: SymbolCompositionType): TokenType[] {
  const tokens = typeof composition === "number" ? [composition] : composition;
  return tokens.flatMap((token) => {
    const entry = typeof token === "number" ? entryOf(token) : undefined;
    return entry && !entry.isCharacter && Array.isArray(entry.composition) ? entry.composition : [token];
  });
}

/**
 * Drop the grammatical indicators, such as action, plural and past, with the `;` or `;;` before
 * each. A semantic one, the thing or abstract indicator, stays (§7.0).
 * @param {TokenType[]} tokens - Characters and separators.
 * @returns {TokenType[]}
 */
function withoutGrammaticalIndicators (tokens: TokenType[]): TokenType[] {
  return tokens.filter((token, index) =>
    !(isOverlay(token) && isGrammaticalIndicator(tokens[index + 1])) &&
    !(isGrammaticalIndicator(token) && isOverlay(tokens[index - 1])));
}

/**
 * The composition of the word built from these parts: characters a quarter space apart, a full
 * space where a space part is, and a combine marker at each end when `combine` is on. A space at
 * either end adds nothing, and nor does a part with no symbol, such as a picture.
 * @param {SymbolEncodingType[]} parts - The word's parts, in order.
 * @param {boolean} combine - Whether the combine marker is on.
 * @returns {TokenType[]} - Empty when no part has a symbol.
 */
export function wordComposition (parts: SymbolEncodingType[], combine: boolean): TokenType[] {
  const tokens: TokenType[] = [];
  let spaced = false;
  for (const part of parts) {
    if (part.isSpace) {
      spaced = true;
      continue;
    }
    if (part.composition === undefined) {
      continue;
    }
    if (tokens.length > 0) {
      tokens.push(spaced ? "//" : "/");
    }
    tokens.push(...withoutGrammaticalIndicators(expandComposition(part.composition)));
    spaced = false;
  }
  return combine && tokens.length > 0
    ? [COMBINE_MARKER_ID, "/", ...tokens, "/", COMBINE_MARKER_ID]
    : tokens;
}

/**
 * A part's characters, each a part of its own labelled with its first meaning. A character keeps
 * the indicators written on it. Kerning codes are dropped, since the characters may not stay
 * side by side.
 * @param {SymbolEncodingType} part - The part to break up.
 * @param {Language} language - The language of the labels.
 * @returns {SymbolEncodingType[]} - One part for a single character; the part itself for a picture.
 */
export function splitPart (part: SymbolEncodingType, language: Language): SymbolEncodingType[] {
  if (part.composition === undefined) {
    return [part];
  }
  const groups: TokenType[][] = [[]];
  for (const token of expandComposition(part.composition)) {
    if (token === "/" || token === "//") {
      groups.push([]);
    } else if (!(typeof token === "string" && KERNING.test(token))) {
      groups[groups.length - 1].push(token);
    }
  }
  return groups.filter((group) => group.length > 0).map((group) => {
    const id = group.find((token): token is number => typeof token === "number");
    const entry = id === undefined ? undefined : entryOf(id);
    // A letter, such as "Xa", is labelled with the letter.
    const label = entry ? firstGloss(glossFor(entry, language)) : group.join("").replace(/^X/, "");
    return { label, composition: normalizeComposition(group), modifierInfo: [] };
  });
}

/**
 * The name offered for a new word: its words' labels in order, each cut to its first meaning.
 * Spaces, commas and pictures add nothing.
 * @param {SymbolEncodingType[]} parts - The word's parts.
 * @returns {string}
 */
export function defaultName (parts: SymbolEncodingType[]): string {
  return parts.filter(isSymbolWord).map((part) => firstGloss(part.label)).filter(Boolean).join(" ");
}

/**
 * The vocabulary entry with this composition, or `undefined` for a new word. Kerning codes are
 * ignored.
 * @param {TokenType[]} composition - The built word's composition.
 * @returns {BlissSymbolEntry | undefined}
 */
export function findExistingWord (composition: TokenType[]): BlissSymbolEntry | undefined {
  const key = (tokens: TokenType[]): string =>
    JSON.stringify(tokens.filter((token) => !(typeof token === "string" && KERNING.test(token))));
  const wanted = key(composition);
  return adaptivePaletteGlobals.symbols.find((entry) => {
    const tokens = entry.composition === undefined ? [entry.id]
      : typeof entry.composition === "number" ? [entry.composition] : entry.composition;
    return key(tokens) === wanted;
  });
}
