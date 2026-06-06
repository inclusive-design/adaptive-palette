# Client-side Developer Documentation

This document provides technical instructions for developers who use Preact to
build the adaptive palette client side.

## How to render a palette

`Palette.ts` constructs a palette based on a JSON file that contains a list
of the cells in the palette. An example is found in
[`public/palettes/bliss_standard_chart.json`](../public/palettes/bliss_standard_chart.json).
The `cells` object is the list of all of the cells. Each cell has a `type` key and
an `options` key. The `type` value indicates which Preact component should be
used to render this cell. The `options` contains information to be passed to the
component.

### Palette file map

`public/palettes/palette_file_map.json` maps human-readable palette names to their JSON file paths:

```json
{
  "Bliss standard chart": "/palettes/bliss_standard_chart.json",
  "food": "/palettes/food.json"
}
```

At startup, `src/client/index.js` loads this file and stores it in `PaletteStore.paletteFileMap`. When
`PaletteStore.getNamedPalette()` is called with a name that is not yet in the cache, it looks up the file path in
`paletteFileMap` and lazily loads the palette on demand.

To register a new palette JSON file, add an entry here. The key becomes the name used in `branchTo` options of
`ActionBranchToPaletteCell` cells.

### Palette JSON structure

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

**`composition`** identifies the Bliss symbol(s) to render. It is either a
single BCI-AV numeric ID (e.g., `398`) or an array of IDs and separator strings
(e.g., `[1433, "/", 1234]`) used to compose a combined symbol.

### Cell types

All registered cell types live in `GlobalData.cellTypeRegistry`. They fall into
three categories by prefix.

#### `Action*` — user input actions

| Type | Purpose | Key options beyond layout |
| ---- | ------- | ------------------------- |
| `ActionBmwCodeCell` | Appends a Bliss symbol to the encoding area when clicked | `label`, `composition` |
| `ActionBranchToPaletteCell` | Navigates to another palette | `label`, `composition`, `branchTo` (palette file name without `.json`), `ariaControls` |
| `ActionGlossSearchCell` | Searches for a Bliss symbol by gloss; `label` format is `"searchTerm: gloss"` | `label`, `composition`, `id`, `bciAvId` |
| `ActionIndicatorCell` | Applies a Bliss indicator to the last symbol in the encoding area | `label`, `composition` |
| `ActionPreModifierCell` | Prepends a modifier to the last symbol | `label`, `composition` |
| `ActionPostModifierCell` | Appends a modifier to the last symbol | `label`, `composition` |
| `ActionRemoveIndicatorCell` | Removes an indicator from the symbol at the caret | `label`, `composition` |
| `ActionRemoveModifierCell` | Removes a modifier from the symbol at the caret | `label`, `composition` |
| `ActionTextCell` | Text-only button (no Bliss symbol rendered) | `label` |

#### `Command*` — palette navigation and editing

| Type | Purpose | Key options beyond layout |
| ---- | ------- | ------------------------- |
| `CommandClearEncoding` | Clears the entire encoding area | `label`, `composition`, `ariaControls` |
| `CommandCursorBackward` | Moves the caret one position left in the encoding area | `label`, `composition`, `ariaControls` |
| `CommandCursorForward` | Moves the caret one position right in the encoding area | `label`, `composition`, `ariaControls` |
| `CommandDelLastEncoding` | Deletes the last symbol in the encoding area | `label`, `composition`, `ariaControls` |
| `CommandGoBackCell` | Pops the navigation stack and returns to the previous palette | `label`, `composition` |

#### `Content*` — display areas

| Type | Purpose | Key options beyond layout |
| ---- | ------- | ------------------------- |
| `ContentBmwEncoding` | Displays the current encoding (the input area showing selected symbols) | layout fields only |

## How to add a new cell type

When a new `type` value is introduced, developers need to:

1. Create a new component to render the new cell type;
2. In `GlobalData.ts`, update `cellTypeRegistry` to add the entry that maps the
new type value to the actual component.
