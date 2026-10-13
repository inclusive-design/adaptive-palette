# Modifiers

A Bliss modifier changes the meaning of the symbol it is added to, for example "opposite of" or
"similar". A prefix modifier goes before the symbol; a suffix modifier goes after it.

## Choosing a Modifier

The "add modifier" button on the command bar opens the modifier palette. It is unavailable when
no symbol is at the caret. The palette lists every modifier in `public/data/modifiers.json` in
the file's order, 9 per row with no gaps and no group headings. Picking a modifier adds it to
the symbol at the caret, before or after the symbol as the entry's `position` says. The palette
stays open, so modifiers can be stacked; Back returns to the previous palette. "undo modifier",
next to "add modifier" on the command bar, removes the last modifier added.

An indicator added to a symbol with modifiers goes above the base symbol, not above a modifier.

The palette is `public/palette-sets/standardBlissChart/palettes/modifiers.json`. When a modifier
is added to or moved in `modifiers.json`, update the palette too;
`ModifiersPaletteConsistency.test.ts` fails until they agree. It also fails until a new prefix
modifier is listed in `modifierIds` in `src/client/utils/SvgUtils.ts`: a single symbol in one of
the id lists, a multi-symbol one in `multiSymbol`. `findClassifierFromLeft()` uses these lists
to place an indicator after the prefix modifiers.
