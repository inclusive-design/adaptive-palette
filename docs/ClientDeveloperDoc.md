# Client-side Developer Documentation

This document provides technical instructions for developers who use Preact to
build the adaptive palette client side.

## How to render a palette

`Palette.ts` constructs a palette based on a JSON file that contains a list
of the cells in the palette. An example is found in
[`src/keyboards/bmw_palette.json`](../src/keyboards/bmw_palette.json). The
`cells` object is the list of all of the cells. Each cell has a `type` key and
an `options` key. The `type` value indicates which Preact component should be
used to render this cell. The `options` contains information to be passed to the
component.

## How to add a new cell type

When a new `type` value is introduced, developers need to:

1. Create a new component to render the new cell type;
2. In `GlobalData.ts`, update `cellTypeRegistry` to add the entry that maps the
new type value to the actual component.
