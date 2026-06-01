# Palette Generator

## Overview

The Palette Generator is a web-based tool in `apps/palette-generator/` for creating custom Bliss symbol palette
JSON files.  Users specify which symbols to include, configure the layout, preview the result, and export it as a
JSON file ready to place in `public/palettes/`.

## Launch

Run the following command from the project root:

```sh
npm run serveAppsDemos
```

Then open [`http://localhost:5173/apps/palette-generator/`](http://localhost:5173/apps/palette-generator/) in a browser.

## Settings

The **Settings** fieldset at the top of the page controls palette-level options.

- **Palette name** — any printable characters including spaces; used as the exported filename
  (`<palette-name>.json`).
- **Starting row / Starting column** — the grid position of the first cell (default: row 1, column 1).
- **Type of cell** — the cell component type applied to every cell in the palette; all cells share one type.

## Search for Matches

The **Search for matches** text area defines the palette contents.  Each line becomes one row of cells; items
within a row are separated by spaces.  Four item types are accepted:

| Type | Format | Description |
| ---- | ------ | ----------- |
| Blank | `BLANK` | An empty cell |
| BCI AV ID | `25605` | A number matching a specific Bliss symbol; the gloss becomes the label |
| Gloss | `GLOSS:gloss text:GLOSS` | Searches for an exact or partial gloss match; spaces allowed |
| SVG builder string | `SVG:...:SVG` | Composes a symbol from component IDs (see below) |

### Labels

An optional label can be appended to any non-`BLANK` item using `LABEL:label text:LABEL`.  Examples:

```text
25605LABEL:ruin:LABEL
GLOSS:indicator (action):GLOSSLABEL:verb:LABEL
SVG:13166;9011:SVGLABEL:children:LABEL
SVG:B220;B99:SVGLABEL:children:LABEL
```

### SVG Builder String Syntax

SVG builder strings take the form `SVG:<components>:SVG`.  Components are BCI AV IDs (plain numbers) or
Blissary IDs (numbers prefixed with `B`).

For full details on separators, relative kerning, letter syntax, and visual examples, expand the
**"How to specify matches"** section within the running app.

## Generating, Saving, and Clearing

- **Generate palette** — searches the Bliss gloss for matches and renders a palette preview.  Multiple matches
  for a single gloss input are listed in the **Matches** section; only the first match appears in the palette.
  Click again after editing the text area to regenerate.
- **Save palette** — exports the palette as `<palette-name>.json` to the browser's download folder.
- **Clear palette** — removes the preview and resets the Matches and Errors listings.

## Matches and Errors

The **Matches** section lists all gloss matches found for each input item, showing the BCI AV ID, full gloss,
and composition for compound symbols.  Use this to verify the correct symbol was selected or to substitute a
BCI AV ID when a gloss search returns multiple results.

The **Errors** section reports items that could not be matched or that contained invalid SVG builder strings.
