# Shortcut Keys

Keyboard shortcuts available in the Adaptive Palette interface.

## Global

| Key | Action |
| :--- | :--- |
| `` ` `` (backquote) | Go back one layer in the palette navigation |

Ignored when: a modal dialog is open, the navigation stack is empty, or focus is in a text-entry
control (`<input>` of a textual type, `<textarea>`, `<select>`, or any element with
`role="textbox"` other than the input area).

Implemented in [index.js:69](../src/client/index.js#L69).

## Input Area

Active when the input area (the message composition region, `role="textbox"`) has focus. Each
action is also announced via speech.

| Key | Action |
| :--- | :--- |
| `ArrowLeft`, `ArrowDown` | Move caret back one symbol |
| `ArrowRight`, `ArrowUp` | Move caret forward one symbol |
| `Home`, `Ctrl+A` | Move caret to the start |
| `End`, `Ctrl+E` | Move caret to the end |

On macOS, iOS, and iPadOS:

| Key | Action |
| :--- | :--- |
| `Cmd+ArrowLeft` | Move caret to the start |
| `Cmd+ArrowRight` | Move caret to the end |

The caret can sit before the first symbol, so moving back from the first position is a valid stop
rather than a no-op.

Implemented in [ContentEncoding.ts:99](../src/client/ContentEncoding.ts#L99).

## Modal Dialogs

| Key | Action |
| :--- | :--- |
| `Escape` | Close the dialog |
| `Tab`, `Shift+Tab` | Cycle focus within the dialog (focus trap) |

These come from the native `<dialog>` element's `showModal()` rather than custom handlers. See
[ModalDialog.ts](../src/client/ModalDialog.ts).
