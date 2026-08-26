# Palettes

`Palette.ts` constructs a palette based on a JSON file that contains a list
of the cells in the palette. An example is found in
[`public/palettes/bliss_standard_chart.json`](../../public/palettes/bliss_standard_chart.json). The
`cells` object is the list of all of the cells. Each cell has a `type` key and
an `options` key. The `type` value indicates which Preact component should be
used to render this cell. The `options` contains information to be passed to the
component.

## Palette file map

`public/palettes/palette_file_map.json` maps human-readable palette names to their JSON file paths:

```json
{
  "Bliss standard chart": "/palettes/bliss_standard_chart.json",
  "food": "/palettes/food.json"
}
```

At startup, `src/client/index.js` loads this file and stores it in `PaletteStore.paletteFileMap`. When
`PaletteStore.getNamedPalette()` is called with `loadIfMissing` and the palette is not yet in the cache, it looks
up the file path in `paletteFileMap` and lazily loads the palette on demand. Called without it, the lookup is
cache-only and an uncached name returns `undefined`.

To register a new palette JSON file, add an entry here. The key becomes the name used in `branchTo` options of
`ActionBranchToPaletteCell` cells.

## Palette JSON structure

Each palette JSON file has the following shape:

```json
{
  "name": "palette_name",
  "cells": {
    "<cell-id>": {
      "type": "<CellTypeName>",
      "options": {
        "label": "displayed text",
        "composition": 1234,
        "rowStart": 1,
        "rowSpan": 1,
        "columnStart": 1,
        "columnSpan": 1
      }
    }
  }
}
```

**Cell keys** follow the pattern `<slug>-<uuid>` (e.g.,
`"against-db15d1e0-f5d4-42a2-a318-02ccb85fb55c"`). The slug is a human-readable
hint; the UUID makes the key unique.

**Layout options** are shared by every cell type:

| Field | Type | Description |
| ----- | ---- | ----------- |
| `rowStart` | number | CSS grid row start (1-based) |
| `rowSpan` | number | Number of grid rows the cell occupies |
| `columnStart` | number | CSS grid column start (1-based) |
| `columnSpan` | number | Number of grid columns the cell occupies |
| `requiresModel` | boolean | Optional. When true the cell is left out unless a model is available |
| `requiresConfig` | string | Optional. The `config.json` section the cell needs; the cell is left out when that section is missing |

Both flags mark a cell whose feature can be unavailable: the command bar's "Msg Style" button
carries `requiresModel`, and the input area's "Make Sentences" button carries both. `Palette.ts`
leaves such a cell out and collapses the grid column it would have taken, so the rest of the row
spreads over the space instead of showing a hole.

**`composition`** identifies the Bliss symbol(s) to render. It is either a
single numeric ID -- the `id` field from `bliss_symbol_explanations.json`, not its `bciAvId` --
(e.g., `398`) or an array of IDs and separator strings
(e.g., `[1433, "/", 1234]`) used to compose a combined symbol.
