# Palettes

`Palette.ts` constructs a palette based on a JSON file that contains a list
of the cells in the palette. An example is found in
[`bliss_standard_chart.json`](../../public/palette-sets/standardBlissChart/palettes/bliss_standard_chart.json).
The `cells` object is the list of all of the cells. Each cell has a `type` key and
an `options` key. The `type` value indicates which Preact component should be
used to render this cell. The `options` contains information to be passed to the
component.

## Palette sets

Each folder in `public/palette-sets/` is a palette set: a `palette_set.json` and a `palettes/` folder of palette
files. The app ships one set, `standardBlissChart`.

```text
public/palette-sets/
  standardBlissChart/
    palette_set.json
    palettes/
      bliss_standard_chart.json
      standard_header.json
      ...
```

`palette_set.json` lists every palette in the set and names the one shown at start-up:

```json
{
  "formatVersion": 1,
  "startPalette": "Bliss standard chart",
  "palettes": {
    "Bliss standard chart": "palettes/bliss_standard_chart.json",
    "Standard Header": "palettes/standard_header.json"
  }
}
```

1. Paths are relative to `palette_set.json`.
2. Palettes refer to each other by name only. `branchTo` and `PaletteInclude`'s `palette` hold a key of `palettes`,
   and that key must match the palette's `name`.
3. User settings, such as the number of word suggestions, stay out of palette files.

At start-up, `src/client/index.js` calls `PaletteStore.loadPaletteSet()`. It stores each resolved path in
`PaletteStore.paletteFileMap` and returns the start palette's name. It throws when the file is missing or
`formatVersion` is not `1`. `PaletteStore.getNamedPalette()` with `loadIfMissing` loads a palette that is not cached
yet, then the palettes it includes. Called without it, the lookup is cache-only and an uncached name returns
`undefined`.

To add a palette, put its file in the set's `palettes/` folder and add it to `palette_set.json`.

### Choosing a set

`?set=<folder>` in the page URL picks the set, for example `http://localhost:3000/?set=standardBlissChart`. With no
`set`, the app loads `standardBlissChart`.

`paletteSetPath()` in `src/client/core/PaletteStore.ts` turns the name into `/palette-sets/<set>/palette_set.json`.
It throws when the name holds anything but letters, digits, `_` and `-`. An invalid name, or a set with no folder,
stops start-up with an error in the console.

To add a set, create its folder with a `palette_set.json` and a `palettes/` folder, then open the app with
`?set=<folder>`.

### Naming a set

The set name is its folder name, and it appears in the page URL. Conventions:

1. Letters, digits, `_` and `-` only. `paletteSetPath()` throws on anything else, which also keeps the name from
   reaching outside `public/palette-sets/`.
2. camelCase, as in `standardBlissChart`: no spaces, first word lower case, later words capitalized. This differs
   from the palette files inside the set, which are snake_case (`bliss_standard_chart.json`), and from the palette
   names in `palette_set.json`, which are human-readable with spaces ("Bliss standard chart").
3. Name the set after what it offers the user, not the audience or the deployment, so that the URL reads clearly:
   `?set=standardBlissChart`.

### Shared by every set

1. `public/data/` and `public/config.json`.
2. The stored settings and message log. The browser keeps one store per site, so every set shares one message log,
   and word prediction in one set draws on messages written in another.
3. `src/client/index.scss` styles the palettes named "Standard Header" and "Command Bar". A set that names them
   differently loses those styles.

## Screens

Each palette is a whole screen below the top bar. Navigation replaces the whole palette.

Every shipped screen palette starts with a `PaletteInclude` of **Standard Header** (`standard_header.json`), in row 1
across all its columns, with the cell id `standard-header`. The Standard Header holds, one per row: the Input Area
palette, `ContentSentenceChoices`, `ContentPredictedWords` and the Command Bar palette.

`src/client/index.scss` styles the Standard Header and Command Bar palettes by name, with `[data-palettename="..."]`
selectors, so renaming either palette drops its styles.

Keep `standard-header` the first key in `cells`. Preact then keeps the header's elements when navigating, so focus
and typed text stay.

`src/client/core/PaletteSetConsistency.test.ts` checks that every palette in `palette_set.json` starts with the header,
except the parts of a screen listed in its `SCREEN_PARTS`. A palette that wants another layout leaves the header out,
places these cells itself, and is added to `SCREEN_PARTS`. These rules are not checked in code:

1. At most one `ContentSentenceChoices` and one `ContentPredictedWords` per screen.
2. A screen with `CommandMakeSentence` needs a `ContentSentenceChoices`.
3. Word prediction still asks the model on a screen without `ContentPredictedWords`.

## Including a palette

A `PaletteInclude` cell draws another palette in its span:

```json
"standard-header": {
  "type": "PaletteInclude",
  "options": { "palette": "Standard Header", "rowStart": 1, "rowSpan": 1, "columnStart": 1, "columnSpan": 5 }
}
```

The included palette has its own rows and columns inside the span, so any size fits.

The span stays empty, and an error is logged, when the palette is not loaded or would be drawn inside itself.

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
