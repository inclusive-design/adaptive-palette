# Palette Generator Web-App

## How to Launch

The palette generator is one of the web applications within this
project that run on localhost.  It
is made available using the following command executed in the home directory:

```text
npm run serveAppsDemos
```

Once the development server is running, open this `localhost` url from within a
browser:
[`http://localhost:5173/apps/palette-generator/`](http://localhost:5173/apps/palette-generator/)

## How to Use

### Settings

The palette's settings are shown at the top of the page with the legend
"Settings".  Within this block, use the "Palette name:" text field to enter a
name for the palette.  The name can be any printable character including spaces.

The two number fields "Starting row" and "Starting column" allow you to specify
the top left corner of the palette.  The default values are row 1, column 1, and
they refer to the position of the first cell in the first row of the palette.

The "Type of cell" select allows you to specify or modify the kind of cells that
make up the palette.  Note that _all_ of the cells are set to this type; there
is no way to have a mixture of cell types.  A future version of the application
will address this limitation.

### Search for matches

The next section, "Search for matches" is a text area where each line of text
describes one row of palette cells.  Spaces are used for separate cells so the
text used to specify a cell cannot contain any spaces.

There are four types of input items allowed:

- a string that is a single word such as "heart" or "dog", or a string that
  matches part or all of a gloss entry, e.g., "indicator_".  As shown in this
  last example, the string can include an underscore character (\_),
- a single number that is the BCI AV ID of a specific Bliss symbol,
- the text "BLANK" will result in an empty blank cell,
- an svg-builder string as required by the [bliss-svg-builder](https://github.com/hlridge/bliss-svg-builder)
  that specifies component BCI AV IDs or Blissary IDs that the builder uses to
  create the SVG graphic.  More about the structure of this string is given below.

An svg-builder string is marked by "SVG:" at the beginning of the string and
":SVG" at the end. What lies between is a set of comma separated BCI AVI IDs or
Blissary IDs, and quoted strings that are parsed by the svg builder.  No spaces
are allowed within an SVG string.  Note that mixing BCI AV IDs and Blissary IDs
in the same SVG string is not supported.

Some examples of svg-builder strings:

```text
SVG:14905,"/",24883:SVG // "building" (14905) followed by "deletion" (24833) = "ruin"
SVG:13166,";",9011:SVG  // "child" (13166) with plural indicator above (9011) = "children"
SVG:13166;9011:SVG      // "child" (13166) with plural indicator above (9011) = "children"
SVG:B220;B99:SVG        // "child" (B220) with plural indicator above (B99) = "children"
```

A user defined label for a cell can be specified for a word, ID, or an
svg-builder string. User defined labels cannot be added to `BLANK` cells. The
label to display is given by immediately appending "LABEL:_label\_text_" to the
word, number, or svg-builder string. The _label\_text_ will be used as the label
for the cell instead of the usual gloss for the symbol. Note that this is the
only way to specify a cell's label for svg-builder strings.  The _label\_text_
cannot have any whitespace within it, since whitespace is used to indicate a new
cell in the palette.  If white space is needed, use an underscore.  Any
underscore characters in the _label\_text_ are replaced with a single space.
Some examples follow:

```text
clothLABEL:cross_hatches             // cell label is "cross hatches"
23641LABEL:ruin                      // cell label is "ruin"; official gloss is "ruin,wreck,wreckage\_(building)\_(1)
SVG:13166,";",9011:SVGLABEL:children // cell label is "children"
```

### Generate Palette

Clicking the "Generate palette" button will trigger the app to use the
individual words and numbers to search the Bliss gloss for matches.  In the case
of words, a match is defined as matching a single word within the gloss or
matching the entire gloss.  Since the same word can appear in multiple glosses,
multiple matches are a possible result.  Only the first match is used to
construct the cell, but all of the matches are reported in the lower part of the
page.

In the case of numbers, the gloss is searched for that unique BCI AV ID and that
single gloss entry is used to construct the cell.  If the number is invalid, an
error is reported.

If the cell description string is an svg-builder string, the gloss is not
consulted. This has the consequence that the cell will not have a label since
the svg-builder does not know what the label is.  Usually, however, if the user
knows the svg-builder string, they likely know the name of the symbol it
constructs, and can provide a label using the "LABEL:_label\_text_" technique.

For each match found, a cell is constructed and added to the appropriate row and
the entire palette is shown on screen.  It can be inspected for errors.
Corrections can be made in the glosses area and a new palette generated by
clicking the "Generate palette" button again.

### Save Palette

Clicking the "Save palette" button will export a palette definition JSON file
and save it to disk where the browser saves file downloads, typically the
"Downloads" folder.  The name of the file will be the palette's name with a
".json" extension.  For example, if the palette name is "People", then the file
created is "People.json".

### Clear Palette

Clicking the "Clear palette" button removes the preview of the palette, and the
matches and error listings.

### Matches and Errors

#### Matches

The "Matches" section is a list of all of the matches that were found for each
item in the "Search for matches" input text area.  Each item is listed
separately where the head of the listing is a copy of the input word.  The
matches for each word are a list of the BCI AVI IDs, their glosses, and their
full decomposition if the match is a Bliss-word composed from a sequence of
Bliss-characters.  For example, if the input word was "cloth", two gloss entries
are reported.  One is a symbol for cloth in the sense of fabric (BCI AV ID
13365), and the other is a symbol for "drying rack" (BCI AV ID 26161).  Its
composition is shown as '17445/23859/13365', the BCI AV IDs for the
Bliss-characters "structure,construction", "dryness,drought", and
"cloth,fabric,material,textile,net":

```text
cloth
    13365: cloth,fabric,material,textile,net
    26161: drying_rack_(cloth), '17445/23859/13365'
```

If the Bliss symbol drawn in the preview palette is incorrect, the matches can
be consulted to see if there is a better symbol.  If so, its BCI AV ID can be
input instead of the word initially used.

No matches are listed for BCI AV ID inputs, "BLANK" inputs, nor svg builder
strings.  Valid BCI AV ID will match a Bliss gloss entry exactly and only errors
are reported if the ID is invalid.  The gloss is not consulted for BLANK inputs
nor for svg builder strings.

#### Errors

The "Errors" section describe errors that arise from searching the gloss entries
or for invalid svg builder strings.
