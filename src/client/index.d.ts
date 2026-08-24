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

// Symbol composition can be either a symbol ID defined in bliss_symbol_explanations.json,
// for example 1433, or an array of symbol IDs and/or strings that represent the composition
// of a symbol, for example [1433, "/", 1234].
export type SymbolCompositionType = number | (string|number)[];

export type BlissSymbolEntry = {
  id: number,
  bciAvId?: number,
  gloss: string,
  pos?: string,
  explanation?: string,
  isCharacter: boolean,
  composition?: SymbolCompositionType
};

export type BlissSymbolInfoType = {
  label: string,
  composition: SymbolCompositionType
}
export type LayoutInfoType = {
  columnStart: number,
  columnSpan: number,
  rowStart: number,
  rowSpan: number,
};

export type BranchToInfoType = {
  branchTo: string,
  ariaControls?: string
};

export type BlissSymbolCellType = LayoutInfoType & BranchToInfoType & BlissSymbolInfoType;

export type JsonPaletteType = {
  name: string,
  cells: {
    [key: string]: {
      type: string,
      options: BlissSymbolCellType | ContentEncodingType
    }
  }
};

export type ContentEncodingType = LayoutInfoType;

export type PaletteFileMapType = {
  [paletteName: string]: string
}

// Extra information in a content payload structure when the symbol has
// modifiers
export type ModifierInfoType = {
  modifierId: SymbolCompositionType,
  modifierGloss: string,
  isPrepended: boolean
};

/*
 * Symbol input area has associated content and caret position. Either or both
 * can change.
 */
export type SymbolEncodingType = BlissSymbolInfoType & {
  // Dictionary id of the originally selected symbol. Only set when the symbol is
  // selected from the dictionary and not when it is a composed symbol. It's
  // currently used to look up the new label when an indicator is applied to a symbol.
  userSelectedSymbolId?: number,   
  modifierInfo?: ModifierInfoType[],
  // id of the indicator currently applied
  indicatorId?: number,
  // label before any indicator swap; set when a swap occurs
  baseLabel?: string,
  // number of modifierInfo entries present when baseLabel was captured
  baseModifierCount?: number,
  // True when the label came from the indicator-label model query rather than the
  // pregenerated table. Cleared whenever the label stops being the model's; absent
  // and `false` mean the same thing, so test it for truthiness, not against `false`.
  isAiLabel?: boolean
}

export type IndicatorLabelLookupConfigType = {
  useModelQueryFallback: boolean,
  model: string,
  systemPrompt: string,
  userPrompt: string
};

export type TelegraphicTranslationConfigType = {
  model: string,
  numSentences: number,
  systemPrompt: string,
  userPrompt: string,
  // Whether a row of Bliss symbols is drawn above each sentence choice. Defaults to `true`.
  showBlissSentence: boolean
};

export type WordPredictionConfigType = {
  show: boolean,
  maxSuggestions: number,
  // Whether a model is asked for suggestions on top of the ones found in the message history.
  enableModelQuery: boolean,
  model: string,
  systemPrompt: string,
  userPrompt: string
};

/*
 * Which step of the word-to-symbol ladder found a symbol for a word the model suggested, or
 * "dropped" when no step did. Counted to report how often model words go unused.
 */
export type ResolutionRungType = "history" | "exactGloss" | "wordInGloss" | "dropped";

/*
 * The model's contribution to the suggestion row. `contextKey` is the message the words were
 * asked for: a reply is only shown while it still matches the message on screen.
 */
export type ModelWordsStateType =
  | { status: "idle" }
  | { status: "working", contextKey: string }
  | { status: "ready", contextKey: string, payloads: SymbolEncodingType[] };

/*
 * Whether an optional symbol-entry feature is offered on the palette page.
 */
export type FeatureVisibilityConfigType = {
  show: boolean
};

export type AdaptivePaletteConfigType = {
  // Caps every log kept in local storage. Zero keeps the features but stores nothing.
  maxStoredRecords: number,
  // Whether each symbol and command label is spoken as the user inputs. When off, the Speak
  // button is the only routine speech; failures still announce.
  announceSymbolOnInput: boolean,
  // Whether suggestions that came from a model are marked as such, visibly and to a screen
  // reader. Defaults to `true`.
  markAiSuggestions: boolean,
  indicatorLabelLookup: IndicatorLabelLookupConfigType,
  telegraphicTranslation?: TelegraphicTranslationConfigType,
  symbolSearch: FeatureVisibilityConfigType,
  svgBuilderString: FeatureVisibilityConfigType,
  wordPrediction: WordPredictionConfigType
};

export type ContentSignalDataType = {
  payloads: SymbolEncodingType[],
  caretPosition: number
};

// One slot in a Bliss sentence row: the English span it covers, and the symbol found for it.
// No payload means the span is rendered as text.
export type BlissSentenceSlotType = {
  text: string,
  payload?: SymbolEncodingType
};

/*
 * Match structure when searching the BCI AV for symbols
 */
export type MatchType = {
  id: number,
  bciAvId?: number,
  label: string,
  composition?: SymbolCompositionType
}

/**
 * The sentence-translation area below the input palette. One shape rather than a union,
 * because a sentence recalled from the message log can be on screen while the query for the
 * rest is still running, and a sentence typed in any state has to be recorded against the
 * message and the model.
 * - `idle` renders nothing.
 * - `working` renders the progress line; `sentences` holds the recalled sentence when there
 *   is one, in which case the line says more sentences are coming.
 * - `error` renders the failure line, keeping any sentence already on screen.
 * - `ready` renders the sentences with nothing pending.
 */
export type SentenceCompletionsStateType = {
  status: "idle" | "working" | "ready" | "error",
  sentences: string[],
  // The sentence recalled from the message log, when one was found for this message. Every
  // other sentence in `sentences` came from the model.
  recalledSentence: string | null,
  model: string,
  telegraphicMessage: string
};
