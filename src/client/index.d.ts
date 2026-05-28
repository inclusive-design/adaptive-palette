/*
 * Copyright 2023-2026 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
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
  bciAvId: number,
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
      options: BlissSymbolCellType | ContentBmwEncodingType
    }
  }
};

export type ContentBmwEncodingType = LayoutInfoType;

export type EncodingType = BlissSymbolInfoType & {
  id: string,
};

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
export type SymbolEncodingType = EncodingType & {
  modifierInfo?: ModifierInfoType[]
}
export type ContentSignalDataType = {
  payloads: SymbolEncodingType[],
  caretPosition: number
};

/*
 * Match structure when searching the BCI AV for symbols
 */
export type MatchType = {
  id: number,
  bciAvId: number,
  label: string,
  composition?: SymbolCompositionType
}
