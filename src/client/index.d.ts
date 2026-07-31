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

// Items pushed to the navigation stack.  The first field is the palette to go
// back to, the second field is where to render it in the document.
export type NavStackItemType = {
  palette: JsonPaletteType,
  htmlElement: HTMLElement
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
  baseModifierCount?: number
}

export type IndicatorLabelLookupConfigType = {
  useModelQueryFallback: boolean,
  model: string
};

export type TelegraphicTranslationConfigType = {
  model: string,
  numSentences: number,
  maxStoredRecords: number,
  systemPrompt: string,
  userPrompt: string
};

/*
 * Whether an optional symbol-entry feature is offered on the palette page.
 */
export type FeatureVisibilityConfigType = {
  show: boolean
};

export type AdaptivePaletteConfigType = {
  indicatorLabelLookup: IndicatorLabelLookupConfigType,
  telegraphicTranslation?: TelegraphicTranslationConfigType,
  symbolSearch: FeatureVisibilityConfigType,
  svgBuilderString: FeatureVisibilityConfigType
};

export type ContentSignalDataType = {
  payloads: SymbolEncodingType[],
  caretPosition: number
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

/*
 * State of the sentence-translation area below the input palette.
 */
export type SentenceCompletionsStateType =
  | { status: "idle" }
  | { status: "working", telegraphicMessage: string }
  | { status: "error" }
  | {
      status: "ready",
      sentences: string[],
      model: string,
      telegraphicMessage: string
    };
