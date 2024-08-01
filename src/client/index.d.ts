/*
 * Copyright 2023-2024 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

export type BciAvIdType = number | (string|number)[];

export type BlissSymbolInfoType = {
  label: string,
  bciAvId: BciAvIdType
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
