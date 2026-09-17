# Mapping Grid 3 Grid Sets

Grid 3 is AAC software from Smartbox. A user's vocabulary in Grid 3 is a
**grid set**. This page explains how an exported grid set is structured, how its parts map to Adaptive
Palette, and what Adaptive Palette cannot yet represent.

Smartbox does not publish the file format. Everything here comes from one user's export: a Swedish Bliss grid
set with 56 grids. It is kept outside the repository because it holds personal data. Where the meaning of a value
could not be confirmed, this page says so.

## Files

A `.gridset` file is a zip archive. Unzipped, it contains:

```text
FileMap.xml                     — every grid.xml and the picture files that belong to it
Settings0/
  settings.xml                  — start grid, language, description
  Styles/styles.xml             — named cell styles
  AutoReplacements/autoreplacements.xml — spelling corrections applied while typing
  thumbnail.bmp
Grids/
  <grid name>/
    grid.xml                    — the grid's layout and cells
    0-1-0-text-0.jpg, ...       — pictures used by the grid's cells
```

A grid's name is its folder name, such as `Start` or `göra`. Names can contain spaces and non-ASCII letters.

`settings.xml` names the first grid shown (`<StartGrid>`) and the language (`<Language>sv-SE</Language>`).

## Grid

A `grid.xml` has this shape (simplified):

```xml
<Grid>
  <GridGuid>9d1c3f54-...</GridGuid>
  <ColumnDefinitions>
    <ColumnDefinition />
    ...
  </ColumnDefinitions>
  <RowDefinitions>
    <RowDefinition />
    <RowDefinition>
      <AudioDescription>frukost</AudioDescription>
    </RowDefinition>
    ...
  </RowDefinitions>
  <AutoContentCommands />
  <Cells>
    <Cell X="2" Y="1" ColumnSpan="2" RowSpan="2" ScanBlock="4"> ... </Cell>
  </Cells>
  <ScanBlockAudioDescriptions> ... </ScanBlockAudioDescriptions>
  <WordList><Items /></WordList>
</Grid>
```

- **Size.** The number of `ColumnDefinition` and `RowDefinition` elements sets the grid size. All columns have
  equal width, and so do all rows. Most grids in the example are 10 × 10; the smallest is 3 × 3.
- **Position.** `X` and `Y` are 0-based. A missing `X` or `Y` means 0; a missing `ColumnSpan` or `RowSpan`
  means 1. Adaptive Palette is 1-based, so `columnStart` is `X + 1`.
- **Empty cells.** A cell with no commands and no caption is an empty slot. The example has 734 of them. Empty
  slots keep the grid its full size.
- **Switch scanning.** `ScanBlock` groups cells for switch scanning. An `AudioDescription` on a row, column or
  scan block is spoken when scanning reaches it.
- **Unused here.** `AutoContentCommands` and `WordList` are empty in every grid of the example.

## Cell

```xml
<Cell X="2" Y="1" ColumnSpan="2" RowSpan="2" ScanBlock="2">
  <Visibility>PointerAndTouchOnly</Visibility>   <!-- optional -->
  <Content>
    <ContentType>Workspace</ContentType>         <!-- optional -->
    <ContentSubType>Chat</ContentSubType>        <!-- optional -->
    <Commands>
      <Command ID="Action.InsertText"> ... </Command>
    </Commands>
    <CaptionAndImage>
      <Caption>arbeta</Caption>
      <Image>[blissx]18274.wmf</Image>
    </CaptionAndImage>
    <Style>
      <BasedOnStyle>Actions category style</BasedOnStyle>
    </Style>
  </Content>
</Cell>
```

- **Commands.** A cell runs its commands in order when selected. A cell can have several, for example insert
  text and then speak. See [Commands](#commands).
- **Caption and picture.** The label and the picture shown in the cell.
- **Content type.** Most cells have none. `Workspace` is the message area; `LiveCell` shows changing content
  (in the example, only the spelling correction tool).

### Styles

A cell's `<Style>` names a style in `Settings0/Styles/styles.xml` with `<BasedOnStyle>`. Any other elements in
the cell's `<Style>` override that style's values.

```xml
<Style Key="Vocab cell">
  <Name>Vocab cell</Name>
  <BackColour>#FEFEF4FF</BackColour>
  <BorderColour>#000000FF</BorderColour>
  <FontColour>#000000FF</FontColour>
  <FontName>Tahoma</FontName>
  <FontSize>18.666666666666668</FontSize>
  <BackgroundShape>2</BackgroundShape>
</Style>
```

- Colours are `#RRGGBBAA`.
- `FontSize` appears to be pixels: 18.67 px is 14 pt.
- `BackgroundShape`, as seen in the screenshots: `1` is a rounded rectangle; `2` is a rectangle with a folded
  top-right corner. `0` does not appear in the screenshots.
- A cell can name a style that is not in `styles.xml`, such as `Tom ruta (ingen stil)`. These are presumably
  Grid 3's built-in styles.

### Pictures

`<Image>` takes one of two forms.

1. **A library reference**, `[library]path`. The picture comes from a symbol library installed with Grid 3 and
   is **not** in the export.

   | Prefix | Library | Cells in example |
   | ------ | ------- | ---------------- |
   | `[GRID2X]`, `[GRID3X]`, `[grid3x]` | Grid 3's own command icons | 264 |
   | `[widgit]`, `[WIDGIT]` | Widgit symbols (licensed) | 41 |
   | `[blissx]` | Bliss. The number is the BCI-AV ID, which matches `bciAvId` in `bliss_symbol_explanations.json` | 5 |
   | `[sstix#]` | SymbolStix (licensed) | 1 |

2. **A file name suffix.** The picture is a file in the grid's folder, named `{X}-{Y}{Image}`. A cell at
   `X="0" Y="1"` with `<Image>-0-text-0.jpg</Image>` shows `0-1-0-text-0.jpg`.

Embedded pictures are raster files (jpg, png, bmp), mostly 100 × 100 px. They carry no symbol ID. Most are one
Bliss symbol with the cell's background colour baked in. Some show a whole Bliss sentence with its words, and
some are photos.

## Commands

### Inserting text

`Action.InsertText` adds text to the message. Its `text` parameter is rich text:

```xml
<Command ID="Action.InsertText">
  <Parameter Key="indicatorenabled">1</Parameter>
  <Parameter Key="text">
    <p>
      <s Image="0.jpg">
        <r>rita,</r>
        <r><![CDATA[ ]]></r>
        <r>måla</r>
      </s>
      <s>
        <r><![CDATA[ ]]></r>
      </s>
    </p>
  </Parameter>
  <Parameter Key="showincelllabel">Yes</Parameter>
</Command>
```

- `p` is a paragraph, `s` a segment, `r` a run of text.
- A segment's `Image` is the picture shown above its text in the message. A file name here resolves to
  `{X}-{Y}-0-text-{Image}`, the same file the cell shows.
- A trailing segment holding a space separates this insert from the next word.
- A phrase is one segment with several runs and one picture. 64 of the 600 inserts in the example are phrases,
  such as a sentence introducing the user.
- The inserted text usually matches the caption; in 15 cells it does not.
- `indicatorenabled` is always `1` in the example. `showincelllabel` is `Yes` on 428 cells and `No` on 10. The
  meaning of neither is confirmed.

### Every command in the example

| Command | Parameters | Cells | What it does | Adaptive Palette equivalent |
| ------- | ---------- | ----- | ------------ | --------------------------- |
| `Action.InsertText` | `text`, `indicatorenabled`, `showincelllabel` | 600 | Adds text and pictures to the message | `ActionCodeCell`, for a single Bliss symbol only |
| `Action.Speak` | `unit` (`All`), `movecaret` | 78 | Speaks the message | `ActionSpeakCell` |
| `Jump.To` | `grid` (a grid name) | 55 | Goes to another grid | `ActionBranchToPaletteCell` |
| `Jump.Back` | — | 52 | Returns to the previous grid | `CommandGoBackCell` |
| `Action.Clear` | — | 47 | Clears the message | `CommandClearEncoding` |
| `Action.DeleteWord` | — | 45 | Deletes the last word | `CommandDelLastEncoding`, which deletes one symbol |
| `Jump.Home` | — | 44 | Returns to the start grid | `CommandGoToRootCell` |
| `ComputerControl.Keyboard` | `keystring`, such as `{LEFTALT}h` | 24 | Sends keystrokes to another program | None |
| `Speech.ReadCell` | `wait`, `useauditoryvoice` | 7 | Speaks the cell's caption | None |
| `ComputerControl.Alt` | — | 4 | Holds the Alt key for the next keystroke | None |
| `Action.Copy`, `Action.Paste` | — | 5 | Clipboard | None |
| `Settings.RestAll` | `action` (`Toggle`) | 2 | Pauses and resumes access | None |
| `Settings.GridExplorer` | — | 2 | Opens Grid 3's grid set browser | None |
| `ComputerControl.Run` | `FileName`, `Arguments` | 2 | Starts a program, such as a browser with a meeting link | None |
| `ComputerControl.PreviousWindow` | `MinimiseOthers` | 2 | Switches to the previous window | None |
| `ComputerControl.MouseClickOnDwell` | `action`, `button` | 2 | Turns dwell clicking on or off | None |
| `ComputerControl.Dock` | — | 2 | Docks the Grid 3 window | None |
| `Settings.ChangeGridSet` | `gridsetname` | 1 | Opens another grid set | None |
| `Prediction.CorrectionTool` | — | 1 | Suggests spelling corrections | None |

Commands combine on one cell. The combinations in the example are:

- `InsertText` + `Speak`: 26 cells
- `InsertText` + `Jump.To`: 12 cells
- `Jump.To` + `Speech.ReadCell`: 6 cells
- `ComputerControl.Alt` + `ComputerControl.Keyboard`: 4 cells
- `InsertText` + `Speak` + `Clear`: 2 cells
- `Jump.To` + `Speak`: 1 cell
- `InsertText` + `Settings.ChangeGridSet` + `Speech.ReadCell`: 1 cell

## Navigation

- The app opens on the grid named by `<StartGrid>`.
- `Jump.To` names its target by grid name. `Jump.Back` and `Jump.Home` act like a navigation stack, as in
  Adaptive Palette.
- A grid's name is the equivalent of a palette's name in `palette_set.json`.
- Grids can be unreachable. In the example, 52 of the 56 grids are reachable from the start grid; the other 4
  are copies.
- Unzipping on macOS can store accented folder names in a different Unicode form from the names in
  `grid.xml`. Normalize both, for example with `String.prototype.normalize("NFC")`, before matching them.

## Each grid is a whole screen

Grid 3 has no fixed page around a grid. Each grid lays out the whole screen, including the message area and the
command buttons.

- **Message area.** 46 of the 56 grids have a `Workspace` cell (`ContentSubType` `Chat`) in the top row,
  spanning the full width in all but one. It shows the inserted words with their pictures above them.
- **Command row.** 41 grids repeat Home, Back, Speak, Delete word and Clear buttons in their bottom row; a few
  more have some of them.
- **Other grids.** The 10 grids without a message area include the video call controls and small blank grids.

Adaptive Palette works the same way: each palette is a whole screen below the top bar. The shipped palettes include
the Standard Header palette for the message area, sentence choices, word predictions and command bar. An imported
grid can place those cells itself. See [Palettes](Palettes.md#screens).

## Example grid set in numbers

| Item | Count |
| ---- | ----- |
| Grids | 56 |
| Cells | 1,703 |
| Empty cells | 734 |
| Cells that insert text | 600 |
| Cells with an embedded picture | 552 |
| Picture files | 554 |
| Cells with an override on their style | 496 |
| Named styles | 21 |
| Auto-replacements | 8 |

## Gaps

What Adaptive Palette cannot yet represent, with the size of each gap in the example grid set and ways to close
it.

1. **Symbols without an ID.** 513 of the 600 text cells show an embedded picture with no symbol ID. Adaptive
   Palette draws every symbol from its BCI-AV ID. Options:
   - Match pictures to BCI-AV symbols, by caption or by comparing images. Our symbol data has English glosses
     only, so matching Swedish captions needs a Swedish gloss list.
   - Show the picture as it is (see gap 2). The symbol then cannot take indicators or modifiers, and word
     prediction and sentence making cannot read it.
2. **No picture cells.** No cell type draws a picture file, so photos and multi-symbol pictures have nowhere to
   go.
3. **Library pictures are missing.** 264 Grid 3 command icons, 41 Widgit and 1 SymbolStix pictures are not in the
   export. Command icons can be replaced with our own Bliss compositions. Widgit and SymbolStix are licensed and
   need a replacement or a caption-only cell. The 5 `[blissx]` references map straight to BCI-AV IDs.
4. **Language.** Captions, speech and inserted text are Swedish. Adaptive Palette assumes English:
   - labels and glosses are English
   - speech sets no language, so the browser's default voice is used
   - sentence making, Bliss sentences (`compromise`), word prediction and the indicator label lookup all work in
     English
5. **Text messages and phrases.** A Grid 3 message is text with pictures, and a phrase goes in as one unit.
   Adaptive Palette's message is a list of Bliss symbols. The 64 phrases have no equivalent, and deleting a word
   is not the same as deleting a symbol.
6. **One action per cell.** 52 cells combine commands, such as inserting a word and then going to another grid.
   Each Adaptive Palette cell type does one thing.
7. **Commands with no equivalent.** Computer control (32 cells) works outside the browser and is likely out of
   scope. Also missing: clipboard (5), reading a cell aloud (7), rest (2), grid explorer (2), opening another grid
   set (1) and spelling correction (1).
8. **Per-cell styles.** Grid 3 sets background, border and text colour, font, font size and shape per cell.
   Adaptive Palette styles cells by type in SCSS.
9. **Switch scanning.** 1,541 cells belong to scan blocks, and 134 rows and columns have spoken
   descriptions. One cell is hidden from switch users. Adaptive Palette has no scanning.
10. **Grid size.** Adaptive Palette works out a palette's size from its cells, so trailing empty rows and
    columns disappear. Grid 3 sets the size explicitly.
11. **Auto-replacements.** Grid 3 corrects 8 misspellings while typing. Adaptive Palette has no typing and no
    corrections.
