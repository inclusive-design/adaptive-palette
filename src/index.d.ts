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

export type BlissSymbolCellType = {
    label: string,
    columnStart: number,
    columnSpan: number,
    rowStart: number,
    rowSpan: number,
    bciAvId: BciAvIdType,
    branchTo?: string,
    ariaControls?: string
};

export type ContentBmwEncodingType = {
    columnStart: number,
    columnSpan: number,
    rowStart: number,
    rowSpan: number,
};

export type JsonPaletteType = {
  name: string,
  cells: {
    [key: string]: {
      type: string,
      options: BlissSymbolCellType | ContentBmwEncodingType
    }
  }
};

export type EncodingType = {
  id: string,
  label: string,
  bciAvId: BciAvIdType
};

export type PaletteFileMapType = {
  paletteName: string,
  filePath: string
}
