# Developer Documentation

## How to render a palette

`Palette.ts` accepts a JSON in a structure demostrated in
`src/keyboards/bmw_palette.json`. In the `cells` object, each cell has a `type`
key and a `options` key. The `type` value indicates which component should be
used to render this cell. The `options` contains information to be passed to
the component.

When a new `type` value is introduced, a developer need to:

1. Create a new component to render the new cell type;
2. In `GlobalData.ts`, update `cellTypeRegistry` to add the entry that maps the
new type value to the actual component.
