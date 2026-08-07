# Client-side Developer Documentation

This document provides technical instructions for developers who use Preact to
build the adaptive palette client side.

## Runtime configuration (`public/config.json`)

`public/config.json` holds the settings that can change without a rebuild. `loadConfig()` in
[`src/client/GlobalData.ts`](../src/client/GlobalData.ts) fetches and validates it at startup and stores the
result in `adaptivePaletteGlobals.config`. Each section is validated on its own: a missing or malformed section
falls back to its default and leaves the other sections intact. If the file itself is missing or unparsable,
every section falls back.

| Section | Controls |
| ------- | -------- |
| `maxStoredRecords` | Top-level, not a section. How many messages the local-storage message log keeps. |
| `indicatorLabelLookup` | The Ollama fallback tier for looking up indicator labels. See [IndicatorLabelLookup.md](IndicatorLabelLookup.md). |
| `telegraphicTranslation` | Translating a telegraphic message into full sentences. See [TelegraphicMessageTranslation.md](TelegraphicMessageTranslation.md). |
| `symbolSearch` | The "Add symbol to message" trigger and its gloss-search dialog. |
| `svgBuilderString` | The "Add symbol by svg-builder string" trigger and its dialog. Off in production: it is for development. |
| `wordPrediction` | Suggesting the next word from the user's past messages. See [WordPrediction.md](WordPrediction.md). |

### `maxStoredRecords`

An integer capping the message log, the single local-storage log holding the messages the
user has said and the translations made from them. When it reaches the limit, its oldest records are
dropped first. `0` keeps the features that log but stores nothing. A missing or malformed value falls
back to 500.

### `indicatorLabelLookup`

| Field | Type | Description |
| ----- | ---- | ----------- |
| `useModelQueryFallback` | boolean | Required. Whether to ask a model when the local label lookup finds nothing. |
| `model` | string | Ollama model name. Defaults to the empty string, which means Ollama's first available model. |
| `systemPrompt` | string | Required, non-empty. Tells the model to answer with the resulting label alone. |
| `userPrompt` | string | Required, non-empty. One field per line, using the placeholders below. |

`userPrompt` placeholders: `{{word}}`, `{{pos}}`, `{{explanation}}`, `{{indicator}}`, `{{purpose}}`. A line
whose placeholder value is empty is dropped, so one template covers a symbol with an explanation, one without,
and a hand-built symbol that has neither a part of speech nor an explanation.

When `useModelQueryFallback` is missing or is not a boolean, or either prompt is missing or blank, the whole
section is discarded and the fallback tier is disabled. The pregenerated lookup keeps working.

### `telegraphicTranslation`

There are no hardcoded prompts, so every field below is required. A partially configured section is treated as
missing and the feature reports itself as unconfigured rather than running with empty prompts.

| Field | Type | Description |
| ----- | ---- | ----------- |
| `model` | string | Ollama model name. The empty string means Ollama's first available model. |
| `numSentences` | number | Positive integer. How many candidate sentences to request. |
| `systemPrompt` | string | Non-empty. Supports the `{{numSentences}}` placeholder. |
| `userPrompt` | string | Non-empty. Supports the `{{telegraphicMessage}}` placeholder. |

Placeholders are `{{name}}` and are substituted at query time; one with no matching value is left as is.

### `wordPrediction`

| Field | Type | Description |
| ----- | ---- | ----------- |
| `show` | boolean | Required. Whether the suggestion row is rendered. |
| `maxSuggestions` | number | Positive integer. How many suggestions to offer at once. Defaults to 10. |

When the section is missing or `show` is not a boolean, the feature is off. A malformed `maxSuggestions`
alone falls back to 10 and leaves the feature on.

### `symbolSearch` and `svgBuilderString`

Both are feature-visibility sections carrying a single `show` boolean. The matching toolbar trigger is rendered
only when `show` is `true`. When the section is missing or `show` is not a boolean, `symbolSearch` defaults to
`true` and `svgBuilderString` to `false`, so an older config.json neither loses symbol search nor turns on the
developer tool.

## How to render a palette

`Palette.ts` constructs a palette based on a JSON file that contains a list
of the cells in the palette. An example is found in
[`public/palettes/bliss_standard_chart.json`](../public/palettes/bliss_standard_chart.json). The
`cells` object is the list of all of the cells. Each cell has a `type` key and
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

All registered cell types live in `cellTypeRegistry` in
[`src/client/CellTypeRegistry.ts`](../src/client/CellTypeRegistry.ts). They fall into
three categories by prefix.

#### `Action*` — user input actions

| Type | Purpose | Key options beyond layout |
| ---- | ------- | ------------------------- |
| `ActionCodeCell` | Appends a Bliss symbol to the encoding area when clicked | `label`, `composition` |
| `ActionBranchToPaletteCell` | Navigates to another palette | `label`, `composition`, `branchTo` (palette file name without `.json`), `ariaControls` |
| `ActionIndicatorCell` | Applies a Bliss indicator to the last symbol in the encoding area | `label`, `composition` |
| `ActionPreModifierCell` | Prepends a modifier to the last symbol | `label`, `composition` |
| `ActionPostModifierCell` | Appends a modifier to the last symbol | `label`, `composition` |
| `ActionRemoveIndicatorCell` | Removes an indicator from the symbol at the caret | `label`, `composition` |
| `ActionRemoveModifierCell` | Removes a modifier from the symbol at the caret | `label`, `composition` |

#### `Command*` — palette navigation and editing

| Type | Purpose | Key options beyond layout |
| ---- | ------- | ------------------------- |
| `CommandClearEncoding` | Clears the entire encoding area | `label`, `composition`, `ariaControls` |
| `CommandCursorBackward` | Moves the caret one position left in the encoding area | `label`, `composition`, `ariaControls` |
| `CommandCursorForward` | Moves the caret one position right in the encoding area | `label`, `composition`, `ariaControls` |
| `CommandDelLastEncoding` | Deletes the last symbol in the encoding area | `label`, `composition`, `ariaControls` |
| `CommandGoBackCell` | Pops the navigation stack and returns to the previous palette | `label`, `composition` |
| `CommandMakeSentence` | Translates the telegraphic message into full sentences; renders nothing when the feature is unavailable | `label`, `composition`, `ariaControls` |

#### `Content*` — display areas

| Type | Purpose | Key options beyond layout |
| ---- | ------- | ------------------------- |
| `ContentEncoding` | Displays the current encoding (the input area showing selected symbols) | layout fields only |

## Keyboard shortcuts

The global "go back" keystroke is registered in [`src/client/index.js`](../src/client/index.js); the input
area's caret keys are handled in [`src/client/ContentEncoding.ts`](../src/client/ContentEncoding.ts). See
[ShortcutKeys.md](ShortcutKeys.md) for the full list.

## How to add a new cell type

When a new `type` value is introduced, developers need to:

1. Create a new component to render the new cell type;
2. In `src/client/CellTypeRegistry.ts`, update `cellTypeRegistry` to add the entry that maps the
new type value to the actual component.

### Import rule

`src/client/GlobalData.ts` must not import a cell component or a feature module. Because those modules already
import `GlobalData.ts`, doing so creates a circular dependency.
