# Palette Generator

## Overview

The Palette Generator is a web-based tool in `apps/palette-generator/` for creating custom Bliss symbol palette
JSON files. Users specify which symbols to include, configure the layout, preview the result, and export it as a
JSON file ready to place in `public/palettes/`.

## Launch

Run the following command from the project root:

```sh
npm start
```

Then open [`http://localhost:3000/apps/palette-generator/`](http://localhost:3000/apps/palette-generator/) in a browser.

## Settings

The **Settings** fieldset at the top of the page controls palette-level options.

- **Palette name** — any printable characters including spaces; used as the exported filename
  (`<palette-name>.json`).
- **Starting row / Starting column** — the grid position of the first cell (default: row 1, column 1).
- **Type of cell** — the cell component type applied to every cell in the palette; all cells share one type.

## Search for Matches

The **Search for matches** text area defines the palette contents. Each line becomes one row of cells; items
within a row are separated by spaces. Four item types are accepted:

| Type | Format | Description |
| ---- | ------ | ----------- |
| Blank | `BLANK` | An empty cell with no symbol or label |
| BCI AV ID | `25605` | A number matching a specific Bliss symbol; the gloss becomes the label |
| Gloss | `GLOSS:gloss text:GLOSS` | Searches for an exact or partial gloss match; spaces allowed in the gloss text |
| SVG builder string | `SVG:...:SVG` | Composes a symbol from component IDs using the [bliss-svg-builder](https://github.com/hlridge/bliss-svg-builder) (see [SVG Builder String Syntax](#svg-builder-string-syntax) below) |

### Labels

An optional label can be appended to any non-`BLANK` item using `LABEL:label text:LABEL`. The label text
may contain spaces. Without a explicitly given label, the label is defaulted to:

- **BCI AV ID** — the gloss for that symbol
- **Gloss** — the matched gloss text
- **SVG builder string** — no label

Examples:

```text
25605LABEL:ruin:LABEL
GLOSS:indicator (action):GLOSSLABEL:verb:LABEL
SVG:13166;9011:SVGLABEL:children:LABEL
SVG:B220;B99:SVGLABEL:children:LABEL
```

- `25605LABEL:ruin:LABEL` — finds the symbol with BCI AV ID 25605. Label is "ruin". Without the label,
  defaults to the gloss "dilapidated, ruined (building) (1)".
- `GLOSS:indicator (action):GLOSSLABEL:verb:LABEL` — finds the symbol whose gloss is "indicator (action)".
  Label is "verb". Without the label, defaults to the matched gloss text.
- `SVG:13166;9011:SVGLABEL:children:LABEL` — generates an SVG combining "child" (13166) and
  "indicator (plural)" (9011). Label is "children".
- `SVG:B220;B99:SVGLABEL:children:LABEL` — same result using Blissary IDs (`B` prefix) instead of BCI AV IDs.

### SVG Builder String Syntax

SVG builder strings take the form `SVG:<components>:SVG`. Components are BCI AV IDs (plain numbers),
Blissary IDs (numbers prefixed with `B`), or a mix of both in the same string.

Separators control how symbols are composed. Terminology follows
[The Fundamental Rules of Blissymbolics](https://www.blissymbolics.org/images/bliss-fundamental-rules-2020-06-16.pdf#page=4),
Sections 3.3, 3.6, and 3.7.

| Separator | Effect | Example |
| --------- | ------ | ------- |
| `/` | Normal space between Bliss symbols in a Bliss-word (BLISSYMBOL HALF SPACE) | `12378/25582` (animal + mask) |
| `//` | Normal space between Bliss words in a Bliss sentence (BLISSYMBOL FULL SPACE) | `12378//25582` (animal mask) |
| `;` | Superimpose the following symbol onto the previous symbol — used frequently for indicators | `12378;9011/25582` (animals + mask) |
| `;;` | Superimpose onto the classifier symbol in the Bliss word composed by preceding symbols — used frequently for indicators | `12378/25582;;9011` (animals + mask) |
| `RK:-2` | Quarter space between symbols (BLISSYMBOL QUARTER SPACE) | `14164/RK:-2/16164` (feeling + illness) |
| `X<letter>` | `X` followed by a single letter produces the Blissymbol for that letter | `XH/Xo/Xl/Xl/Xi/Xs` |

## Generating, Saving, and Clearing

- **Generate palette** — searches the Bliss gloss for matches and renders a palette preview. Multiple matches
  for a single gloss input are listed in the **Matches** section; only the first match appears in the palette.
  Click again after editing the text area to regenerate.
- **Save palette** — exports the palette as `<palette-name>.json` to the browser's download folder.
- **Clear palette** — removes the preview and resets the Matches and Errors listings.

## Matches and Errors

The **Matches** section lists all gloss matches found for each input item, showing the BCI AV ID, full gloss,
and composition for compound symbols. Use this to verify the correct symbol was selected or to substitute a
BCI AV ID when a gloss search returns multiple results.

The **Errors** section reports items that could not be matched or that contained invalid SVG builder strings.
