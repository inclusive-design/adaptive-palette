/*
 * Copyright 2023 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/inclusive-design/adaptive-palette/blob/main/LICENSE
 */

export type BciAvIdType = number | (string|number)[];

export type OptionsType = {
    label: string,
    columnStart: number,
    columnSpan: number,
    rowStart: number,
    rowSpan: number,
    bciAvId: BciAvIdType,
    branchTo?: string
};

export type JsonPaletteType = {
  name: string,
  cells: {
    [key: string]: {
      type: string,
      options: OptionsType
    }
  }
};

// Types associated with the `props` parameter of the component functions.

export type PalettePropsType = {
  json: JsonPaletteType
};

export type ActionBmwCodeCellPropsType = {
  id: string,
  options: OptionsType
};
