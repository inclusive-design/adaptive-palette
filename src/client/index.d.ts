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
  // present only on the 41 indicator symbols
  isIndicator?: boolean,
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
  // When true the palette leaves the cell out unless a model is available, and closes the row
  // up over the column it would have taken.
  requiresModel?: boolean,
  // The `config.json` section the cell's feature needs. The palette leaves the cell out, and
  // closes the row up, when that section is missing.
  requiresConfig?: keyof AdaptivePaletteConfigType
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
      options: BlissSymbolCellType | ContentEncodingType | ContentLabelType | AttributeCellType |
        PaletteIncludeType | ContentPredictedWordsType
    }
  }
};

export type ContentEncodingType = LayoutInfoType;

export type ContentSentenceChoicesType = LayoutInfoType;

export type ContentPredictedWordsType = LayoutInfoType & {
  // How many columns the suggestion slots are set out in. Defaults to `maxSuggestions`: one row.
  numColumns?: number
};

export type PaletteIncludeType = LayoutInfoType & {
  // The name of the palette drawn in this cell's span.
  palette: string
};

export type PaletteFileMapType = {
  [paletteName: string]: string
}

export type PaletteSetType = {
  formatVersion: number,
  // The name of the palette shown at start-up.
  startPalette: string,
  // Palette names mapped to their files, relative to the palette set file.
  palettes: PaletteFileMapType
};

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

export type AboutMeConfigType = {
  model: string,
  systemPrompt: string,
  userPrompt: string,
  // How many messages each "Suggest updates" run reads, oldest first, after the last one read.
  messagesPerRun: number
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
  // How many of the newest stored messages are read back for word prediction and for
  // recalling a sentence. Nothing is ever deleted; this caps what is read, not what is kept.
  // Zero turns the history off: nothing is read and nothing is written.
  maxRecalledRecords: number,
  // Whether each symbol and command label is spoken as the user inputs. When off, the Speak
  // button is the only routine speech; failures still announce.
  announceSymbolOnInput: boolean,
  // Whether suggestions that came from a model are marked as such, visibly and to a screen
  // reader. Defaults to `true`.
  markAiSuggestions: boolean,
  indicatorLabelLookup: IndicatorLabelLookupConfigType,
  telegraphicTranslation?: TelegraphicTranslationConfigType,
  aboutMe?: AboutMeConfigType,
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

/*
 * One attribute the user has set on the message being composed. `category` is the palette row
 * it came from ("Intent", "Tone", "Feeling", "Priority"); `label` is the attribute itself.
 * `composition` travels with it so the chip row can draw the symbol without going back to the
 * palette JSON.
 */
export type MessageAttributeType = {
  category: string,
  label: string,
  composition: SymbolCompositionType
};

// The options an `ActionAttributeCell` carries in the palette JSON.
export type AttributeCellType = BlissSymbolInfoType & LayoutInfoType & {
  category: string
};

// The options a `ContentLabel` carries in the palette JSON.
export type ContentLabelType = LayoutInfoType & {
  label: string
};

/*
 * What an About Me fact is about. The dialog and the prompt list categories in the order of
 * `FACT_CATEGORIES` in `features/about-me/AboutMeState.ts`.
 */
export type FactCategoryType = "Family" | "Background" | "Preferences" | "Communication style" | "Other";

/*
 * One thing known about the user: typed in by the user ("manual"), or suggested by a model
 * reading their messages and then accepted ("suggested").
 */
export type AboutMeFactType = {
  id: string,
  category: FactCategoryType,
  text: string,
  source: "manual" | "suggested",
  // ISO timestamp
  addedAt: string
};

/*
 * A suggestion the user turned down, or a learnt fact they deleted. Kept so the model does
 * not suggest it again, and shown in the About Me dialog, where it can be added back.
 */
export type DismissedFactType = {
  category: FactCategoryType,
  text: string
};

// The last message "Suggest updates" sent to the model: its storage id, which the next run
// reads after, and its timestamp, which the dialog shows.
export type LearntUpToType = {
  id: number,
  timestamp: string
};

export type AboutMeType = {
  facts: AboutMeFactType[],
  dismissed: DismissedFactType[],
  // Suggestions the user has not accepted or rejected yet.
  pending: DismissedFactType[],
  // Absent until the first successful "Suggest updates".
  learntUpTo?: LearntUpToType
};
