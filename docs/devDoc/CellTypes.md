# Cell Types

All registered cell types live in `cellTypeRegistry` in
[`src/client/core/CellTypeRegistry.ts`](../../src/client/core/CellTypeRegistry.ts). They fall into
three categories by prefix.

## `Action*` — user input actions

| Type | Purpose | Key options beyond layout |
| ---- | ------- | ------------------------- |
| `ActionCodeCell` | Appends a Bliss symbol to the encoding area when clicked | `label`, `composition` |
| `ActionBranchToPaletteCell` | Navigates to another palette | `label`, `composition`, `branchTo` (the palette's key in [`palette_file_map.json`](../../public/palettes/palette_file_map.json)) |
| `ActionIndicatorCell` | Applies a Bliss indicator to the last symbol in the encoding area | `label`, `composition` |
| `ActionPreModifierCell` | Prepends a modifier to the last symbol | `label`, `composition` |
| `ActionPostModifierCell` | Appends a modifier to the last symbol | `label`, `composition` |
| `ActionRemoveIndicatorCell` | Removes an indicator from the symbol at the caret | `label`, `composition` |
| `ActionRemoveModifierCell` | Removes a modifier from the symbol at the caret | `label`, `composition` |
| `ActionSpeakCell` | Speaks the message aloud and records it, which feeds word prediction | `label`, `composition`, `ariaControls` |
| `ActionAttributeCell` | Toggles one attribute on the message being composed; `aria-pressed` reflects whether it is set. See [Message Attributes](../MessageAttributes.md) | `label`, `category`, `composition` |

## `Command*` — palette navigation and editing

| Type | Purpose | Key options beyond layout |
| ---- | ------- | ------------------------- |
| `CommandClearEncoding` | Clears the entire encoding area | `label`, `composition`, `ariaControls` |
| `CommandClearSavedData` | Deletes everything the app has saved, after a confirmation dialog, then reloads the page | `label`, `composition` |
| `CommandCursorBackward` | Moves the caret one position left in the encoding area | `label`, `composition`, `ariaControls` |
| `CommandCursorForward` | Moves the caret one position right in the encoding area | `label`, `composition`, `ariaControls` |
| `CommandDelLastEncoding` | Deletes the last symbol in the encoding area | `label`, `composition`, `ariaControls` |
| `CommandGoBackCell` | Pops the navigation stack and returns to the previous palette | `label`, `composition` |
| `CommandGoToRootCell` | Empties the navigation stack and returns to the root palette | `label`, `composition` |
| `CommandMakeSentence` | Translates the telegraphic message into full sentences. Flagged `requiresModel` and `requiresConfig` in the palette JSON, so the palette leaves it out when the feature is unavailable | `label`, `composition`, `ariaControls` |

## `Content*` — display areas

| Type | Purpose | Key options beyond layout |
| ---- | ------- | ------------------------- |
| `ContentEncoding` | Displays the current encoding (the input area showing selected symbols) | layout fields only |
| `ContentLabel` | Text in a grid slot, with no interaction; `aria-hidden`, so use it only where the cells it heads already name themselves. See [Message Attributes](../MessageAttributes.md) | `label` |

## Adding a new cell type

When a new `type` value is introduced, developers need to:

1. Create a new component to render the new cell type;
2. In `src/client/core/CellTypeRegistry.ts`, update `cellTypeRegistry` to add the entry that maps the
new type value to the actual component.
