# Access Methods

Adaptive Palette can be used with a keyboard, a mouse, touch, or two switches. Keyboard, mouse
and touch always work. Switch scanning is an option that is off until it is turned on.

## Keyboard

1. **Move.** Tab and Shift+Tab move focus through the controls on the page, top to bottom.
2. **Press.** Space or Enter presses the control with focus.
3. **Go back.** The backquote key (`` ` ``) goes back one palette. It can be turned off in
   Adjust Settings → General → "Go back with the backquote (`` ` ``) key".
4. **Input area.** With focus in the message being composed, the arrow keys, Home and End move
   the caret between symbols.
5. **Dialogs.** Tab stays inside an open dialog. Escape closes it.

The control with focus has a red border and a solid black ring. After moving to another palette,
focus goes to the new palette's first cell if it would otherwise be lost.

See [Shortcut Keys](ShortcutKeys.md) for every key.

## Mouse and touch

Click or tap any cell or button to press it. The control under the mouse has a dashed red outline,
so hovering and focus can be told apart. Palettes shrink to fit a tablet screen, and long labels
wrap rather than widen a row.

## Switches

Switch scanning lets someone use the palette with two switches: one moves a highlight, the other
selects what it is on. Row scanning is the only kind supported: the user picks a row first, then
a cell in it. Turn it on in **Adjust Settings** → General → "Use two-switch row scanning". The
public website keeps no settings, so there it can be turned on only in `public/config.json`.

### How scanning works

1. **Rows.** The highlight outlines one row of controls at a time, top to bottom: the top bar,
   the input area, sentence choices, word predictions, the command bar, then each row of the
   palette. Empty rows are skipped. After the last row it goes back to the first.
2. **Enter a row.** Select enters the outlined row. The first stop is the row itself, tagged
   "Exit row": select there goes back to choosing rows. A wrong row is left with one press.
3. **Pick a cell.** Move steps through the row's cells, then back to "Exit row". Select presses
   the highlighted cell.
4. **After a choice,** the highlight goes back to choosing rows, on the row just used, so the next
   symbol is a few presses away. If the palette changed, it starts at the new palette's first row.
5. **Dialogs.** While a dialog is open, the highlight steps through its buttons and checkboxes
   one at a time. Text and number fields, drop-down menus and links are skipped; a support person
   fills those in.
   When a dialog opened from another dialog closes, the highlight returns to the control that
   opened it.
6. **Scrolling.** The page, or the list inside a dialog, scrolls by itself to keep the highlight
   in view.

The highlight is yellow inside black: an outline around the whole row when choosing rows, a ring
on the cell inside a row.

### Switch keys

The switches must send key presses. The default keys are Space (move) and Enter (select). To
change them, edit `switchScanning` in `public/config.json`:

```json
"switchScanning": { "enabled": false, "moveKey": "Space", "selectKey": "Enter" }
```

The keys are
[`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values)
values, such as `Space`, `Enter`, `KeyA` or `F1`. If either key is missing, not shaped like a
code (such as `space` in lower case), or both are the same, both fall back to Space and Enter.
A misspelled code such as `Spcae` is not caught.

Avoid `Tab` and `Backquote`: Tab would stop moving keyboard focus, and Backquote would also go
back a palette.

### Not supported yet

Other scanning patterns (cell by cell, column first, or by block), automatic (timed) scanning, one
switch, spoken prompts for each stop, and switches that send mouse clicks.

## Using them together

All methods can be used at the same time, so a support person can help with a keyboard, mouse or
touch while the user scans with switches.

1. **Keyboard focus is left alone.** Scanning moves its own highlight, not keyboard focus. Tab
   still moves focus from wherever it was, and the scan highlight stays where it was. The page can
   show the focus ring and the scan highlight on different controls at once.
2. **One exception: text fields.** When a dialog opens with focus in a text field (such as symbol
   search), or a switch selection puts focus in one (such as adding a symbol from symbol search),
   focus is moved off the field. Otherwise the switch keys would type there instead of scanning.
3. **Typing still works.** A person who clicks or tabs into a text field types as usual, including
   the switch keys: they do not scan while focus is in a text or number field.
4. **The switch keys belong to scanning.** Elsewhere, the switch keys only scan. With the default
   keys, Space and Enter no longer press the control with focus, so a keyboard user presses it
   with the mouse or touch instead. To keep Space and Enter for the keyboard, set the switch keys to
   other keys.
5. **Mouse and touch are unchanged.** Clicking or tapping presses a control as usual. Scanning
   carries on from where its highlight was, or from the first row of the palette if the click
   moved to another palette.
6. **Held switches.** A switch held down moves one step, not many.
7. **Turned off,** scanning does not listen for keys at all, and the keyboard works exactly as
   described above.
